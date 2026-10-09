// src/mocks/grade.mock.ts
import type { Discipline } from "../types/discipline";

export const gradeMock: Discipline[] = [
  {
    id: "disc_01",
    name: "Circuitos Digitais",
    description:
      "Laboratório e tutoriais de portas lógicas, mapas de Karnaugh e sistemas sequenciais.",
    roomId: "1",
    problems: [
      {
        id: "prob_01",
        title: "Problema 1",
        description: "Projeto de FSM com tabelas de excitação",
      },
      {
        id: "prob_02",
        title: "Problema 2",
        description: "Interação com nível de portas lógicas e datapath",
      },
    ],
  },
  {
    id: "disc_02",
    name: "Arquitetura de Computadores",
    description:
      "Organização de processadores, pipelines e hierarquia de memória.",
    roomId: "1",
    problems: [
      {
        id: "prob_03",
        title: "Problema 1",
        description: "Implementação de pipeline MIPS de 5 estágios",
      },
    ],
  },
  {
    id: "disc_03",
    name: "Sistemas Digitais",
    description:
      "Projeto e análise de circuitos combinacionais e sequenciais avançados.",
    roomId: "2",
    problems: [
      {
        id: "prob_04",
        title: "Problema 1",
        description: "Projeto de unidade lógica e aritmética (ULA)",
      },
      {
        id: "prob_05",
        title: "Problema 2",
        description: "Controlador de semáforo com VHDL",
      },
      {
        id: "prob_06",
        title: "Problema 3",
        description: "Comunicação serial UART",
      },
    ],
  },
];
