package com.uefs.tfs.avaliasystem.US04;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JoinAttemptLimiterTest {

    private JoinAttemptLimiter limiter;
    private Clock clock;
    private Instant currentInstant;

    private static final String IP_ADDRESS = "192.168.0.1";
    private static final String ANOTHER_IP_ADDRESS = "10.0.0.5";
    private static final int MAX_FAILURES = 5;
    private static final Duration BLOCK_DURATION = Duration.ofMinutes(15);

    @BeforeEach
    void setUp() {
        // Inicializa o tempo num ponto fixo para podermos controlar o avanço
        currentInstant = Instant.parse("2026-09-28T12:00:00Z");

        // Mock do Clock para evitar o uso de Thread.sleep()
        clock = mock(Clock.class);
        when(clock.instant()).thenAnswer(invocation -> currentInstant);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));

        // Inicializa o limiter com 5 falhas permitidas e 15 minutos de bloqueio
        limiter = new JoinAttemptLimiter(clock, MAX_FAILURES, BLOCK_DURATION);
    }

    // Método auxiliar para avançar o relógio no tempo durante os testes
    private void advanceTime(Duration duration) {
        currentInstant = currentInstant.plus(duration);
    }

    @Test
    void shouldNotBlockIpAfterFourFailures() {
        // Regista 4 falhas seguidas
        for (int i = 0; i < 4; i++) {
            limiter.registerFailure(IP_ADDRESS);
        }

        // Verifica que o IP ainda não está bloqueado
        assertFalse(limiter.isBlocked(IP_ADDRESS), "O IP não deve ser bloqueado com apenas 4 falhas");
    }

    @Test
    void shouldBlockIpAfterFiveFailures() {
        // Regista 5 falhas seguidas
        for (int i = 0; i < 5; i++) {
            limiter.registerFailure(IP_ADDRESS);
        }

        // Verifica que o IP foi bloqueado na 5ª tentativa
        assertTrue(limiter.isBlocked(IP_ADDRESS), "O IP deve ser bloqueado ao atingir 5 falhas");
    }

    @Test
    void shouldUnblockAfterDurationExpires() {
        // Bloqueia o IP
        for (int i = 0; i < 5; i++) {
            limiter.registerFailure(IP_ADDRESS);
        }
        assertTrue(limiter.isBlocked(IP_ADDRESS));

        // Avança o tempo em 15 minutos e 1 segundo
        advanceTime(BLOCK_DURATION.plusSeconds(1));

        // Verifica se o bloqueio expirou
        assertFalse(limiter.isBlocked(IP_ADDRESS), "O bloqueio deve expirar após o tempo definido");
    }

    @Test
    void shouldRestartCounterAfterBlockExpires() {
        // Bloqueia o IP
        for (int i = 0; i < 5; i++) {
            limiter.registerFailure(IP_ADDRESS);
        }

        // Avança o tempo para expirar o bloqueio
        advanceTime(BLOCK_DURATION.plusSeconds(1));
        assertFalse(limiter.isBlocked(IP_ADDRESS));

        // Regista 4 novas falhas (não deve bloquear)
        for (int i = 0; i < 4; i++) {
            limiter.registerFailure(IP_ADDRESS);
        }
        assertFalse(limiter.isBlocked(IP_ADDRESS), "O contador deve recomeçar do zero após a expiração");

        // Regista a 5ª falha e verifica novo bloqueio
        limiter.registerFailure(IP_ADDRESS);
        assertTrue(limiter.isBlocked(IP_ADDRESS), "O IP deve ser bloqueado novamente ao atingir 5 falhas no novo ciclo");
    }

    @Test
    void shouldResetFailuresOnSuccess() {
        // Regista 4 falhas (quase a bloquear)
        for (int i = 0; i < 4; i++) {
            limiter.registerFailure(IP_ADDRESS);
        }

        // Simula um acesso com sucesso (zera as falhas)
        limiter.reset(IP_ADDRESS);

        // Regista mais 2 falhas (totalizaria 6 se não tivesse sido resetado)
        limiter.registerFailure(IP_ADDRESS);
        limiter.registerFailure(IP_ADDRESS);

        // Verifica que não está bloqueado
        assertFalse(limiter.isBlocked(IP_ADDRESS), "Um sucesso deve zerar a contagem de falhas do IP");
    }

    @Test
    void shouldTrackIpsIndependently() {
        // Regista 5 falhas para o primeiro IP (Bloqueia)
        for (int i = 0; i < 5; i++) {
            limiter.registerFailure(IP_ADDRESS);
        }

        // Regista 2 falhas para o segundo IP
        limiter.registerFailure(ANOTHER_IP_ADDRESS);
        limiter.registerFailure(ANOTHER_IP_ADDRESS);

        // Verifica que o estado de um não afeta o outro
        assertTrue(limiter.isBlocked(IP_ADDRESS), "O primeiro IP deve estar bloqueado");
        assertFalse(limiter.isBlocked(ANOTHER_IP_ADDRESS), "O bloqueio de um IP não deve afetar os restantes");
    }
}