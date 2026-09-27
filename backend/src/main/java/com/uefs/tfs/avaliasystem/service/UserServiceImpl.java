package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png"
    );

    @Override
    public User register(RegisterUserRequest request, MultipartFile photo) {
        if (photo != null) {
            if (photo.getSize() > MAX_FILE_SIZE) {
                throw new IllegalArgumentException("arquivos acima de 5MB devem ser rejeitados antes de qualquer persistência");
            }

            String contentType = photo.getContentType();
            if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
                throw new IllegalArgumentException("arquivos que não sejam JPG ou PNG devem ser rejeitados");
            }
        }

        String rawPassword = request.getPassword() != null ? request.getPassword() : request.getSenha();
        String encryptedPassword = rawPassword != null ? passwordEncoder.encode(rawPassword) : null;

        // Simulação do salvamento da foto e geração de URL
        String photoUrl = "url-da-foto";

        String name = request.getName() != null ? request.getName() : request.getNome();
        String email = request.getEmail();

        User user = new User(name, email, encryptedPassword, photoUrl);
        return userRepository.save(user);
    }

    @Override
    public LoginResponse login(String email, String password) {
        throw new UnsupportedOperationException("login ainda não implementado — aguardando US02");
    }

    @Override
    public DashboardResponse getDashboard(Long userId) {
        throw new UnsupportedOperationException("getDashboard ainda não implementado — aguardando US02");
    }
}