import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginAuth } from "@/components/features/auth/LoginAuth";
import TeacherRoomsPage from "@/app/teacher-rooms/page";
import StudentRoomsPage from "@/app/student-rooms/page";
import { authService } from "@/services/authService";
import { roomService } from "@/services/roomService";
import {
  authMockSuccess,
  CREATE_ROOM_BUTTON_TEXT,
  DASHBOARD_TITLE,
  ENTER_ROOM_BUTTON_TEXT,
  INVALID_CREDENTIALS_TEXT,
  LOGIN_BUTTON_TEXT,
  makeAxiosError,
  STUDENT_TAB_LABEL,
  TEACHER_TAB_LABEL,
} from "../fixtures";
import type { Room } from "@/types/room";

// Mock de navegação
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock dos serviços
vi.mock("@/services/authService", () => ({
  authService: {
    login: vi.fn(),
  },
}));

vi.mock("@/services/roomService", () => ({
  roomService: {
    fetchRooms: vi.fn(),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
  },
}));

const mockAuthService = vi.mocked(authService);
const mockRoomService = vi.mocked(roomService);

const mockTeacherRooms: Room[] = [
  {
    id: "room_teacher_1",
    name: "Engenharia de Software (Tutor)",
    code: "ENG101",
    joinLink: "app/join/ENG101",
    semester: "2026.2",
    tutor: "Marlus Rios",
  },
];

const mockStudentRooms: Room[] = [
  {
    id: "room_student_1",
    name: "Banco de Dados (Aluno)",
    code: "BD202",
    joinLink: "app/join/BD202",
    semester: "2026.2",
    tutor: "Prof. Alberto",
  },
];

describe("[US02] LoginFlow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockRoomService.fetchRooms.mockResolvedValue([]);
  });

  it("Deve exibir o banner de alerta e não gravar token no localStorage quando credenciais forem inválidas", async () => {
    mockAuthService.login.mockRejectedValue(makeAxiosError(401, INVALID_CREDENTIALS_TEXT));

    const user = userEvent.setup();
    render(<LoginAuth />);

    await user.type(screen.getByLabelText("E-mail"), "usuario.errado@uefs.br");
    await user.type(screen.getByLabelText("Senha"), "senhaIncorreta");
    await user.click(screen.getByRole("button", { name: LOGIN_BUTTON_TEXT }));

    // O banner de erro deve ser anunciado e nenhum token pode ser armazenado
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(INVALID_CREDENTIALS_TEXT);
    expect(localStorage.getItem("token")).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("Deve autenticar com sucesso, armazenar token no localStorage e redirecionar para '/teacher-rooms'", async () => {
    mockAuthService.login.mockResolvedValue(authMockSuccess);

    const user = userEvent.setup();
    render(<LoginAuth />);

    await user.type(screen.getByLabelText("E-mail"), "marlus@uefs.br");
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(screen.getByRole("button", { name: LOGIN_BUTTON_TEXT }));

    // Valida persistência da credencial JWT e redirecionamento de tela
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: "marlus@uefs.br",
      password: "123456",
    });

    expect(localStorage.getItem("token")).toBe(authMockSuccess.token);
    expect(mockPush).toHaveBeenCalledWith("/teacher-rooms");
  });

  it("[QA] Deve validar a separação visual do Dashboard: página de professor exibe 'Criar nova sala' e aba 'Professor' ativa", async () => {
    mockRoomService.fetchRooms.mockResolvedValue(mockTeacherRooms);

    render(<TeacherRoomsPage />);

    // Título do dashboard
    expect(await screen.findByRole("heading", { name: DASHBOARD_TITLE })).toBeInTheDocument();

    // Na visualização de professor, a ação rápida principal é 'Criar nova sala'
    expect(screen.getByRole("button", { name: CREATE_ROOM_BUTTON_TEXT })).toBeInTheDocument();

    // A barra inferior destaca a aba 'Professor' como ativa
    expect(screen.getByRole("button", { name: TEACHER_TAB_LABEL })).toBeInTheDocument();
    // E fornece link para alternar para a aba 'Aluno'
    expect(screen.getByRole("link", { name: STUDENT_TAB_LABEL })).toHaveAttribute("href", "/student-rooms");
  });

  it("[QA] Deve validar a separação visual do Dashboard: página de aluno exibe 'Entrar em sala' e aba 'Aluno' ativa", async () => {
    mockRoomService.fetchRooms.mockResolvedValue(mockStudentRooms);

    render(<StudentRoomsPage />);

    // Título do dashboard
    expect(await screen.findByRole("heading", { name: DASHBOARD_TITLE })).toBeInTheDocument();

    // Na visualização de aluno, a ação rápida principal é 'Entrar em sala'
    expect(screen.getByRole("button", { name: ENTER_ROOM_BUTTON_TEXT })).toBeInTheDocument();

    // A barra inferior destaca a aba 'Aluno' como ativa
    expect(screen.getByRole("button", { name: STUDENT_TAB_LABEL })).toBeInTheDocument();
    // E fornece link para alternar para a aba 'Professor'
    expect(screen.getByRole("link", { name: TEACHER_TAB_LABEL })).toHaveAttribute("href", "/teacher-rooms");
  });
});
