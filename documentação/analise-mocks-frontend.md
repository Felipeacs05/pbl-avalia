# Auditoria de Conformidade: Mocks do Frontend vs. Backend Real

> **Pergunta do Usuário:** *"Os mocks do front end estão condizentes com o que o backend tem que receber?"*  
> **Diagnóstico:** **Parcialmente**. Há serviços que já estão alinhados, mas há **divergências críticas** em formatos de payload, nomes de rotas, tipos de dados e endpoints presentes no frontend que ainda não existem no backend.

---

## 1. Tabela Geral de Conformidade por Recurso

| Recurso / Serviço | Status | Resumo da Situação |
| :--- | :---: | :--- |
| **Auth (Login)** | ⚠️ **Divergência** | Backend retorna `{ token, expiresAt }`. Mock do frontend espera `{ token, user: { id, name, email } }`. Além disso, baseURL no front omite `/v1/`. |
| **Auth (Cadastro)** | ⚠️ **Divergência Crítica** | Backend exige `multipart/form-data` com part `data` (JSON do `RegisterUserRequest`) e part `photo` (arquivo). Frontend envia campos soltos no FormData (`name`, `image`). |
| **Salas (`roomService`)** | ⚠️ **Divergência** | Mock tem campos `semester` e `tutor` que não existem no `RoomResponse` do backend. Criação e atualização de salas batem com o backend. |
| **Presença (`attendanceService`)** | ⚠️ **Parcial** | O `PUT /api/v1/sessions/{id}/attendances/{studentId}` bate com o backend. Porém o `GET /api/v1/sessions/{id}` **não existe** no backend. |
| **Papéis de Sessão (`sessionRoleService`)** | ✅ **Condizente** | `PUT /api/v1/sessions/{id}/roles/{role}` com `{ studentId, extraGrade }` bate perfeitamente com `SessionRoleAssignmentController`. |
| **Grupos (`groupService`)** | 🔴 **Divergência Crítica de Rotas** | Backend exige o prefixo da sala em todas as rotas (`/rooms/{roomId}/groups/{groupId}`). Frontend tenta chamar `/groups/{groupId}` diretamente. |
| **Tabela de Desempenho (`performanceTableService`)** | ✅ **Condizente** | `GET /performance-tables/{id}` e `PUT /criteria/weights` com soma 1.0 batem com o backend. |
| **Carômetro (`photoRosterService`)** | 🔴 **Divergência de Rota e Estrutura** | Frontend chama `GET /rooms/{roomId}/students`. Backend implementou `GET /rooms/{roomId}/roster` paginado retornando `ClassRosterDTO`. |
| **Problemas (`problemService`)** | ⚠️ **Divergência** | Backend só aceita `title` em `ProblemRequest`. Frontend envia `{ title, description }`. Rota de criação no front usa `/disciplines/{id}/problems` em vez de `/rooms/{roomId}/problems`. |
| **Liberação de Avaliação (`evaluationService`)** | ⚠️ **Divergência de Verbo e URL** | Backend usa `PATCH /problems/{id}/self-assessment-release`. Frontend usou `POST /problems/{id}/self-evaluation/release`. |
| **Envio de Autoavaliação e Pares** | ✅ **Condizente** | No componente `AssessmentPanel.jsx`, os disparos batem perfeitamente com os controllers `SelfAssessmentController` e `PeerAssessmentController`. |
| **Ajuste de Nota (`gradeAdjustmentService`)** | ⚠️ **Parcial** | `PATCH /assessments/{id}/grade-adjustment` com `{ adjustedGrade, justification }` bate 100%. Mas `GET /assessments/{id}` não existe no backend. |
| **Feedbacks (`feedbackService`)** | ✅ **Condizente** | `POST /problems/{id}/feedbacks`, `POST /problems/{id}/feedbacks/batch` e `GET /students/{id}/feedbacks` batem com os controllers do backend. |

---

## 2. Detalhamento das Divergências Críticas e Correções

### 2.1 Autenticação e Registro

#### Divergência no Cadastro (`POST /api/v1/auth/register`)
- **Como o Frontend está enviando (`registrationService.ts`):**
  ```typescript
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('email', data.email);
  formData.append('password', data.password);
  formData.append('image', data.image); // Nome 'image' e campos soltos
  await api.post('/auth/register', formData);
  ```
- **O que o Backend exige (`AuthController.java`):**
  ```java
  public ResponseEntity<UserResponse> register(
      @Valid @RequestPart("data") RegisterUserRequest request,
      @RequestPart(value = "photo", required = false) MultipartFile photo
  )
  ```
- **Correção Necessária no Frontend:**
  O backend Spring Boot espera um `@RequestPart("data")` contendo um Blob JSON e um `@RequestPart("photo")` para o arquivo:
  ```typescript
  const formData = new FormData();
  const jsonPayload = JSON.stringify({
    name: data.name,
    email: data.email,
    password: data.password
  });
  formData.append('data', new Blob([jsonPayload], { type: 'application/json' }));
  if (data.image) {
    formData.append('photo', data.image); // Nome 'photo', não 'image'
  }
  await api.post('/v1/auth/register', formData);
  ```

#### Divergência no Login (`POST /api/v1/auth/login`)
- **O que o Frontend espera receber (`authMockSuccess` / `authService.ts`):**
  ```typescript
  {
    token: "...",
    user: { id: "usr_01", name: "Marlus Rios", email: "marlus@uefs.br" }
  }
  ```
