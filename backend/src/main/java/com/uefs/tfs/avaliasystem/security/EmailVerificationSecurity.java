package com.uefs.tfs.avaliasystem.security;

import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component("emailVerificationSecurity")
@RequiredArgsConstructor
public class EmailVerificationSecurity {

    private final UserRepository userRepository;

    public boolean isEmailVerified(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        Optional<User> userOptional = userRepository.findById(userId);

        if (userOptional.isEmpty()) {
            return false;
        }
        System.out.println("ASDAADDSA USUARIO VERIFICADO:" + userOptional.get().getEmail());

        System.out.println("ASDAADDSA USUARIO VERIFICADO:" + userOptional.get().isEmailVerified());
        return userOptional.get().isEmailVerified();

    }
}
