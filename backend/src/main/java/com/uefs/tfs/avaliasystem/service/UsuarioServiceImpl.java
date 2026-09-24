package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.CadastroUsuarioRequest;
import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.model.Usuario;
import com.uefs.tfs.avaliasystem.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UsuarioServiceImpl implements UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    public UsuarioServiceImpl(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Usuario cadastrar(CadastroUsuarioRequest request, MultipartFile foto) {
        if (foto != null && foto.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("arquivos acima de 5MB devem ser rejeitados antes de qualquer persistência");
        }

        if (foto != null && foto.getContentType() != null) {
            String contentType = foto.getContentType().toLowerCase();
            if (!contentType.equals("image/jpeg") && !contentType.equals("image/jpg") && !contentType.equals("image/png")) {
                throw new IllegalArgumentException("arquivos que não sejam JPG ou PNG devem ser rejeitados");
            }
        }

        String senhaCriptografada = passwordEncoder.encode(request.getSenha());
        
        // Simulação do salvamento da foto e geração de URL
        String fotoUrl = "url-da-foto";

        Usuario usuario = new Usuario(request.getNome(), request.getEmail(), senhaCriptografada, fotoUrl);
        return usuarioRepository.save(usuario);
    }

    /**
     * TODO (US02 — sprint de implementação): Buscar usuário pelo e-mail,
     * verificar senha com BCrypt, gerar token JWT assinado com expiração de 24 h
     * e retornar {@link LoginResponse}. Lançar
     * {@link com.uefs.tfs.avaliasystem.exception.CredenciaisInvalidasException}
     * com mensagem genérica em caso de falha (nunca revelar se o e-mail existe).
     */
    @Override
    public LoginResponse login(String email, String senha) {
        throw new UnsupportedOperationException("login ainda não implementado — aguardando US02");
    }

    /**
     * TODO (US02 — sprint de implementação): Buscar o usuário pelo ID,
     * consultar as salas onde ele é Tutor (criador) e as salas onde é Aluno
     * (inscrito via código) e retornar um {@link DashboardResponse} com as
     * duas listas separadas. Lançar
     * {@link com.uefs.tfs.avaliasystem.exception.UsuarioNaoEncontradoException}
     * se o ID não existir.
     */
    @Override
    public DashboardResponse obterDashboard(Long usuarioId) {
        throw new UnsupportedOperationException("obterDashboard ainda não implementado — aguardando US02");
    }
}

