package com.uefs.tfs.avaliasystem.service;

import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitingService {

    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final Duration BLOCK_DURATION = Duration.ofMinutes(15);

    private record State(int failures, Instant blockedUntil) {}

    private final Clock clock;
    private final Map<String, State> attempts = new ConcurrentHashMap<>();

    public RateLimitingService(Clock clock) {
        this.clock = clock;
    }

    public boolean isIpBlocked(String ip) {
        State s = attempts.get(ip);
        if (s == null || s.blockedUntil() == null) return false;
        if (clock.instant().isBefore(s.blockedUntil())) return true;
        attempts.remove(ip, s); // bloqueio expirou: contador recomeça do zero
        return false;
    }

    public void registerFailedAttempt(String ip) {
        Instant now = clock.instant();
        attempts.compute(ip, (k, s) -> {
            if (s != null && s.blockedUntil() != null && !now.isBefore(s.blockedUntil())) {
                s = null; // bloqueio antigo expirado
            }
            int failures = (s == null ? 0 : s.failures()) + 1;
            Instant until = failures >= MAX_FAILED_ATTEMPTS ? now.plus(BLOCK_DURATION) : null;
            return new State(failures, until);
        });
    }

    public void resetFailedAttempts(String ip) {
        attempts.remove(ip);
    }
}