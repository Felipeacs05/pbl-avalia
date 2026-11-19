package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.ChangePasswordRequest;
import com.uefs.tfs.avaliasystem.dto.UpdateProfileRequest;
import com.uefs.tfs.avaliasystem.dto.UserResponse;
import com.uefs.tfs.avaliasystem.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users/me")
public class UserProfileController {

    private final UserProfileService userProfileService;

    @PutMapping(value = "/profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> updateProfile(
            @Valid @RequestPart("data") UpdateProfileRequest request,
            @RequestPart(value = "photo", required = false) MultipartFile photo,
            Principal principal
    ) {
        UUID userId = UUID.fromString(principal.getName());
        UserResponse response = userProfileService.updateProfile(userId, request, photo);
        return ResponseEntity.ok(response);
    }

    @PutMapping(value = "/password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Principal principal
    ) {
        UUID userId = UUID.fromString(principal.getName());
        userProfileService.changePassword(userId, request);
        return ResponseEntity.ok(Map.of("message", "Senha alterada com sucesso."));
    }
}
