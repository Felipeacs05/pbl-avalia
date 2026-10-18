package com.uefs.tfs.avaliasystem.US13;

import com.uefs.tfs.avaliasystem.controller.SelfAssessmentController;
import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.service.SelfAssessmentService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testes de limite (boundary values) da nota da autoavaliação (US13).
 *
 * Regra: a nota deve estar no intervalo fechado [0, 10].
 *
 * Camada 1 - Validação do DTO (Bean Validation direto):
 *   falha com score < 0 ou score > 10 e a mensagem de erro deve ser a esperada.
 * Camada 2 - Controller isolado (Mockito):
 *   notas inválidas retornam 400 e o serviço NUNCA é chamado.
 */
class SelfAssessmentValidationTest {

    // Mensagens definidas no AssessmentRequest
    private static final String SCORE_RANGE_MESSAGE = "Score must be between 0 and 10";
    private static final String SCORE_NULL_MESSAGE = "Score cannot be null";
    private static final String COMMENT_BLANK_MESSAGE = "Comment cannot be blank";

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void tearDownValidator() {
        validatorFactory.close();
    }

    private Set<ConstraintViolation<AssessmentRequest>> validate(Double score, String comment) {
        return validator.validate(new AssessmentRequest(null, score, comment));
    }

    @Nested
    @DisplayName("[US13] Validação do DTO - limites da nota")
    class DtoBoundaryValidation {

        @ParameterizedTest(name = "[US13] nota {0} abaixo de 0 deve falhar")
        @ValueSource(doubles = {-0.01, -1.0, -5.0, -100.0})
        @DisplayName("[US13] nota menor que 0 deve ser rejeitada com a mensagem de intervalo")
        void validate_ScoreBelowZero_FailsWithRangeMessage(double score) {
            // Quando a nota está abaixo do limite inferior
            Set<ConstraintViolation<AssessmentRequest>> violations = validate(score, "Comentário válido");

            // Então há exatamente uma violação no campo score, com a mensagem esperada
            assertThat(violations)
                    .as("A nota %s (< 0) deveria gerar exatamente uma violação", score)
                    .hasSize(1);
            ConstraintViolation<AssessmentRequest> violation = violations.iterator().next();
            assertThat(violation.getPropertyPath().toString())
                    .as("A violação deveria ocorrer no campo score")
                    .isEqualTo("score");
            assertThat(violation.getMessage())
                    .as("A mensagem de erro para nota abaixo de 0 não condiz com o esperado")
                    .isEqualTo(SCORE_RANGE_MESSAGE);
        }

        @ParameterizedTest(name = "[US13] nota {0} acima de 10 deve falhar")
        @ValueSource(doubles = {10.01, 11.0, 15.0, 1000.0})
        @DisplayName("[US13] nota maior que 10 deve ser rejeitada com a mensagem de intervalo")
        void validate_ScoreAboveTen_FailsWithRangeMessage(double score) {
            // Quando a nota está acima do limite superior
            Set<ConstraintViolation<AssessmentRequest>> violations = validate(score, "Comentário válido");

            // Então há exatamente uma violação no campo score, com a mensagem esperada
            assertThat(violations)
                    .as("A nota %s (> 10) deveria gerar exatamente uma violação", score)
                    .hasSize(1);
            ConstraintViolation<AssessmentRequest> violation = violations.iterator().next();
            assertThat(violation.getPropertyPath().toString())
                    .as("A violação deveria ocorrer no campo score")
                    .isEqualTo("score");
            assertThat(violation.getMessage())
                    .as("A mensagem de erro para nota acima de 10 não condiz com o esperado")
                    .isEqualTo(SCORE_RANGE_MESSAGE);
        }