- **O que o Backend realmente envia (`LoginResponse.java`):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1740000000000
  }
  ```
- **Impacto:** O backend não envia o objeto `user` no login. Os dados do usuário devem ser extraídos decodificando o token JWT (claim `sub` para o ID) ou chamando um endpoint de perfil.

---

### 2.2 Gerenciamento de Grupos (`groupService.ts`)

- **Como o Frontend está chamando:**
  - `PUT /api/v1/groups/{groupId}`
  - `DELETE /api/v1/groups/{groupId}`
  - `POST /api/v1/groups/{groupId}/members`
  - `DELETE /api/v1/groups/{groupId}/members/{studentId}`
- **Como o Backend foi implementado (`GroupController.java`):**
  Todas as rotas de grupo pertencem ao recurso aninhado da sala:
  - `PATCH /api/v1/rooms/{roomId}/groups/{groupId}` (Verbo é `PATCH`, não `PUT`)
  - `DELETE /api/v1/rooms/{roomId}/groups/{groupId}`
  - `POST /api/v1/rooms/{roomId}/groups/{groupId}/members`
  - `DELETE /api/v1/rooms/{roomId}/groups/{groupId}/members/{studentId}`
- **Correção Necessária:** Passar o `roomId` para as funções do `groupService.ts` para montar a URL correta.

---

### 2.3 Problemas PBL (`problemService.ts`)

- **Como o Frontend está enviando:**
  - `POST /api/v1/disciplines/{disciplineId}/problems` com corpo `{ title, description }`.
- **Como o Backend foi implementado (`ProblemController.java`):**
  - Rota: `POST /api/v1/rooms/{roomId}/problems`.
  - Corpo da Requisição (`ProblemRequest.java`): possui **apenas** o campo `title`:
    ```json
    {
      "title": "Problema 1: Aquecimento Global"
    }
    ```
  - Não existe campo `description` na entidade `Problem` nem no DTO do backend atual.

---

### 2.4 Carômetro / Lista de Alunos (`photoRosterService.ts`)

- **Frontend:**
  - `GET /api/v1/rooms/{roomId}/students`
  - `DELETE /api/v1/rooms/{roomId}/students/{studentId}`
- **Backend Real:**
  - Não possui rota `/students`.
  - Rota implementada: `GET /api/v1/rooms/{roomId}/roster?page=0&size=20` (em `ClassRosterController.java`), que retorna `PageResponse<ClassRosterDTO>` com `id`, `name`, `profileImageUrl` e `initials`.
  - Para obter todos os membros da sala de forma simples, o backend tem `GET /api/v1/rooms/{roomId}/members` (em `RoomController.java`).

---

### 2.5 Liberação de Avaliações (`evaluationService.ts`)

- **Frontend:**
  - Chama `POST /api/v1/problems/{problemId}/self-evaluation/release` ou `POST /evaluations/release`.
- **Backend Real (`AssessmentReleaseController.java`):**
  - Utiliza o método HTTP `PATCH`:
    - `PATCH /api/v1/problems/{problemId}/self-assessment-release`
    - `PATCH /api/v1/problems/{problemId}/peer-assessment-release`
  - Funcionam no formato **toggle** (inverte o estado atual entre aberto e fechado).

---

## 3. Endpoints Previstos no Frontend que NÃO Existem no Backend

Os seguintes métodos dos serviços frontend dependem de rotas que **não foram criadas no backend**:

1. `GET /api/v1/sessions/{sessionId}` (`attendanceService.fetchSessionRoster`):
   - Não há controller expondo os dados brutos de uma sessão individual.
2. `GET /api/v1/assessments/{assessmentId}` (`gradeAdjustmentService.getAssessment`):
   - O backend só possui o endpoint de ajuste (`PATCH /grade-adjustment`), mas não possui o `GET` da avaliação individual.
3. `POST /api/v1/problems/{problemId}/sessions` (`problemService.startSession`):
   - Não há controller REST para iniciar/criar sessões tutoriais dinamicamente.
4. `GET /api/v1/sessions/{sessionId}/grades/status` e `POST .../publish` (`sessionGradesService`):
   - O controlador de notas de sessão ainda não foi implementado no backend.
5. `GET /api/v1/sessions/{sessionId}/evaluations/{studentId}` (`studentEvaluationService`):
   - Avaliação formativa do tutor por sessão ainda é 100% mock.
6. `GET/PUT /api/v1/problems/{problemId}/criteria-preset` (`criteriaPresetService`):
   - No backend, os critérios são gerenciados através da `PerformanceTableController` (`/api/v1/performance-tables`).

---

## 4. Recomendações Práticas para o Projeto

1. **Ajustar `baseURL` do Axios / Fetch:**
   - No frontend `src/services/api.ts`, garanta que a baseURL termine com `/api/v1` para evitar discrepâncias em endpoints como `/auth/login`.
2. **Atualizar `registrationService.ts`:**
   - Adicionar o Blob com `type: application/json` para o part `data` e renomear o part de foto para `photo`.
3. **Sincronizar `useAuth.ts`:**
   - Ao receber o token no login, decodificar a carga útil do JWT (ex: com `jwt-decode`) para obter o `id` do usuário, em vez de esperar que o backend envie o objeto `user` solto.
4. **Alinhar Rotas de Grupos:**
   - Adicionar o parâmetro `roomId` nas chamadas de atualização e exclusão de grupos e membros em `groupService.ts`.
