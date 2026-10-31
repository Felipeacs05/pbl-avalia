// src/mocks/auth.mock.ts
import { AuthResponse } from "@/types/auth";

//src/mocks/auth.mock.ts

export const authMockSuccess: AuthResponse = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMWYyZTRiMC04ZjIwLTQyZjgtOTU4Yi05NDRhMWZhMzNmOTEiLCJuYW1lIjoiTWFybHVzIFJpb3MiLCJlbWFpbCI6Im1hcmx1c0B1ZWZzLmJyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  expiresAt: 1740000000000,
  user: {
    id: "c1f2e4b0-8f20-42f8-958b-944a1fa33f91",
    name: "Marlus Rios",
    email: "marlus@uefs.br",
  },
};