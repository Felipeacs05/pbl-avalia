package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.LoginRequest;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.dto.PasswordRecoveryRequest;
import com.uefs.tfs.avaliasystem.dto.PasswordResetRequest;
import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.dto.UserResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidRegisterException;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.service.PasswordResetService;
import com.uefs.tfs.avaliasystem.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import jakarta.mail.MessagingException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Map;

@RestController
@AllArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserService userService;
    private final PasswordResetService passwordResetService;

    private static final String PASSWORD_RECOVERY_RESPONSE =
            "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.";

    @Operation(summary = "Solicitar redefinição de senha")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Solicitação recebida. A resposta não revela se o e-mail está cadastrado."),
            @ApiResponse(responseCode = "400", description = "E-mail ausente ou inválido")
    })
    @PostMapping(
            value = "/password/recover",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<Map<String, String>> requestPasswordReset(
            @Valid @RequestBody PasswordRecoveryRequest request
    ) throws MessagingException {
        passwordResetService.requestPasswordReset(request.email());
        return ResponseEntity.ok(Map.of("message", PASSWORD_RECOVERY_RESPONSE));
    }

    @Operation(summary = "Redefinir senha")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Senha redefinida com sucesso"),
            @ApiResponse(responseCode = "400", description = "Token inválido, expirado ou dados ausentes")
    })
    @PostMapping(
            value = "/password/reset",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody PasswordResetRequest request
    ) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(Map.of("message", "Senha redefinida com sucesso."));
    }

    @PostMapping(
            value = "/register",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<UserResponse> register(
            @Valid @RequestPart("data") RegisterUserRequest request,
            @RequestPart(value = "photo", required = false) MultipartFile photo
    ) {

        if (request.getName() != null
                && (request.getName().contains("<")
                || request.getName().contains(">"))) {
            throw new InvalidRegisterException();
        }

        User user = userService.register(request, photo);
        UserResponse response = UserResponse.fromUser(user);

        URI location = ServletUriComponentsBuilder
                .fromCurrentContextPath()
                .path("/api/v1/users/{id}")
                .buildAndExpand(user.getId())
                .toUri();

        return ResponseEntity.created(location).body(response);
    }

    @PostMapping(
            value = "/login",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest request
    ) {
        LoginResponse response = userService.login(
                request.getEmail(),
                request.getPassword()
        );

        return ResponseEntity.ok(response);
    }
}
