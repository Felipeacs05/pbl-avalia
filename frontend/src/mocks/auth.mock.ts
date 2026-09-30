// src/mocks/auth.mock.ts
import { AuthResponse } from "@/types/auth";

//src/mocks/auth.mock.ts

export const authMockSuccess: AuthResponse = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik1hcmx1cyBSaW9zIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  user: {
    id: "usr_01",
    name: "Marlus Rios",
    email: "marlus@uefs.br",
  },
};