// src/types/student.ts

export interface Student {
  id: string;
  name: string;
  avatarUrl?: string;
  profileImageUrl?: string | null;
  initials?: string;
  email?: string;
  registrationNumber?: string;
}
