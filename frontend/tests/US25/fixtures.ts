// Fixtures da US25 — Saída voluntária do aluno da sala.
//
// Objetivo da US: o próprio estudante sai da sala tutorial; o vínculo é desativado (soft delete), as notas,
// presenças e feedbacks dele continuam no banco e o tutor responsável é notificado.
// QA: depois da saída, o aluno perde na hora o acesso às rotas internas da sala.
//
// O QUE JÁ EXISTE (develop): a página src/app/student-rooms/[id]/page.tsx tem dois botões "Sair da Sala"
// (layout mobile e desktop), mas eles só fazem router.push("/student-rooms"): não há chamada à API nem confirmação.
// No backend (testes da US25 na main): POST /api/v1/rooms/{roomId}/leave, autenticado; o aluno é o do token
// (usuário enviado no corpo é ignorado). Status: 204, 400 (tutor saindo da própria sala), 404 (não vinculado),
// 409 (já saiu), 401 (sem token) e 500 se a notificação falhar (rollback: o vínculo continua ativo).
//
// TDD: estes testes são escritos antes do código e fixam o contrato abaixo, camada por camada.
//
//  1. SERVICE (HTTP) — src/services/roomService.ts
//     roomService.leaveRoom(roomId) -> POST /api/v1/rooms/{roomId}/leave pelo authFetch (Bearer + caminho relativo,
//     que o Next reescreve para o backend), SEM corpo e sem id de usuário. Uma única requisição.
//     Sucesso (204, sem corpo): resolve undefined.
//     Erro: rejeita com { status, message } (padrão da US21/US22/US23; status 0 = sem resposta do servidor):
//       400/404/409 -> a mensagem do backend; resposta sem corpo ou sem JSON -> mensagem padrão não vazia.
//
//  2. HOOK (estado + navegação) — src/hooks/useLeaveRoom.ts
//     useLeaveRoom(roomId) -> { leaveRoom(): Promise<boolean>, isLeaving, error }
//     - Sucesso: resolve true e sai IMEDIATAMENTE das rotas da sala com router.replace(STUDENT_ROOMS_ROUTE)
//       (replace, e não push: o "Voltar" do navegador não pode devolver o aluno à sala que ele deixou).
//     - 404/409: o aluno já não tem vínculo; o resultado é o mesmo da saída: resolve true e faz o mesmo replace.
//     - 400 (tutor), 500 (rollback) e rede: resolve false, expõe a mensagem e fica na sala.
//     - 401: sessão encerrada (o authFetch não trata 401 sozinho): remove "token" e "user" e leva ao login ("/").
//     - Nunca propaga a rejeição; ignora um segundo pedido enquanto o primeiro está em andamento.
//
//  3. COMPONENTE (UI) — src/components/features/rooms-student/LeaveRoomModal.tsx
//     <LeaveRoomModal roomName onConfirm onClose isLeaving? error? />  (apresentação: sem hook nem service)
//     Diálogo (role dialog ou alertdialog) que, ANTES de qualquer requisição, avisa que:
//       os dados do aluno (notas/histórico) serão mantidos, ele perderá o acesso à sala e o tutor será notificado.
//     Botões "Cancelar" e "Sair da sala". Durante o envio o botão de confirmar fica desabilitado; o erro
//     aparece com role=alert e o modal continua aberto.
//
//  4. PÁGINAS (integração) — src/app/student-rooms/[id]/page.tsx e src/app/student-rooms/page.tsx
//     - Todo botão "Sair da Sala" da página (hoje um no layout mobile e outro no desktop, ambos no DOM do jsdom)
//       abre o LeaveRoomModal, em vez de navegar; a saída só acontece ao confirmar, pelo useLeaveRoom.
//     - BLOQUEIO PÓS-SAÍDA: a página da sala (e as rotas internas /student-rooms/{id}/**, como a do problema, que
//       o E2E cobre) só mostra o conteúdo a quem tem a sala em GET /api/v1/rooms
//       (a lista de salas ativas do aluno, que a página já carrega pelo useRooms). Sem a sala na lista, faz
//       router.replace(STUDENT_ROOMS_ROUTE) e não oferece ações da sala. O GET /rooms/{id} do backend não exige
//       vínculo, por isso não serve de prova de acesso.
//     - A lista de salas do aluno (student-rooms/page) deixa de mostrar a sala, pois vem do backend.
//
// COMBINAR COM O TIME:
//  - Tratar 404/409 como "já fora da sala" (redireciona) em vez de manter o aluno numa sala que ele não acessa mais.
//  - Em teste (IS_TEST), o useDisciplines lê os problemas do gradeMock, não da API: a integração não consegue
//    provar que a LISTA DE PROBLEMAS some após a saída; ela prova o redirecionamento e a ausência das ações da sala.
//    O bloqueio das rotas internas pelo backend real (problemas, sessões) fica para o E2E.
//  - Hoje GET /api/v1/rooms/{id} não tem @PreAuthorize: qualquer usuário logado lê a sala. Vale avaliar no backend.
//  - O roomService.joinRoom rejeita com { response: { status, data } }; a US25 segue o formato { status, message }
//    das USs mais recentes. Se o time preferir unificar, troque aqui e nos testes de service/hook.
//
// COMBINAR COM O BACK-END (achados usados pelo E2E, tests/US25/e2e):
//  - GET /api/v1/rooms/{roomId}/problems não verifica vínculo: depois da saída, o aluno ainda lista os problemas
//    pela API. O E2E exige 403 (como já acontece em /members, que usa isRoomMemberOrOwner) e falha até isso mudar.
//  - O E2eSecurityConfig autentica pelo X-User-Id; POST /rooms/{id}/leave precisa resolver o aluno pelo Principal
//    (e não por Jwt) para funcionar no perfil e2e, como as demais rotas do RoomController.
//  - Não há endpoint de notificações na develop: o E2E não consegue conferir a notificação ao tutor, que fica
//    coberta pelos testes de backend da US25 (RoomLeaveServiceTest).

