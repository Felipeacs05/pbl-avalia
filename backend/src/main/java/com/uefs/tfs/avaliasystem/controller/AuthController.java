package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.LoginRequest;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.dto.UserResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidRegisterException;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping(
            value = "/v1/auth/register",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<UserResponse> register(
            @Valid @RequestPart("dados") RegisterUserRequest request,
            @RequestPart(value = "foto", required = false) MultipartFile photo
    ) {package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.LoginRequest;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.dto.UserResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidRegisterException;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

        @RestController
        @AllArgsConstructor
        public class AuthController {

            private final UserService userService;

            @PostMapping(
                    value = "/v1/auth/register",
                    consumes = MediaType.MULTIPART_FORM_DATA_VALUE
            )
            public ResponseEntity<UserResponse> register(
                    @Valid @RequestPart("dados") RegisterUserRequest request,
                    @RequestPart(value = "foto", required = true) MultipartFile photo
            ) {
                if (photo.isEmpty()) {
                    return ResponseEntity.badRequest().build();
                }

                if (request.getName() != null
                        && (request.getName().contains("<")
                        || request.getName().contains(">"))) {
                    throw new InvalidRegisterException();
                }

                User user = userService.register(request, photo);
                UserResponse response = UserResponse.fromUser(user);

                URI location = ServletUriComponentsBuilder
                        .fromCurrentContextPath()
                        .path("/v1/users/{id}")
                        .buildAndExpand(user.getId())
                        .toUri();

                return ResponseEntity.created(location).body(response);
            }

            @PostMapping(
                    value = "/api/auth/login",
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
        if (photo == null || photo.isEmpty()) {
            throw new InvalidRegisterException();
        }

        if (request.getName() != null
                && (request.getName().contains("<")
                || request.getName().contains(">"))) {
            throw new InvalidRegisterException();
        }

        User user = userService.register(request, photo);
        UserResponse response = UserResponse.fromUser(user);

        URI location = ServletUriComponentsBuilder
                .fromCurrentContextPath()
                .path("/v1/users/{id}")
                .buildAndExpand(user.getId())
                .toUri();

        return ResponseEntity.created(location).body(response);
    }

    @PostMapping(
            value = "/api/auth/login",
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