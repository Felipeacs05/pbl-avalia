// src/types/discipline.ts

export interface Problem {
  id: string;
  title: string;
  description: string;
}

export interface Discipline {
  id: string;
  name: string;
  description: string;
  roomId: string;
  problems: Problem[];
}
