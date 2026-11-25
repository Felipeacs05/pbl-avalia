package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.ChangePasswordRequest;
import com.uefs.tfs.avaliasystem.dto.UpdateProfileRequest;
import com.uefs.tfs.avaliasystem.dto.UserResponse;
import com.uefs.tfs.avaliasystem.exception.UserNotFoundException;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class UserProfileService {

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Path uploadDir;

    @Autowired
    public UserProfileService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.storage.upload-dir:uploads/fotosPerfil}") String uploadDir
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request, MultipartFile photo) {
        if (request == null || request.name() == null || request.name().isBlank()) {
            throw new IllegalArgumentException("O nome é obrigatório.");
        }
        if (request.name().contains("<") || request.name().contains(">")) {
            throw new IllegalArgumentException("O nome contém caracteres inválidos.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Usuário não encontrado."));

        if (photo != null && !photo.isEmpty()) {
            if (photo.getSize() > MAX_FILE_SIZE) {
                throw new IllegalArgumentException("O arquivo excede o limite máximo de 5MB.");
            }

            String contentType = photo.getContentType() != null
                    ? photo.getContentType().toLowerCase()
                    : "";

            if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
                throw new IllegalArgumentException("Formato inválido. Apenas arquivos JPG, PNG ou JPEG são permitidos.");
            }

            deleteOldPhotoIfPresent(user.getProfilePictureUrl());

            String extension = "image/png".equals(contentType) ? ".png" : ".jpg";
            String filename = UUID.randomUUID() + extension;

            try {
                Files.createDirectories(this.uploadDir);
                Path targetPath = this.uploadDir.resolve(filename).normalize();
                try (InputStream inputStream = photo.getInputStream()) {
                    Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
                }
            } catch (IOException e) {
                throw new IllegalStateException("Falha ao armazenar a foto de perfil no storage", e);
            }

            user.setProfilePictureUrl("/fotosPerfil/" + filename);
        }

        user.setName(request.name().trim());
        User saved = userRepository.save(user);
        return UserResponse.fromUser(saved);
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("Usuário não encontrado."));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Senha atual incorreta.");
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new IllegalArgumentException("A nova senha deve ser diferente da senha atual.");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
    }

    private void deleteOldPhotoIfPresent(String existingUrl) {
        if (existingUrl == null || !existingUrl.contains("/fotosPerfil/")) {
            return;
        }
        String oldFilename = existingUrl.substring(existingUrl.lastIndexOf("/") + 1);
        if (oldFilename.isBlank()) {
            return;
        }
        try {
            Path oldFilePath = this.uploadDir.resolve(oldFilename).normalize();
            if (oldFilePath.startsWith(this.uploadDir)) {
                Files.deleteIfExists(oldFilePath);
            }
        } catch (IOException ignored) {
            // Falha ao deletar arquivo órfão antigo não deve impedir a atualização
        }
    }
}
