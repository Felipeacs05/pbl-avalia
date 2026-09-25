package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.dto.RegisterUserResponse;
import com.uefs.tfs.avaliasystem.dto.LoginRequest;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidRegisterException;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping(value = "/v1/auth/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RegisterUserResponse> register(
            @RequestPart("dados") RegisterUserRequest data,
            @RequestPart(value = "foto", required = false) MultipartFile photo) {

        if (photo == null || photo.isEmpty()) {
            throw new InvalidRegisterException();
        }

        if (data.getName() != null && (data.getName().contains("<") || data.getName().contains(">"))) {
            throw new InvalidRegisterException();
        }

        User user = userService.register(data, photo);
        return ResponseEntity.status(HttpStatus.CREATED).body(RegisterUserResponse.from(user));
    }


    @PostMapping(
            value = "/api/auth/login",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest dados
    ) {
        LoginResponse response = userService.login(
                dados.getEmail(),
                dados.getPassword()
        );

        return ResponseEntity.ok(response);
    }
}
