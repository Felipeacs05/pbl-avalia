package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.model.User;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {
    User register(RegisterUserRequest request, MultipartFile photo);

    /**
     * Autentica o usuário e retorna um token JWT com prazo de 24 h.
     * Lança {@link com.uefs.tfs.avaliasystem.exception.InvalidCredentialsException}
     * com mensagem genérica caso o e-mail ou senha sejam inválidos.
     */
    LoginResponse login(String email, String password);


}
