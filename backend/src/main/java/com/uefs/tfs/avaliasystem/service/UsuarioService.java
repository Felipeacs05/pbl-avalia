package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.CadastroUsuarioRequest;
import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.model.Usuario;
import org.springframework.web.multipart.MultipartFile;

public interface UsuarioService {
    Usuario cadastrar(CadastroUsuarioRequest request, MultipartFile foto);

    /**
     * Autentica o usuário e retorna um token JWT com prazo de 24 h.
     * Lança {@link com.uefs.tfs.avaliasystem.exception.CredenciaisInvalidasException}
     * com mensagem genérica caso o e-mail ou senha sejam inválidos.
     */
    LoginResponse login(String email, String senha);

    /**
     * Retorna o dashboard do usuário com duas listas separadas:
     * salas onde ele é Tutor e salas onde ele é Aluno.
     * Lança {@link com.uefs.tfs.avaliasystem.exception.UsuarioNaoEncontradoException}
     * caso o ID não corresponda a nenhum usuário cadastrado.
     */
    DashboardResponse obterDashboard(Long usuarioId);
}
