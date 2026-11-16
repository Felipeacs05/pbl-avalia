// Fixtures da US24 — Remoção de aluno da sala pelo tutor.
//
// Objetivo da US: o tutor remove um aluno da sala sem apagar notas, presenças e feedbacks (soft delete do vínculo).
// QA: 403 para quem não é o tutor da sala e integridade do histórico.
//
// O QUE JÁ EXISTE (develop): a remoção mora no carômetro da aba "Pessoas" (/teacher-rooms/{id}/disciplines?tab=people):
//   PhotoRosterList (container) -> usePhotoRoster -> photoRosterService -> authFetch
//   StudentCard (apresentação, botão "Remover ou desvincular {nome}")
// No backend, DELETE /api/v1/rooms/{roomId}/members/{studentId} (alias /students/) já faz o soft delete
// (RoomMember.active=false); os testes de backend da US24 (main) definem os status: 204, 403, 400, 401.
//
// CONTRATO que estes testes fixam (o que falta no código atual está marcado com [NOVO]):
//  1. SERVICE — photoRosterService.removeStudentFromRoom(roomId, studentId)
//     DELETE /api/v1/rooms/{roomId}/members|students/{studentId}, autenticado, uma única escrita (só o vínculo).
//     Sucesso (204): devolve a lista atualizada. Erro: rejeita com Error cuja message é para o usuário:
//       [NOVO] 403 -> mensagem em português dizendo que só o tutor remove (o backend manda texto em inglês)
//       [NOVO] 400 -> a mensagem do backend (ex.: "Aluno não encontrado na sala")
//  2. HOOK — usePhotoRoster(roomId)
//     [NOVO] removeStudent(id) resolve true/false; isRemoving; removeError separado do erro de carregamento.
//     A falha na remoção NÃO troca a lista pelo painel de erro de carregamento, e o aluno só sai da lista depois
//     que o backend confirma.
//  3. COMPONENTES
//     StudentCard: botão "Remover ou desvincular {nome}".
//     PhotoRosterList, conforme os critérios de aceite do PRD (testes Selenium do backend):
//       CA1 [NOVO] o modal avisa que o histórico será preservado e o acesso será revogado, antes de qualquer DELETE
//       CA2 confirmar remove o aluno da lista sem recarregar a página; [NOVO] feedback de sucesso (Toast role=status)
//       CA3 cancelar fecha o modal, mantém o aluno e não chama a API
//       [NOVO] falha mostra a mensagem (Toast role=alert) e mantém a lista; confirmar fica desabilitado durante o envio
//       [NOVO] o tutor (role TUTOR, que o GET /students também devolve) não tem botão de remoção (achado A3 do backend)
//
// COMBINAR COM O TIME:
//  - Há dois carômetros: PhotoRosterList (GET /rooms/{id}/students, usado na página) e ClassRosterPanel da US18
//    (GET /rooms/{id}/roster, sem uso em página). Estes testes seguem o que a página renderiza hoje.
//  - O Selenium do backend usa a rota /rooms/{id}/members e a porta 5173; a página real do tutor é a aba Pessoas.

export const ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
export const TUTOR = { id: "tutor-24", name: "Prof. Helena Duarte", avatarUrl: "", role: "TUTOR" };
export const ALICE = { id: "aluno-alice", name: "Alice Ramos", avatarUrl: "", role: "STUDENT" };
export const BRUNO = { id: "aluno-bruno", name: "Bruno Lima", avatarUrl: "", role: "STUDENT" };
export const STORED_TOKEN = "jwt-tutor-24";

export const ROOM = {
  id: ROOM_ID,
  name: "Circuitos Digitais",
  code: "CIR24A",
  joinLink: "app/join/CIR24A",
  semester: "2026.2",
};

// Rotas
export const STUDENTS_ROUTE = new RegExp(`/api/v1/rooms/${ROOM_ID}/students$`);
export const removeRoute = (studentId: string) =>
  new RegExp(`/api/v1/rooms/${ROOM_ID}/(members|students)/${studentId}$`);

// Textos do backend (GlobalExceptionHandler/RoomService)
export const BACKEND_FORBIDDEN_TEXT = "You do not have permission to perform this operation";
export const NOT_IN_ROOM_TEXT = "Aluno não encontrado na sala";

// Textos do front
export const FORBIDDEN_MESSAGE = /tutor/i;
export const REMOVED_MESSAGE = /removid/i;
export const HISTORY_PRESERVED_WARNING = /hist[óo]rico.*preservad/i;
export const ACCESS_REVOKED_WARNING = /acesso.*revogad/i;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// O card do aluno no carômetro é identificado pelo botão de remoção com o nome dele (StudentCard)
export const removeButtonName = (name: string) => new RegExp(`remover.*${escapeRegExp(name)}`, "i");

export function errorBody(status: number, message: string) {
  return { timestamp: "2026-11-13T10:00:00", status, error: status === 403 ? "Forbidden" : "Bad Request", message };
}

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export const noContent = () => new Response(null, { status: 204 });

// Erros que o service entrega ao hook
export const makeForbiddenError = () => new Error("Apenas o tutor da sala pode remover alunos.");
export const makeNotInRoomError = () => new Error(NOT_IN_ROOM_TEXT);
