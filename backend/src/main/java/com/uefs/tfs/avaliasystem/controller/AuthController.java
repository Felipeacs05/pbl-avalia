package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.dto.UserResponse;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/v1/auth")
@AllArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping(value = "/register", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public ResponseEntity<UserResponse> register(
            @Valid @RequestPart("dados") RegisterUserRequest request,
            @RequestPart(value = "foto", required = true) MultipartFile photo) {

        if (photo.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        User user = userService.register(request, photo);
        UserResponse response = UserResponse.fromUser(user);

        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/v1/users/{id}")
                .buildAndExpand(user.getId())
                .toUri();

        return ResponseEntity.created(location).body(response);
    }
}