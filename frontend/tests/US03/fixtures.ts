import type { Room } from "@/types/room";

export const ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
export const OTHER_ROOM_ID = "111e1111-e11b-11d1-a111-111111111111";

export const NAME_VALIDATION_MESSAGE = /entre 3 e 100 caracteres/i;

export function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: ROOM_ID,
    name: "Software Engineering Module",
    code: "A1B2C",
    joinLink: "app/join/A1B2C",
    ...overrides,
  };
}

export const makeOtherRoom = (): Room =>
  makeRoom({
    id: OTHER_ROOM_ID,
    name: "Computer Networks Module",
    code: "Z9Y8X",
    joinLink: "app/join/Z9Y8X",
  });
