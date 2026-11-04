import type { DraftScores } from "@/components/features/evaluations/PeerEvaluationCard";
import { authMockSuccess } from "@/mocks/auth.mock";
import type { PeerEvaluationScores, PeerEvaluationSubmission } from "@/types/evaluation";
import type { Group, Student as GroupStudent } from "@/types/group";
import type { Student } from "@/types/student";

// UUIDs fixos, no mesmo padrão das demais US
export const PEER_ID = "141e1414-e14b-14d4-a141-141414141414";
export const OTHER_PEER_ID = "242e2424-e24b-24d4-a242-242424242424";
export const GROUP_ID = "343e3434-e34b-34d4-a343-343434343434";

// Problemas do mock de liberação: prob_3 = pares liberada; prob_1 = só autoavaliação; prob_2 = nada
export const OPEN_PROBLEM_ID = "prob_3";
export const SELF_ONLY_PROBLEM_ID = "prob_1";
export const CLOSED_PROBLEM_ID = "prob_2";

// Aluno logado da tela (mesmo usuário do mock de login usado pela página de autoavaliação)
export const LOGGED_STUDENT: GroupStudent = {
    id: authMockSuccess.user?.id ?? "usr_01",
    name: authMockSuccess.user?.name ?? "Marlus Rios",
};

// Critérios do Figma, na ordem em que aparecem
export const CRITERIA_KEYS = ["content", "participation", "behavior"] as const;
export const CRITERIA_LABELS = ["Conteúdo/Produto", "Participação", "Comportamento"] as const;

// Textos completos usados pelo front; nas asserções, as regex
export const FILL_ALL_HINT = "Preencha todas as notas para enviar.";
export const SUCCESS_TOAST = "Avaliações enviadas com sucesso!";
export const CLOSED_TEXT =
    "Não foi possível enviar: a avaliação foi encerrada ou você não tem permissão para avaliar estes colegas.";
export const CLOSED_MESSAGE = /a avaliação foi encerrada ou você não tem permissão para avaliar estes colegas/i;
export const GENERIC_ERROR_MESSAGE = /não foi possível enviar suas avaliações agora/i;
export const INACTIVE_TITLE = /período de avaliação entre pares encerrado\/inativo/i;
export const NO_PEERS_MESSAGE = /nenhum colega no seu grupo para avaliar/i;
export const NOT_RELEASED_HINT = /a avaliação entre pares ainda não foi liberada pelo tutor/i;

// Erro no formato do axios (error.response.status), o mesmo que o mock e o modal usam
export const makeForbiddenError = () => Object.assign(new Error("Forbidden"), { response: { status: 403 } });
export const makeServerError = () => Object.assign(new Error("Server error"), { response: { status: 500 } });

export function makePeer(overrides: Partial<Student> = {}): Student {
    return {
        id: PEER_ID,
        name: "Alice Ferreira",
        avatarUrl: "https://img.uefs.br/alice.png",
        ...overrides,
    };
}

const PEER_NAMES = ["Alice Ferreira", "Bruno Lima", "Camila Rocha", "Davi Oliveira", "Eduarda Souza"];

// n colegas com ids distintos e nomes únicos
export function makePeers(n: number): Student[] {
    return Array.from({ length: n }, (_, i) =>
        makePeer({
            id: `00000000-0000-4000-a014-${String(i + 1).padStart(12, "0")}`,
            name: PEER_NAMES[i] ?? `Colega ${i + 1}`,
            avatarUrl: `https://img.uefs.br/colega${i + 1}.png`,
        }),
    );
}

// Rascunho como o card recebe: sem nota = null
export function makeDraftScores(overrides: Partial<DraftScores> = {}): DraftScores {
    return { content: null, participation: null, behavior: null, ...overrides };
}

export function makeCompleteScores(content = 8, participation = 9, behavior = 7): PeerEvaluationScores {
    return { content, participation, behavior };
}

export function makeSubmission(peers: Student[] = makePeers(2)): PeerEvaluationSubmission {
    return {
        evaluations: peers.map((peer) => ({
            studentId: peer.id,
            scores: makeCompleteScores(),
            comment: "Boa participação",
        })),
    };
}

export function makeGroup(members: GroupStudent[], overrides: Partial<Group> = {}): Group {
    return { id: GROUP_ID, name: "Grupo 1", members, ...overrides };
}