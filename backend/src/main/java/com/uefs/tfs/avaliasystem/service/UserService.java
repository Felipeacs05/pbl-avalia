package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.model.User;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {
    User register(RegisterUserRequest request, MultipartFile photo);

    /**
     * Authenticates the user and returns a signed JWT token with a 24-hour expiration.
     */
    LoginResponse login(String email, String password);

    /**
     * Returns the user dashboard with rooms where the user is Tutor and Student.
     */
    DashboardResponse getDashboard(Long userId);

    default DashboardResponse obterDashboard(Long usuarioId) {
        return getDashboard(usuarioId);
    }
}