// src/types/disciplina.ts

export interface Problema {
  id: string;
  titulo: string;
  descricao: string;
}

export interface Disciplina {
  id: string;
  nome: string;
  descricao: string;
  roomId: string;
  problemas: Problema[];
}
