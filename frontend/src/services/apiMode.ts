export const IS_TEST = process.env.NODE_ENV === "test";

export const USE_REAL_API = IS_TEST || process.env.NEXT_PUBLIC_USE_MOCKS === "false";
