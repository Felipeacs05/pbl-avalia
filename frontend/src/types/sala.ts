export interface Sala {
  id: number;
  nome: string;
  codigo: string;
  semestre: string;
  // ====== ALTERADO POR CLAUDE ======
  tutor?: string;
  tutorFoto?: string;
}