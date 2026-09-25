package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidCredentialsException;
import com.uefs.tfs.avaliasystem.exception.InvalidRegisterException;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private final JwtService jwtService;

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    @Autowired
    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this(userRepository, passwordEncoder, null);
    }

    @Override
    public User register(RegisterUserRequest request, MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            throw new InvalidRegisterException("Foto ausente.");
        }

        if (photo.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("arquivos acima de 5MB devem ser rejeitados antes de qualquer persistência");
        }

        if (photo.getContentType() != null) {
            String contentType = photo.getContentType().toLowerCase();
            if (!contentType.equals("image/jpeg") && !contentType.equals("image/jpg") && !contentType.equals("image/png")) {
                throw new IllegalArgumentException("arquivos que não sejam JPG, PNG ou JPEG devem ser rejeitados");
            }
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());
        
        // Simulação do salvamento da foto e geração de URL

        // TODO: CONFIGURAR SALVAMENTO DA FOTO
        String profilePictureUrl = "url-da-foto/fotosPerfil/foto.png";

        User user = new User(request.getName(), request.getEmail(), encodedPassword, profilePictureUrl);
        return userRepository.save(user);
    }

    /**
     * TODO (US02 — sprint de implementação): Buscar usuário pelo e-mail,
     * verificar senha com BCrypt, gerar token JWT assinado com expiração de 24 h
     * e retornar {@link LoginResponse}. Lançar
     * {@link com.uefs.tfs.avaliasystem.exception.InvalidCredentialsException}
     * com mensagem genérica em caso de falha (nunca revelar se o e-mail existe).
     */
    @Override
    public LoginResponse login(String email, String password) {
        //verifica o email
       User user = userRepository.findByEmail(email).
               orElseThrow(InvalidCredentialsException::new);
        //verifica a senha
       if(!passwordEncoder.matches(password, user.getPassword())) {
           throw new InvalidCredentialsException();
       }
       //agora sim começa o login
       String token = jwtService.generateToken(user.getId());
       long expiresAt = System.currentTimeMillis() + jwtService.getExpirationTime();

       return new LoginResponse(token, expiresAt);
    }

    /**
     * TODO (US02 — sprint de implementação): Buscar o usuário pelo ID,
     * consultar as salas onde ele é Tutor (criador) e as salas onde é Aluno
     * (inscrito via código) e retornar um {@link DashboardResponse} com as
     * duas listas separadas. Lançar
     * {@link com.uefs.tfs.avaliasystem.exception.UsuarioNaoEncontradoException}
     * se o ID não existir.
     */

}

