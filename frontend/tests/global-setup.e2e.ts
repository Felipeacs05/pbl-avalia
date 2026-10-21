const REQUIRED_ENV = [
  "E2E_USER_ID",
  "E2E_TUTOR_ID",
  "E2E_TUTOR_NAME",
  "E2E_OTHER_TUTOR_ID",
  "E2E_ROOM_ID",
  "E2E_PROBLEM_ID",
  "E2E_SESSION_ID",
  "E2E_PERFORMANCE_TABLE_ID",
  "E2E_ASSESSMENT_ID",
  "E2E_ORIGINAL_GRADE",
  "E2E_STUDENT_ID",
  "E2E_STUDENT_NAME",
  "E2E_OTHER_STUDENT_ID",
  "E2E_OTHER_STUDENT_NAME",
] as const;

async function seed(backendURL: string): Promise<Record<string, string>> {
  let response: Response;
  try {
    response = await fetch(`${backendURL}/api/e2e/seed`, { method: "POST" });
  } catch (error) {
    throw new Error(
      `O backend não respondeu em ${backendURL}. Suba-o com SPRING_PROFILES_ACTIVE=e2e (docker compose -f docker-compose.e2e.yml up) ou defina E2E_SEED=false e preencha .env.e2e.`,
      { cause: error },
    );
  }
  if (response.status !== 201) {
    throw new Error(
      `POST ${backendURL}/api/e2e/seed respondeu ${response.status}: o backend precisa estar no perfil e2e. ${await response.text()}`,
    );
  }
  return response.json();
}

export default async function globalSetup() {
  if (process.env.E2E_SEED !== "false") {
    const backendURL = process.env.BACKEND_URL ?? "http://localhost:8081";
    Object.assign(process.env, await seed(backendURL));
  }

  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Variáveis do e2e ausentes: ${missing.join(", ")}. Veja frontend/.env.e2e.example.`);
  }
}
