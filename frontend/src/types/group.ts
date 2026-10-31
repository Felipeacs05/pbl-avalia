export interface Student {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  roomId?: string;
  members: Student[];
}

