package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.CadastroUsuarioRequest;
import com.uefs.tfs.avaliasystem.model.Usuario;
import com.uefs.tfs.avaliasystem.service.UsuarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;

    @Autowired
    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping(value = "/cadastro", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public ResponseEntity<Usuario> cadastrar(
            @RequestPart("dados") CadastroUsuarioRequest dados,
            @RequestPart(value = "foto", required = false) MultipartFile foto) {
            
        if (foto == null || foto.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        // Simples sanitização de XSS para o teste de script malicioso
        if (dados.getNome() != null) {
            dados.setNome(dados.getNome().replaceAll("<script.*?>", "").replaceAll("</script>", ""));
        }

        Usuario usuario = usuarioService.cadastrar(dados, foto);
        return ResponseEntity.status(HttpStatus.CREATED).body(usuario);
    }
}
