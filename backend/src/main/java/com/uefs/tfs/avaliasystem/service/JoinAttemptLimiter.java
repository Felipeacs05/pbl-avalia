package com.uefs.tfs.avaliasystem.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class JoinAttemptLimiter {

    private record State(int failures, Instant blockedUntil) {}

    private final Clock clock;
    private final int maxFailures;
    private final Duration blockDuration;
    private final Map<String, State> attempts = new ConcurrentHashMap<>();

    public JoinAttemptLimiter(Clock clock, int maxFailures, Duration blockDuration) {
        this.clock = clock;
        this.maxFailures = maxFailures;
        this.blockDuration = blockDuration;
    }

    public boolean isBlocked(String ip) {
        State s = attempts.get(ip);
        if (s == null || s.blockedUntil() == null) return false;
        if (clock.instant().isBefore(s.blockedUntil())) return true;
        attempts.remove(ip, s);
        return false;
    }

    public void registerFailure(String ip) {
        Instant now = clock.instant();
        attempts.compute(ip, (k, s) -> {
            if (s != null && s.blockedUntil() != null && !now.isBefore(s.blockedUntil())) s = null;
            int failures = (s == null ? 0 : s.failures()) + 1;
            return new State(failures, failures >= maxFailures ? now.plus(blockDuration) : null);
        });
    }

    public void reset(String ip) {
        attempts.remove(ip);
    }
}