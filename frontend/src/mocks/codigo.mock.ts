// Lista de códigos de acesso válidos simulados (gerados aleatoriamente)
export const CODIGOS_VALIDOS_MOCK: string[] = [
  "SALA1", 
  "SALA2", 
];

//Função utilitária para validar se o código digitado existe no sistema simulado.
export function validarCodigoSala(codigo: string): boolean {
  const codigoTratado = codigo.trim().toUpperCase();
  return CODIGOS_VALIDOS_MOCK.includes(codigoTratado);
}