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
public interface RoomRepository extends JpaRepository<Room, String> {
    List<Room> findByTutorId(UUID TutorId);





    //seleciona toda a tabela de salas, junta c a tabela de sala_aluno(que guarda as conexões entre aluno e sala), juntando todos os ids da sala(o campo id da sala mesmo
    //ao id da sala referenciado na tabela sala_aluno( sala.id === sala_aluno.sala_id ) , depois, filtra selecionado todas as salas em que o id do aluno é igual ao Id enviado
    // anteriormente
    //nativeQuery pq nao tem a entity sala_aluno aq no sistema (nao sei se é necessário)
    @Query(
            value =
        """
            SELECT s.*
            FROM sala s
            JOIN sala_aluno sa ON sa.sala_id = s.id
            WHERE sa.aluno_id = :userId
        """,
            nativeQuery = true
    )
    List<Room> findRoomsByParticipantId(@Param("userId") UUID userId);


    boolean existsByAccessCode(String accessCode);

    Optional<Room> findByAccessCode(String accessCode);

    @Query("SELECT DISTINCT r FROM Room r " +
            "LEFT JOIN RoomMember rm ON rm.room = r " +
            "WHERE r.tutor.id = :userId OR (rm.user.id = :userId AND rm.active = true)")
    List<Room> findAllByTutorOrActiveMember(@Param("userId") java.util.UUID userId);
}
