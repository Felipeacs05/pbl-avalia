import type { Room } from "@/types/room";

// Identificadores fixos para testes da US03
export const ROOM_ID = "room-uuid-01";
export const OTHER_ROOM_ID = "room-uuid-02";
export const TUTOR_ID = "tutor-uuid-01";

// Limites de tamanho de caracteres para validação do nome da sala (3 a 100 caracteres)
export const EMPTY_NAME = "";
export const WHITESPACE_NAME = "   ";
export const NAME_2_CHARS = "AB";
export const NAME_3_CHARS = "ABC";
export const NAME_50_CHARS = "A".repeat(50);
export const NAME_51_CHARS = "A".repeat(51);
export const NAME_100_CHARS = "A".repeat(100);
export const NAME_101_CHARS = "A".repeat(101);

// Aliases semânticos usados no teste de integração (fakeBackend)
export const NAME_AT_MIN = NAME_3_CHARS;   // limite inferior válido
export const NAME_AT_MAX = NAME_100_CHARS; // limite superior válido
export const NAME_TOO_SHORT = NAME_2_CHARS;
export const NAME_TOO_LONG = NAME_101_CHARS;

// Nome genérico de nova sala usado em vários testes
export const NEW_ROOM_NAME = "Compiladores";

export const UNTRIMMED_NAME = "  Engenharia de Software  ";
export const TRIMMED_NAME = "Engenharia de Software";

// Mensagens literais e expressões regulares
export const NAME_LENGTH_ERROR_TEXT = "O nome da sala deve ter entre 3 e 100 caracteres.";
export const NAME_LENGTH_ERROR_MESSAGE = /o nome da sala deve ter entre 3 e 100 caracteres/i;
/** Alias para o teste de integração, que importa NAME_LENGTH_MESSAGE */
export const NAME_LENGTH_MESSAGE = NAME_LENGTH_ERROR_MESSAGE;
/** Alias para o texto literal, para o teste de integração */
export const NAME_LENGTH_TEXT = NAME_LENGTH_ERROR_TEXT;

export const CREATE_ROOM_ERROR_TEXT = "Erro ao criar a sala. Tente novamente.";
export const CREATE_ROOM_ERROR_MESSAGE = /erro ao criar a sala/i;

export const UPDATE_ROOM_ERROR_TEXT = "Erro ao atualizar a sala. Tente novamente.";
export const UPDATE_ROOM_ERROR_MESSAGE = /erro ao atualizar a sala/i;

export const CREATE_ROOM_SUCCESS_TEXT = "Sala criada com sucesso!";
export const CREATE_ROOM_SUCCESS_MESSAGE = /sala criada com sucesso!/i;
/** Alias para o teste de integração */
export const CREATED_TOAST = CREATE_ROOM_SUCCESS_TEXT;

export const UPDATE_ROOM_SUCCESS_TEXT = "Sala atualizada com sucesso!";
export const UPDATE_ROOM_SUCCESS_MESSAGE = /sala atualizada com sucesso!/i;
/** Alias para o teste de integração */
export const UPDATED_TOAST = UPDATE_ROOM_SUCCESS_TEXT;

export const DELETE_ROOM_SUCCESS_TEXT = "Sala deletada com sucesso!";
export const DELETE_ROOM_SUCCESS_MESSAGE = /sala deletada com sucesso!/i;
/** Alias para o teste de integração */
export const DELETED_TOAST = DELETE_ROOM_SUCCESS_TEXT;

// Toasts de falha: usados quando o backend rejeita a operação (500)
export const CREATE_FAILED_TOAST = "Falha ao criar a sala.";
export const UPDATE_FAILED_TOAST = "Falha ao atualizar a sala.";
export const DELETE_FAILED_TOAST = "Falha ao deletar a sala.";

export const LINK_COPIED_TEXT = "Link copiado!";
export const LINK_COPIED_MESSAGE = /link copiado!/i;
/** Alias para o teste de integração */
export const COPIED_TOAST = LINK_COPIED_TEXT;

export const COPY_ERROR_TEXT = "Erro ao copiar o link";
export const COPY_ERROR_MESSAGE = /erro ao copiar o link/i;

// Textos de botões e rótulos
export const CREATE_BUTTON_TEXT = "Criar";
export const CREATING_BUTTON_TEXT = "Criando...";
export const SAVE_BUTTON_TEXT = "Salvar";
export const SAVING_BUTTON_TEXT = "Salvando...";

export const COPY_LINK_LABEL = "Copiar Link";
export const EDIT_LABEL = "Editar";
export const DELETE_LABEL = "Excluir";

export const DELETE_MODAL_TITLE = "Excluir sala";
export const CONFIRM_DELETE_BUTTON_TEXT = "Excluir";
export const CANCEL_DELETE_BUTTON_TEXT = "Cancelar";

/**
 * Retorna o joinLink canônico para um código de sala,
 * seguindo o padrão usado pelo roomService e pelo useCopyLink.
 */
export function joinLinkOf(code: string): string {
  return `app/join/${code}`;
}

/**
 * Cria uma sala mockada com valores padrão e campos opcionais customizáveis.
 * Os códigos TEC498/TEC499 são usados pelo fakeBackend do teste de integração.
 */
export function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: ROOM_ID,
    name: "Circuitos Digitais",
    code: "TEC498",
    joinLink: joinLinkOf("TEC498"),
    semester: "2026.2",
    tutor: "Roberto Oliveira",
    ...overrides,
  };
}

/**
 * Cria uma segunda sala para listas com múltiplos itens.
 */
export function makeOtherRoom(overrides: Partial<Room> = {}): Room {
  return makeRoom({
    id: OTHER_ROOM_ID,
    name: "Sistemas Digitais",
    code: "TEC499",
    joinLink: joinLinkOf("TEC499"),
    semester: "2026.2",
    tutor: "André Silva",
    ...overrides,
  });
}
