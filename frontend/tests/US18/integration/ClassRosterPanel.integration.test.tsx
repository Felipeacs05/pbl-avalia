import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ClassRosterPanel } from "@/components/features/class-roster/ClassRosterPanel";
import {
  OTHER_STUDENT_ID,
  ROOM_ID,
  ROSTER_PAGE_SIZE,
  STUDENT_ID,
  STUDENT_INITIALS,
  STUDENT_NAME,
  THIRD_STUDENT_ID,
} from "../fixtures";

const ROOM_ROSTER_ROUTE = /\/api\/v1\/rooms\/([^/]+)\/roster$/;
const BROKEN_PHOTO_URL = "https://img.uefs.br/link-quebrado.png";
const PEDRO_PHOTO_URL = "https://img.uefs.br/pedro.png";

// Aluno como está no banco: o User guarda a foto em profilePictureUrl, o DTO a expõe como profileImageUrl
interface StoredStudent {
  id: string;
  name: string;
  profilePictureUrl: string | null;
}

// Estado do fakeBackend: os alunos ativos da sala
let stored: StoredStudent[];

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Mesma regra do ClassRosterDTO.buildInitials: primeira letra do primeiro e do último nome
function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  return initials.toUpperCase();
}

async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = new URL(String(input), "http://localhost");
  const roomId = url.pathname.match(ROOM_ROSTER_ROUTE)?.[1];
  if ((init.method ?? "GET") !== "GET" || roomId !== ROOM_ID) {
    return jsonResponse({}, 404);
  }

  // Mesmos padrões do controller (página 0, tamanho 20); o limite de 100 é testado no backend
  const page = Number(url.searchParams.get("page") ?? 0);
  const size = Number(url.searchParams.get("size") ?? 20);

  // Como o ClassRosterService: ordem alfabética, mapeado para o ClassRosterDTO
  const sorted = [...stored].sort((a, b) => a.name.localeCompare(b.name));
  const content = sorted
    .slice(page * size, (page + 1) * size)
    .map(({ id, name, profilePictureUrl }) => ({
      id,
      name,
      profileImageUrl: profilePictureUrl,
      initials: buildInitials(name),
    }));
  return jsonResponse(
    { content, page, size, totalElements: sorted.length, totalPages: Math.ceil(sorted.length / size) },
    200,
  );
}

function rosterRequests() {
  return vi.mocked(fetch).mock.calls.map(([url, init]) => {
    const parsed = new URL(String(url), "http://localhost");
    return {
      method: init?.method ?? "GET",
      roomId: parsed.pathname.match(ROOM_ROSTER_ROUTE)?.[1],
      page: parsed.searchParams.get("page"),
      size: parsed.searchParams.get("size"),
    };
  });
}

// Com alt="" a foto não tem papel acessível; o que o critério exige é a ausência do próprio <img>
function photoIn(item: HTMLElement) {
  return item.querySelector("img");
}

function itemOf(name: string): HTMLElement {
  const item = screen.getAllByRole("listitem").find((li) => within(li).queryByText(name));
  if (!item) throw new Error(`Aluno ${name} não está na grade`);
  return item;
}

// Espera pelos itens, não pela lista: a grade pode existir vazia enquanto carrega
async function renderPanel() {
  render(<ClassRosterPanel roomId={ROOM_ID} />);
  return screen.findAllByRole("listitem");
}

// Nomes com zero à esquerda garantem a ordem alfabética previsível, como no teste de integração do backend
function makeStoredStudents(count: number): StoredStudent[] {
  return Array.from({ length: count }, (_, i) => {
    const name = `Aluno ${String(i).padStart(3, "0")}`;
    return { id: `aluno-${i}`, name, profilePictureUrl: `https://img.uefs.br/aluno${i}.png` };
  });
}

beforeEach(() => {
  // Gravados fora da ordem alfabética: a ordem da grade precisa vir do servidor
  stored = [
    { id: THIRD_STUDENT_ID, name: "Pedro Henrique", profilePictureUrl: PEDRO_PHOTO_URL },
    { id: STUDENT_ID, name: STUDENT_NAME, profilePictureUrl: BROKEN_PHOTO_URL },
    { id: OTHER_STUDENT_ID, name: "João", profilePictureUrl: null },
  ];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US18] Integração do ClassRosterPanel", () => {
  it("Deve buscar todas as páginas do carômetro da sala e exibir todos os alunos, na ordem do backend e com fotos lazy", async () => {
    // Uma turma maior que a página máxima do backend (100) exige uma segunda requisição
    stored = makeStoredStudents(ROSTER_PAGE_SIZE + 1).reverse();

    const items = await renderPanel();

    expect(items).toHaveLength(ROSTER_PAGE_SIZE + 1);
    expect(items[0]).toHaveTextContent("Aluno 000");
    expect(items[ROSTER_PAGE_SIZE]).toHaveTextContent("Aluno 100");
    expect(photoIn(items[ROSTER_PAGE_SIZE])).toHaveAttribute("src", "https://img.uefs.br/aluno100.png");
    // Nenhuma foto é baixada antes de aparecer na rolagem
    items.forEach((item) => expect(photoIn(item)).toHaveAttribute("loading", "lazy"));

    const requests = rosterRequests();
    expect(requests.map((request) => request.page)).toEqual(["0", "1"]);
    expect(requests.every((request) => request.method === "GET" && request.roomId === ROOM_ID)).toBe(true);
    expect(requests.every((request) => request.size === String(ROSTER_PAGE_SIZE))).toBe(true);
  });

  it("[QA] Deve trocar a foto de link quebrado pelas iniciais, sem ícone de imagem quebrada e sem afetar os demais alunos", async () => {
    await renderPanel();
    // A URL quebrada gravada no banco chegou ao <img>: é ela que dispara a falha
    expect(photoIn(itemOf(STUDENT_NAME))).toHaveAttribute("src", BROKEN_PHOTO_URL);

    // userEvent não simula falha de rede; o evento error é o que o navegador dispara no link quebrado
    fireEvent.error(photoIn(itemOf(STUDENT_NAME))!);

    // Iniciais calculadas pelo servidor a partir do nome gravado, no lugar do <img>
    expect(photoIn(itemOf(STUDENT_NAME))).toBeNull();
    expect(within(itemOf(STUDENT_NAME)).getByText(STUDENT_INITIALS)).toBeInTheDocument();
    // Aluno sem foto no banco: avatar reserva desde o início
    expect(photoIn(itemOf("João"))).toBeNull();
    expect(within(itemOf("João")).getByText("J")).toBeInTheDocument();
    // A falha de um aluno não derruba a foto dos outros
    expect(photoIn(itemOf("Pedro Henrique"))).toHaveAttribute("src", PEDRO_PHOTO_URL);
    // O avatar reserva é montado com o que já chegou: nenhuma requisição a mais no 4G
    expect(rosterRequests()).toHaveLength(1);
  });
});
