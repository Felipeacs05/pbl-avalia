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