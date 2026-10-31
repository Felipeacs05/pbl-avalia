// src/types/classRoster.ts

export interface ClassRosterStudent {
  id: string;
  name: string;
  profileImageUrl: string | null;
  initials: string;
}

export interface ClassRosterPage {
  content: ClassRosterStudent[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
