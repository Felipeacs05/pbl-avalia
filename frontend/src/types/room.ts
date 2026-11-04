export interface Room {
  id: string;
  name: string;
  description?: string;
  code: string;
  joinLink: string;
  semester?: string;
  tutor?: string;
  tutorPhoto?: string;
}
