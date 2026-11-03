// src/types/studentRoom.ts
export interface StudentRoom {
  id: string;
  name: string;
  code: string;
  inviteLink: string;
  semester?: string;
  tutor?: string;        // Adicionado para o card exibir o nome do professor
  tutorPhoto?: string;   // Adicionado para a foto do tutor, se houver
}