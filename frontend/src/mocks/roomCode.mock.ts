// Lista de códigos de acesso válidos simulados (gerados aleatoriamente)
export const VALID_CODES_MOCK: string[] = [
  "SALA1", 
  "SALA2", 
  "TEC498",
  "TEC499",
];

//Função utilitária para validar se o código digitado existe no sistema simulado.
export function validateRoomCode(codigo: string): boolean {
  const codigoTratado = codigo.trim().toUpperCase();
  return VALID_CODES_MOCK.includes(codigoTratado);
}

// Ainda não existe endpoint no back-end, então a validação de código é feita 
// localmente e o bloqueio de IP também é simulado aqui.
// Quando o endpoint existir, a função attemptEnterRoom trocar por uma chamada
export const MAX_FAILED_ATTEMPTS = 5;

// 15 minutos de bloqueio após 5 tentativas com código inválido
export const BLOCK_DURATION_SECONDS = 15 * 60;

// Estado do "servidor" fica em memoria, é so recarregar a página (F5) zera tudo, pra testar dnv
let failedAttempts = 0;
let blockedUntil = 0; // instante em que o bloqueio termina

export async function attemptEnterRoom(code: string): Promise<boolean> {
  const now = Date.now();

  // Bloqueio terminou: o contador volta a zero
  if (blockedUntil && now >= blockedUntil) {
    failedAttempts = 0;
    blockedUntil = 0;
  }

  // Ainda bloqueado: nem olha o código, responde 429 direto
  if (now < blockedUntil) {
    const secondsLeft = Math.ceil((blockedUntil - now) / 1000);
    throw Object.assign(new Error("Too Many Requests"), {
      response: { status: 429, headers: { "retry-after": String(secondsLeft) } },
    });
  }

  if (validateRoomCode(code)) return true;

  failedAttempts += 1;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    blockedUntil = now + BLOCK_DURATION_SECONDS * 1000;
  }
  return false;
}