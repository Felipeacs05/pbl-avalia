package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.AttendanceRequest;
import com.uefs.tfs.avaliasystem.dto.AttendanceResponse;
import com.uefs.tfs.avaliasystem.service.AttendanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sessions")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PutMapping("/{sessionId}/attendances/{studentId}")
    public ResponseEntity<AttendanceResponse> registerAttendance(
            @PathVariable UUID sessionId,
            @PathVariable UUID studentId,
            @RequestBody AttendanceRequest request,
            Principal principal) {

        // Extrai o ID do utilizador autenticado (Tutor) a partir do token JWT
        UUID requestingUserId = UUID.fromString(principal.getName());

        // Delega a lógica de negócio (e validação de posse) para o Service
        AttendanceResponse response = attendanceService.registerAttendance(
                sessionId,
                studentId,
                request,
                requestingUserId
        );

        // Retorna HTTP 200 OK com o JSON da presença registada
        return ResponseEntity.ok(response);
    }
}