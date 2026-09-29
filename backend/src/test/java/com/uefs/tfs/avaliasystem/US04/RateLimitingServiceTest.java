package com.uefs.tfs.avaliasystem.US04;

import com.uefs.tfs.avaliasystem.service.RateLimitingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * US04 — lógica REAL do rate limiting (sem mocks do próprio serviço).
 * Premissa: RateLimitingService(Clock), MAX_FAILED_ATTEMPTS (5) e BLOCK_DURATION públicos/estáticos.
 */
@DisplayName("US04 - RateLimitingService")
class RateLimitingServiceTest {

    private static final String IP_A = "192.168.1.1";
    private static final String IP_B = "192.168.1.2";

    private MutableClock clock;
    private RateLimitingService service;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-01-01T10:00:00Z"));
        service = new RateLimitingService(clock);
    }

    private void failTimes(String ip, int times) {
        for (int i = 0; i < times; i++) service.registerFailedAttempt(ip);
    }

    @Test
    void shouldNotBlockIpWithFourFailedAttempts() {
        failTimes(IP_A, RateLimitingService.MAX_FAILED_ATTEMPTS - 1);
        assertFalse(service.isIpBlocked(IP_A));
    }

    @Test
    void limitShouldBeExactlyFive() {
        assertTrue(RateLimitingService.MAX_FAILED_ATTEMPTS == 5, "Regra de negócio: 5 tentativas falhas");
    }

    @Test
    void shouldBlockIpAfterFiveConsecutiveFailedAttempts() {
        failTimes(IP_A, RateLimitingService.MAX_FAILED_ATTEMPTS);
        assertTrue(service.isIpBlocked(IP_A));
    }

    @Test
    void shouldResetCounterAfterSuccessfulAttempt() {
        failTimes(IP_A, 4);
        service.resetFailedAttempts(IP_A);
        failTimes(IP_A, 4);
        assertFalse(service.isIpBlocked(IP_A), "4 + reset + 4 não são 5 seguidas");
    }

    @Test
    void shouldUnblockIpAfterBlockDurationExpires() {
        failTimes(IP_A, RateLimitingService.MAX_FAILED_ATTEMPTS);
        assertTrue(service.isIpBlocked(IP_A));

        clock.advance(RateLimitingService.BLOCK_DURATION.plusSeconds(1));

        assertFalse(service.isIpBlocked(IP_A));
    }

    @Test
    void shouldStillBeBlockedBeforeBlockDurationExpires() {
        failTimes(IP_A, RateLimitingService.MAX_FAILED_ATTEMPTS);
        clock.advance(RateLimitingService.BLOCK_DURATION.minusSeconds(1));
        assertTrue(service.isIpBlocked(IP_A));
    }

    @Test
    @DisplayName("Após o bloqueio expirar o contador recomeça do zero (4 falhas novas não bloqueiam)")
    void counterShouldRestartAfterBlockExpires() {
        failTimes(IP_A, RateLimitingService.MAX_FAILED_ATTEMPTS);
        clock.advance(RateLimitingService.BLOCK_DURATION.plusSeconds(1));

        failTimes(IP_A, 4);

        assertFalse(service.isIpBlocked(IP_A));
    }

    @Test
    void shouldNotAffectOtherIpsWhenOneIpIsBlocked() {
        failTimes(IP_A, RateLimitingService.MAX_FAILED_ATTEMPTS);
        assertTrue(service.isIpBlocked(IP_A));
        assertFalse(service.isIpBlocked(IP_B));
    }

    @Test
    void unknownIpShouldNotBeBlocked() {
        assertFalse(service.isIpBlocked("10.10.10.10"));
    }

    @Test
    @DisplayName("Tentativas simultâneas (ataque paralelo) também bloqueiam: contador é thread-safe")
    void parallelFailuresShouldStillBlock() throws Exception {
        int threads = 20;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.registerFailedAttempt(IP_A);
                } catch (InterruptedException ignored) {
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS));
        pool.shutdownNow();

        assertTrue(service.isIpBlocked(IP_A));
    }

    private static class MutableClock extends Clock {
        private volatile Instant now;
        MutableClock(Instant start) { this.now = start; }
        void advance(Duration d) { now = now.plus(d); }
        @Override public ZoneId getZone() { return ZoneId.of("UTC"); }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