        @ParameterizedTest(name = "[US13] nota {0} dentro do intervalo deve passar")
        @ValueSource(doubles = {0.0, 0.01, 5.0, 9.99, 10.0})
        @DisplayName("[US13] notas nos limites exatos e dentro do intervalo devem ser aceitas")
        void validate_ScoreWithinRange_HasNoViolations(double score) {
            // Quando a nota está dentro do intervalo fechado [0, 10]
            Set<ConstraintViolation<AssessmentRequest>> violations = validate(score, "Comentário válido");

            // Então não há violações
            assertThat(violations)
                    .as("A nota %s está dentro de [0, 10] e não deveria gerar violações", score)
                    .isEmpty();
        }

        @Test
        @DisplayName("[US13] nota nula deve falhar com a mensagem de nota obrigatória")
        void validate_NullScore_FailsWithNullMessage() {
            // Quando a nota é nula
            Set<ConstraintViolation<AssessmentRequest>> violations = validate(null, "Comentário válido");

            // Então a violação aponta para score com a mensagem de obrigatoriedade
            assertThat(violations).as("Nota nula deveria gerar uma violação").hasSize(1);
            assertThat(violations.iterator().next().getMessage())
                    .as("A mensagem para nota nula não condiz com o esperado")
                    .isEqualTo(SCORE_NULL_MESSAGE);
        }

        @Test
        @DisplayName("[US13] nota inválida e comentário em branco devem acumular as duas violações")
        void validate_InvalidScoreAndBlankComment_ReportsBothViolations() {
            // Quando ambos os campos são inválidos
            Set<ConstraintViolation<AssessmentRequest>> violations = validate(11.0, "   ");

            // Então as duas mensagens esperadas são reportadas
            assertThat(violations)
                    .extracting(ConstraintViolation::getMessage)
                    .as("Deveriam ser reportadas as mensagens de nota fora do intervalo e de comentário em branco")
                    .containsExactlyInAnyOrder(SCORE_RANGE_MESSAGE, COMMENT_BLANK_MESSAGE);
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("[US13] Controller isolado - limites da nota nunca chegam ao serviço")
    class ControllerBoundaryWithMockito {

        @Mock
        private SelfAssessmentService service;

        @InjectMocks
        private SelfAssessmentController controller;

        private MockMvc mockMvc;
        private final UUID problemId = UUID.randomUUID();
        private final UUID studentId = UUID.randomUUID();

        private void buildMockMvc() {
            mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        }

        private String payload(double score) {
            return """
                    {"score": %s, "comment": "Comentário válido"}
                    """.formatted(score);
        }

        @ParameterizedTest(name = "[US13] nota inválida {0} retorna 400 e não chama o serviço")
        @ValueSource(doubles = {-0.01, -5.0, 10.01, 11.0})
        @DisplayName("[US13] notas fora do intervalo retornam 400 e o serviço nunca é chamado")
        void submit_ScoreOutOfRange_Returns400AndNeverCallsService(double score) throws Exception {
            buildMockMvc();

            // Quando é enviada uma nota fora do intervalo [0, 10]
            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problemId)
                            .principal(studentId::toString)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload(score)))
                    // Então a validação barra com 400
                    .andExpect(status().isBadRequest());

            // E o serviço jamais é acionado
            verify(service, never()).submitSelfAssessment(any(), any(), any());
        }

        @ParameterizedTest(name = "[US13] nota limite {0} retorna 201 e chama o serviço")
        @ValueSource(doubles = {0.0, 10.0})
        @DisplayName("[US13] notas nos limites exatos 0 e 10 são aceitas e chegam ao serviço")
        void submit_ExactBoundaryScore_Returns201AndCallsService(double score) throws Exception {
            buildMockMvc();

            // Quando é enviada uma nota exatamente no limite
            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problemId)
                            .principal(studentId::toString)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload(score)))
                    // Então a API aceita
                    .andExpect(status().isCreated());

            // E o serviço é chamado exatamente uma vez com os ids corretos
            verify(service, times(1)).submitSelfAssessment(eq(problemId), eq(studentId), any());
        }
    }
}