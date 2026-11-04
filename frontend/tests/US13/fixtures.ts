import type { SelfEvaluationSubmission } from "@/types/evaluation";
import type { Group, Student } from "@/types/group";
import { authMockSuccess } from "@/mocks/auth.mock";

// A tela /selfevaluation usa ids fixos do mock (não lê a rota)
export const PROBLEM_ID = "prob_1"; // liberado para autoavaliação no evaluationMock
export const CLOSED_PROBLEM_ID = "prob_2"; // nada liberado no evaluationMock
export const ROOM_ID = "1";

// Mesmos UUIDs de alunos usados nas US anteriores
export const STUDENT_ID = "999e9999-e99b-99d9-a999-999999999999";
export const OTHER_STUDENT_ID = "456e4567-e45b-45d4-a456-456745674567";
export const THIRD_STUDENT_ID = "181e1818-e18b-18d1-a181-181818181818";

// O aluno logado do mock de login: precisa sair da lista de colegas
export const LOGGED_STUDENT_ID = authMockSuccess.user!.id;
export const LOGGED_STUDENT_NAME = authMockSuccess.user!.name;

// Textos completos exibidos pela tela; nas asserções, as regex
export const CLOSED_TITLE_TEXT = "Período de autoavaliação encerrado/inativo";
export const CLOSED_TITLE_MESSAGE = /período de autoavaliação encerrado\/inativo/i;
export const NOT_RELEASED_TEXT = "A autoavaliação ainda não foi liberada pelo tutor.";
export const FORBIDDEN_TEXT =
    "Não foi possível enviar: a autoavaliação foi encerrada ou você não tem permissão para avaliar nesta sala.";
export const FORBIDDEN_MESSAGE = /não foi possível enviar: a autoavaliação foi encerrada/i;
export const GENERIC_ERROR_TEXT = "Não foi possível enviar sua autoavaliação agora. Tente novamente em instantes.";
export const GENERIC_ERROR_MESSAGE = /não foi possível enviar sua autoavaliação agora/i;
export const NO_PEERS_TEXT = "Nenhum colega no seu grupo para avaliar.";
export const SUCCESS_TOAST_TEXT = "Autoavaliação enviada com sucesso!";

export const MIN_SCORE = 0;
export const MAX_SCORE = 10;

// Os services/mocks da autoavaliação rejeitam no formato do axios: error.response.status
export const makeForbiddenError = () => Object.assign(new Error("Forbidden"), { response: { status: 403 } });
export const makeServerError = () => Object.assign(new Error("Internal Server Error"), { response: { status: 500 } });

export function makeStudent(overrides: Partial<Student> = {}): Student {
    return { id: STUDENT_ID, name: "Alice Souza", ...overrides };
}

export const makeOtherStudent = (): Student => makeStudent({ id: OTHER_STUDENT_ID, name: "Bruno Lima" });

export const makeThirdStudent = (): Student => makeStudent({ id: THIRD_STUDENT_ID, name: "Carla Dias" });

// Grupo como o back-end devolve: o aluno logado também é membro
export function makeGroup(members: Student[]): Group {
    return { id: "222e2222-e22b-22d2-a222-222222222222", name: "Grupo 1", members };
}

// Payload completo da autoavaliação: 3 critérios, justificativa e uma entrada por colega
export function makeSelfEvaluationSubmission(
    overrides: Partial<SelfEvaluationSubmission> = {},
): SelfEvaluationSubmission {
    return {
        scores: { content: 8, participation: 7, behavior: 9 },
        justification: "Participei ativamente das sessões",
        peers: [
            { studentId: STUDENT_ID, score: 8, comment: "Boa contribuição" },
            { studentId: OTHER_STUDENT_ID, score: 7, comment: "" },
        ],
        ...overrides,
    };
}