package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;



@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {
    List<Room> findByTutorId(UUID TutorId);





    //seleciona toda a tabela de salas, junta c a tabela de sala_aluno(que guarda as conexões entre aluno e sala), juntando todos os ids da sala(o campo id da sala mesmo
    //ao id da sala referenciado na tabela sala_aluno( sala.id === sala_aluno.sala_id ) , depois, filtra selecionado todas as salas em que o id do aluno é igual ao Id enviado
    // anteriormente
    //nativeQuery pq nao tem a entity sala_aluno aq no sistema (nao sei se é necessário)
    @Query(
            value = """
        SELECT r.*
        FROM room r
        JOIN room_student rs ON rs.room_id = r.id
        WHERE rs.student_id = :userId
    """,
            nativeQuery = true
    )
    List<Room> findRoomsByParticipantId(@Param("userId") UUID userId);


    boolean existsByAccessCode(String accessCode);


    boolean existsByIdAndTutorId(UUID roomId, UUID tutorId);


    Optional<Room> findByAccessCode(String accessCode);

    @Query("SELECT DISTINCT r FROM Room r " +
            "LEFT JOIN RoomMember rm ON rm.room = r " +
            "WHERE r.tutor.id = :userId OR (rm.user.id = :userId AND rm.active = true)")
    List<Room> findAllByTutorOrActiveMember(@Param("userId") java.util.UUID userId);


    @Query("""
    SELECT CASE WHEN COUNT(DISTINCT r) > 0 THEN true ELSE false END
    FROM Room r
    LEFT JOIN RoomMember rm ON rm.room = r
    WHERE r.id = :roomId
      AND (
          r.tutor.id = :userId
          OR (rm.user.id = :userId AND rm.active = true)
      )
""")
    boolean existsByIdAndTutorOrActiveMember(
            @Param("roomId") UUID roomId,
            @Param("userId") UUID userId
    );
}
