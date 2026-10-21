package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.AttendanceRequest;
import com.uefs.tfs.avaliasystem.dto.AttendanceResponse;
import com.uefs.tfs.avaliasystem.model.Attendance;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AttendanceRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

@Service
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final TutoringSessionRepository tutoringSessionRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             TutoringSessionRepository tutoringSessionRepository,
                             UserRepository userRepository,
                             Clock clock) {
        this.attendanceRepository = attendanceRepository;
        this.tutoringSessionRepository = tutoringSessionRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    @Transactional
    public AttendanceResponse registerAttendance(UUID sessionId, UUID studentId, AttendanceRequest request, UUID requestingUserId) {
        // 1. Busca a sessão e valida a posse da sala pelo tutor responsável
        TutoringSession session = tutoringSessionRepository.findById(sessionId)
                .orElseThrow(() -> new NoSuchElementException("Sessão não encontrada."));

        validateTutorOwnership(session, requestingUserId);


        Optional<Attendance> existingOpt = attendanceRepository.findBySessionIdAndStudentId(sessionId, studentId);

        Attendance attendance;

        if (existingOpt.isPresent()) {
            attendance = existingOpt.get();

            // Se o status for idêntico, mantém o registo e timestamp originais (idempotência / timeout protection)
            if (attendance.getStatus() == request.getStatus()) {
                return mapToResponse(attendance);
            }

            // Se o status mudou, atualiza o status e renova o timestamp com o horário atual
            attendance.setStatus(request.getStatus());
            attendance.setRecordedAt(clock.instant());
        } else {
            // 3. Criação de um novo registo de presença
            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> new NoSuchElementException("Aluno não encontrado."));

            attendance = new Attendance();
            attendance.setSession(session);
            attendance.setStudent(student);
            attendance.setStatus(request.getStatus());
            attendance.setRecordedAt(clock.instant());
        }

        // 4. Salva no banco de dados e retorna o DTO
        Attendance savedAttendance = attendanceRepository.save(attendance);
        return mapToResponse(savedAttendance);
    }

    /**
     * Valida a hierarquia: Sessão -> Problema -> Sala -> Tutor Responsável
     */
    private void validateTutorOwnership(TutoringSession session, UUID requestingUserId) {
        if (session.getProblem() == null ||
                session.getProblem().getRoom() == null ||
                session.getProblem().getRoom().getTutor() == null ||
                !session.getProblem().getRoom().getTutor().getId().equals(requestingUserId)) {

            throw new SecurityException("Apenas o tutor responsável pela sala pode registrar a chamada.");
        }
    }

    /**
     * Mapeia a entidade para o DTO de resposta
     */
    private AttendanceResponse mapToResponse(Attendance attendance) {
        return new AttendanceResponse(
                attendance.getId(),
                attendance.getSession().getId(),
                attendance.getStudent().getId(),
                attendance.getStudent().getName(),
                attendance.getStatus(),
                attendance.getRecordedAt()
        );
    }
}