package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidCredentialsException;
import com.uefs.tfs.avaliasystem.exception.InvalidRegisterException;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private final JwtService jwtService;
    private final Path uploadDir;

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png"
    );

    @Autowired
    public UserServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${app.storage.upload-dir:uploads/fotosPerfil}") String uploadDir
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this(userRepository, passwordEncoder, jwtService, "uploads/fotosPerfil");
    }

    //pra um teste funcionar
    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this(userRepository, passwordEncoder, null, "uploads/fotosPerfil");
    }

    @Override
    public User register(RegisterUserRequest request, MultipartFile photo) {

        String profilePictureUrl = null;

        if (photo != null && !photo.isEmpty()) {
            if (photo.getSize() > MAX_FILE_SIZE) {
                throw new IllegalArgumentException("arquivos acima de 5MB devem ser rejeitados antes de qualquer persistência");
            }

            String contentType = photo.getContentType() != null
                    ? photo.getContentType().toLowerCase()
                    : "";

            if (photo.getContentType() != null) {
                if (!contentType.equals("image/jpeg") && !contentType.equals("image/jpg") && !contentType.equals("image/png")) {
                    throw new IllegalArgumentException("arquivos que não sejam JPG, PNG ou JPEG devem ser rejeitados");
                }
            }

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

            if (RequestContextHolder.getRequestAttributes() != null) {
                profilePictureUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                        .path("/fotosPerfil/")
                        .path(filename)
                        .toUriString();
            } else {
                profilePictureUrl = "/fotosPerfil/" + filename;
            }
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());

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
     * {@link com.uefs.tfs.avaliasystem.exception.UserNotFoundException}
     * se o ID não existir.
     */

}
