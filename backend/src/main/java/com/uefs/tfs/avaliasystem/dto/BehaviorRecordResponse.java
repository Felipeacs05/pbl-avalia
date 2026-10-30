package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.BehaviorRecord;
import com.uefs.tfs.avaliasystem.model.BehaviorTag;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BehaviorRecordResponse {
    private UUID id;
    private UUID sessionId;
    private UUID studentId;
    private String studentName;
    private UUID tagId;
    private String tagName;
    private String text;
    private Instant recordedAt;


    public static BehaviorRecordResponse from(BehaviorRecord record) {
        BehaviorTag tag = record.getTag();

        return new BehaviorRecordResponse(
                record.getId(),
                record.getSession().getId(),
                record.getStudent().getId(),
                record.getStudent().getName(),
                tag != null ? tag.getId() : null,
                tag != null ? tag.getName() : null,
                record.getText(),
                record.getRecordedAt()
        );
    }
}
