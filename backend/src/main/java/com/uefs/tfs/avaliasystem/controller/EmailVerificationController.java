package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.EmailVerificationRequest;
import com.uefs.tfs.avaliasystem.dto.ResendEmailRequest;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailVerificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.mail.MessagingException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class EmailVerificationController {

    private static final String RESEND_RESPONSE =
            "Se o e-mail estiver cadastrado e ainda não verificado, você receberá um novo link de confirmação.";

    private final EmailVerificationService emailVerificationService;
    private final UserRepository userRepository;

    @Operation(summary = "Confirmar e-mail")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "E-mail verificado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Token ausente, inválido ou expirado")
    })
    @PostMapping("/email/verify")
    public ResponseEntity<Map<String, String>> verifyEmail(
            @Valid @RequestBody EmailVerificationRequest request
    ) {
        emailVerificationService.verify(request.token());
        return ResponseEntity.ok(Map.of("message", "E-mail verificado com sucesso."));
    }

    @Operation(summary = "Reenviar e-mail de verificação")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Solicitação recebida. A resposta não revela se o e-mail está cadastrado."),
            @ApiResponse(responseCode = "400", description = "E-mail ausente ou inválido")
    })
    @PostMapping("/email/resend")
    public ResponseEntity<Map<String, String>> resendEmailVerification(
            @Valid @RequestBody ResendEmailRequest request
    ) throws MessagingException {
        Optional<User> user = userRepository.findByEmail(request.email());

        if (user.isPresent()) {
            emailVerificationService.resendEmailVerification(user.get());
        }

        return ResponseEntity.ok(Map.of("message", RESEND_RESPONSE));
    }
}
