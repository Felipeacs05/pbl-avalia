package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record FeedbackBatchDTO(
        @NotEmpty(message = "A lista de feedbacks não pode estar vazia")
        @Valid
        List<FeedbackRequest> feedbacks
) {}