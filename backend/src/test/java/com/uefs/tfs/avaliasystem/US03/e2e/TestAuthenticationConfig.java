package com.uefs.tfs.avaliasystem.US03.e2e;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.Principal;

@TestConfiguration
public class TestAuthenticationConfig {

    @Bean
    OncePerRequestFilter testPrincipalFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain chain) throws ServletException, IOException {
                String userId = request.getHeader("X-User-Id");
                if (userId == null || userId.isBlank()) {
                    chain.doFilter(request, response);
                    return;
                }
                Principal principal = () -> userId;
                chain.doFilter(new HttpServletRequestWrapper(request) {
                    @Override
                    public Principal getUserPrincipal() {
                        return principal;
                    }
                }, response);
            }
        };
    }
}
