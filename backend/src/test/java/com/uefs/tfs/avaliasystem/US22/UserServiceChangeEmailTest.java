package com.uefs.tfs.avaliasystem.US22;

import com.uefs.tfs.avaliasystem.exception.ResourceConflictException;
import com.uefs.tfs.avaliasystem.exception.UserNotFoundException;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailVerificationService;
import com.uefs.tfs.avaliasystem.service.JwtService;
import com.uefs.tfs.avaliasystem.service.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("[US22] Alteração de e-mail de conta não verificada")
class UserServiceChangeEmailTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private EmailVerificationService emailVerificationService;

    private UserServiceImpl userService;

    private User unverifiedUser;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository, passwordEncoder, jwtService, emailVerificationService);

        unverifiedUser = new User();
        unverifiedUser.setId(UUID.randomUUID());
        unverifiedUser.setName("Ana Silva");
        unverifiedUser.setEmail("email.errado@uefs.br");
        unverifiedUser.setPassword("hash");
        unverifiedUser.setTokenVersion(1);
        unverifiedUser.setEmailVerified(false);
    }

    @Test
    @DisplayName("Conta não verificada troca o e-mail e NÃO dispara e-mail de verificação")
    void changeEmail_UnverifiedAccount_UpdatesEmailAndDoesNotSendVerificationEmail() {
        when(userRepository.findById(unverifiedUser.getId())).thenReturn(Optional.of(unverifiedUser));
        when(userRepository.existsByEmailIgnoreCase("email.certo@uefs.br")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = userService.changeEmail(unverifiedUser.getId(), "Email.Certo@UEFS.br");

        assertEquals("email.certo@uefs.br", response.getEmail(), "O e-mail deve ser normalizado");
        assertFalse(unverifiedUser.isEmailVerified(), "A conta continua não verificada");
        verify(userRepository).save(unverifiedUser);
        verifyNoInteractions(emailVerificationService);
    }

    @Test
    @DisplayName("Conta já verificada não pode trocar o e-mail e nada é persistido")
    void changeEmail_VerifiedAccount_ThrowsConflictAndDoesNotPersist() {
        unverifiedUser.setEmailVerified(true);
        when(userRepository.findById(unverifiedUser.getId())).thenReturn(Optional.of(unverifiedUser));

        assertThrows(ResourceConflictException.class,
                () -> userService.changeEmail(unverifiedUser.getId(), "outro@uefs.br"));

        verify(userRepository, never()).save(any(User.class));
        verifyNoInteractions(emailVerificationService);
    }

    @Test
    @DisplayName("Conta inexistente lança UserNotFoundException")
    void changeEmail_UnknownAccount_ThrowsUserNotFound() {
        UUID unknownId = UUID.randomUUID();
        when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class,
                () -> userService.changeEmail(unknownId, "outro@uefs.br"));
    }

    @Test
    @DisplayName("E-mail já usado por outra conta lança ResourceConflictException")
    void changeEmail_EmailAlreadyInUse_ThrowsConflict() {
        when(userRepository.findById(unverifiedUser.getId())).thenReturn(Optional.of(unverifiedUser));
        when(userRepository.existsByEmailIgnoreCase("ocupado@uefs.br")).thenReturn(true);

        assertThrows(ResourceConflictException.class,
                () -> userService.changeEmail(unverifiedUser.getId(), "ocupado@uefs.br"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Trocar para o mesmo e-mail não é tratado como conflito")
    void changeEmail_SameEmail_IsAllowed() {
        when(userRepository.findById(unverifiedUser.getId())).thenReturn(Optional.of(unverifiedUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = userService.changeEmail(unverifiedUser.getId(), "email.errado@uefs.br");

        assertEquals("email.errado@uefs.br", response.getEmail());
        verify(userRepository, never()).existsByEmailIgnoreCase(any());
    }
}
