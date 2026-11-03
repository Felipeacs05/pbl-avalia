package com.uefs.tfs.avaliasystem.security;

import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

public class UserTokenVersionValidator implements OAuth2TokenValidator<Jwt> {

    private final UserRepository userRepository;

    public UserTokenVersionValidator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Number tokenVersion = jwt.getClaim("tokenVersion");
        UUID userId = UUID.fromString(jwt.getSubject());

        boolean versionMatches = userRepository.findById(userId)
                .map(User::getTokenVersion)
                .filter(currentVersion -> tokenVersion != null && currentVersion == tokenVersion.intValue())
                .isPresent();
        return versionMatches
                ? OAuth2TokenValidatorResult.success()
                : invalidToken("O token JWT foi revogado.");
    }

    private OAuth2TokenValidatorResult invalidToken(String description) {
        return OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_token", description, null)
        );
    }
}