export const ROOM_ID = "a25e0001-e21b-12d3-a456-426614174025";
export const STUDENT = { id: "aluno-25", name: "Carla Mendes", email: "carla@uefs.br" };
export const STORED_TOKEN = "jwt-aluno-25";

export const ROOM = {
  id: ROOM_ID,
  name: "Engenharia de Software",
  code: "ENG25A",
  joinLink: "app/join/ENG25A",
  semester: "2026.2",
  tutor: "Prof. Ricardo Alves",
};

// Outra sala ativa do mesmo aluno: não pode ser afetada pela saída
export const OTHER_ROOM = {
  id: "a25e0002-e21b-12d3-a456-426614174026",
  name: "Banco de Dados",
  code: "BDA25B",
  joinLink: "app/join/BDA25B",
  semester: "2026.2",
  tutor: "Profa. Lúcia Prado",
};

// Rotas
export const MY_ROOMS_ROUTE = /\/api\/v1\/rooms$/;
export const LEAVE_ROUTE = new RegExp(`/api/v1/rooms/${ROOM_ID}/leave$`);
export const STUDENT_ROOMS_ROUTE = "/student-rooms";
export const LOGIN_PAGE = "/";

// Textos do backend (RoomService.leaveRoom / GlobalExceptionHandler); o front repassa exatamente o que recebe
export const TUTOR_CANNOT_LEAVE_TEXT = "Tutor não pode sair da própria sala";
export const NOT_A_MEMBER_TEXT = "O aluno não pertence à sala informada";
export const ALREADY_LEFT_TEXT = "O aluno já saiu desta sala";

// Textos do front
export const DATA_KEPT_WARNING =
  /(dados|hist[óo]rico|notas)[\s\S]*(mantid|preservad)|(mantid|preservad)[\s\S]*(dados|hist[óo]rico|notas)/i;
export const ACCESS_LOST_WARNING = /perder[áa]? (o )?acesso|acesso[^.]*(revogad|removid|encerrad|bloquead)/i;
export const TUTOR_NOTIFIED_WARNING = /tutor[^.]*(notificad|avisad|informad)|(notificad|avisad|informad)[^.]*tutor/i;
export const CONFIRM_BUTTON = /^sair( da sala)?$/i;
export const CANCEL_BUTTON = /cancelar/i;

export function errorBody(status: number, message: string) {
  const error = { 400: "Bad Request", 401: "Unauthorized", 404: "Not Found", 409: "Conflict" }[status] ?? "Error";
  return { timestamp: "2026-11-16T10:00:00", status, error, message };
}

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export const noContent = () => new Response(null, { status: 204 });

// Contrato de erro do service (o que o hook recebe): { status, message }
export const makeTutorError = () => ({ status: 400, message: TUTOR_CANNOT_LEAVE_TEXT });
export const makeNotMemberError = () => ({ status: 404, message: NOT_A_MEMBER_TEXT });
export const makeAlreadyLeftError = () => ({ status: 409, message: ALREADY_LEFT_TEXT });
export const makeServerError = () => ({ status: 500, message: "Não foi possível sair da sala. Tente novamente." });
export const makeUnauthorizedError = () => ({ status: 401, message: "Sua sessão expirou. Entre novamente." });
export const makeNetworkError = () => ({ status: 0, message: "Sem conexão com o servidor. Tente novamente." });

export function storeSession() {
  localStorage.setItem("token", STORED_TOKEN);
  localStorage.setItem("user", JSON.stringify(STUDENT));
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
