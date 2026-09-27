package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;


/*
CREATE TABLE IF NOT EXISTS sala_aluno (
    sala_id BIGINT NOT NULL,
    aluno_id UUID NOT NULL,
    inscrito_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sala_id, aluno_id),
    CONSTRAINT fk_sala_aluno_sala FOREIGN KEY (sala_id) REFERENCES sala(id) ON DELETE CASCADE,
    CONSTRAINT fk_sala_aluno_aluno FOREIGN KEY (aluno_id) REFERENCES usuario(id) ON DELETE CASCADE
);
*/
@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
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
}
