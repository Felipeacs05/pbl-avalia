package com.uefs.tfs.avaliasystem.US03.e2e;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.Principal;

@TestConfiguration
public class TestAuthenticationConfig {

    @Bean
    public FilterRegistrationBean<OncePerRequestFilter> testAuthenticationFilterRegistration() {
        OncePerRequestFilter filter = new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain chain) throws ServletException, IOException {
                String userId = request.getHeader("X-User-Id");

                if (userId != null && !userId.isBlank()) {
                    Principal principal = () -> userId;
                    HttpServletRequestWrapper wrappedRequest = new HttpServletRequestWrapper(request) {
                        @Override
                        public Principal getUserPrincipal() {
                            return principal;
                        }

                        @Override
                        public String getRemoteUser() {
                            return userId;
                        }
                    };
                    chain.doFilter(wrappedRequest, response);
                } else {
                    chain.doFilter(request, response);
                }
            }
        };

        FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.addUrlPatterns("/*");
        return registration;
    }
}