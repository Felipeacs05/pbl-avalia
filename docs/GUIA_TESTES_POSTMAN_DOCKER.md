# 🚀 Guia Completo de Testes da API — Docker & Postman (PBL Avalia)

Este documento contém **todos os endpoints, inputs (headers, parâmetros e JSON bodies) e outputs esperados (sucesso e erro)** da API do **PBL Avalia**, além de um roteiro passo a passo na ordem exata de dependência para você testar pelo **Postman** usando o **Docker**.

---

## 🐳 1. Como Subir a API no Docker

Você tem **dois modos** disponíveis no projeto. Escolha o que preferir (ou use o **Modo Padrão** para testar o fluxo real completo com JWT):

| Modo | Comando para subir | URL Base da API | Autenticação | Quando usar? |
| :--- | :--- | :--- | :--- | :--- |
| **1. Padrão (Recomendado)** | `docker compose up --build -d` | `http://localhost:8080` | Header `Authorization: Bearer <TOKEN_JWT>` | Testa o fluxo real completo (Cadastro -> Login JWT -> Endpoints). |
| **2. E2E (Com Seed Rápido)** | `docker compose -f docker-compose.e2e.yml up --build -d` | `http://localhost:8081` | Header `X-User-Id: <UUID_DO_USUARIO>` | Possui a rota `POST /api/e2e/seed` que cria 40 alunos, sala, problema, sessão e avaliação automaticamente. |

> **Dica:** Com o container rodando, você também pode consultar o **Swagger UI** em `http://localhost:8080/swagger-ui.html` (ou porta `8081` no modo E2E).

---

## ⚙️ 2. Configurando o Postman (Dica de Ouro)

Para não precisar copiar e colar tokens e UUIDs manualmente em cada requisição:

1. No Postman, crie um **Environment** chamado `PBL Avalia - Docker`.
2. Adicione as seguintes variáveis iniciais:
   - `baseUrl`: `http://localhost:8080`
   - `tutorToken`: *(deixe em branco, será preenchido após o login do tutor)*
   - `studentToken`: *(deixe em branco, será preenchido após o login do aluno)*
   - `student2Token`: *(deixe em branco, será preenchido após o login do aluno 2)*
   - `tutorId`, `studentId`, `student2Id`, `roomId`, `roomCode`, `groupId`, `problemId`, `tableId`, `criterion1Id`, `criterion2Id`, `sessionId`, `assessmentId`
3. Em todas as rotas protegidas, na aba **Authorization** do Postman:
   - Selecione **Type**: `Bearer Token`
   - No campo **Token**, coloque `{{tutorToken}}` (quando a ação for do Professor/Tutor) ou `{{studentToken}}` (quando a ação for do Aluno).

---

## 🗺️ 3. Ordem Recomendada de Teste (Fluxo Lógico)

Como o sistema possui regras de negócio encadeadas (ex.: só é possível criar um Problema se existir uma Sala; só é possível fazer Autoavaliação se o Tutor liberar antes), siga esta ordem:

1. **Auth (US01):** Cadastrar Tutor, Aluno 1 e Aluno 2 (`POST /api/v1/auth/register`)
2. **Auth (US02):** Fazer Login do Tutor e dos Alunos e guardar os tokens JWT (`POST /api/v1/auth/login`)
3. **Salas (US03):** Tutor cria uma Sala (`POST /api/v1/rooms`)
4. **Salas (US04):** Aluno 1 e Aluno 2 entram na Sala com o código (`POST /api/v1/rooms/join`)
5. **Carômetro e Grupos (US18 / US06):** Tutor consulta o carômetro (`GET /api/v1/rooms/{roomId}/roster`) e cria Grupo com os alunos (`POST /api/v1/rooms/{roomId}/groups`)
6. **Problemas (US05):** Tutor cria um Problema na Sala (`POST /api/v1/rooms/{roomId}/problems`)
7. **Tabela de Desempenho (US07):** Tutor cria Tabela de Desempenho e Critérios (`POST /api/v1/performance-tables`)
8. **Sessão (US08 / US10):** Tutor registra Chamada (`PUT /api/v1/sessions/{sessionId}/attendances/{studentId}`) e atribui Papéis (`PUT /api/v1/sessions/{sessionId}/roles/{role}`)
9. **Liberação de Avaliações (US12):** Tutor libera Autoavaliação e Avaliação por Pares (`PATCH /api/v1/problems/{problemId}/self-assessment-release` e `/peer-assessment-release`)
10. **Avaliações (US13 / US14):** Aluno envia Autoavaliação (`POST /api/v1/problems/{problemId}/self-assessment`) e Avaliação por Pares (`POST /api/v1/problems/{problemId}/peer-assessments`)
11. **Moderação de Nota (US15):** Tutor ajusta nota da avaliação com justificativa (`PATCH /api/v1/assessments/{assessmentId}/grade-adjustment`)
12. **Feedbacks (US16 / US17):** Tutor envia Feedback individual ou em lote (`POST /api/v1/problems/{problemId}/feedbacks`) e Aluno consulta (`GET /api/v1/students/{studentId}/feedbacks`)

---

## 📡 4. Catálogo Completo de Endpoints (Inputs e Outputs)

---

### 🔐 MÓDULO 1: Autenticação (`AuthController`)

#### 1.1. Cadastrar Usuário (Tutor ou Aluno)
> **Nota de Arquitetura:** No PBL Avalia, todo usuário é cadastrado da mesma forma. Ele atua como **Tutor** nas salas que **ele criar**, e como **Aluno (`STUDENT`)** nas salas em que **ingressar com código**. Faça este passo **3 vezes** (1 para o Tutor, 1 para o Aluno 1 e 1 para o Aluno 2).

- **Método e URL:** `POST {{baseUrl}}/api/v1/auth/register`
- **Autenticação:** Pública (Não enviar token)
- **Content-Type:** `multipart/form-data`

> ⚠️ **ATENÇÃO NO POSTMAN (Configuração obrigatória do `multipart/form-data`):**
> O Spring Boot espera uma `@RequestPart("data")` do tipo JSON. No Postman:
> 1. Vá na aba **Body** -> selecione **form-data**.
> 2. No canto direito da tabela de campos, clique nos `...` (ou ícone de colunas) e marque **Content-Type** para exibir a coluna de tipo de conteúdo.
> 3. Preencha as linhas conforme a tabela abaixo:

| Key | Type | Value | Content-Type (Coluna do Postman) | Obrigatório? |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `Text` | `{"name": "Prof. Carlos Tutor", "email": "tutor@uefs.br", "password": "SenhaForte123!"}` | **`application/json`** *(Obrigatório!)* | **Sim** |
| `photo` | `File` | *(Selecione uma imagem `.jpg`, `.jpeg` ou `.png` de até 5MB)* | *(Automático)* | Não (Opcional) |

*(Nota: o JSON de `data` também aceita os aliases em português `"nome"`, `"senha"` e `"fotoUrl"`).*

- **Output Esperado — Sucesso (`201 Created`):**
  - Header de resposta: `Location: http://localhost:8080/api/v1/users/550e8400-...`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Prof. Carlos Tutor",
  "email": "tutor@uefs.br",
  "profilePictureUrl": null,
  "nome": "Prof. Carlos Tutor",
  "fotoPerfilUrl": null
}
```
*(Se enviou `photo`, `"profilePictureUrl"` retornará `"url-da-foto/fotosPerfil/foto.png"`).*
👉 **Salve o `id` retornado** como `tutorId` (e repita para `studentId` com `aluno1@uefs.br` e `student2Id` com `aluno2@uefs.br`).

- **Outputs de Erro Possíveis:**
  - `400 Bad Request` (Campos vazios ou e-mail inválido):
    ```json
    {
      "timestamp": "2026-10-21T16:10:00.123456",
      "status": 400,
      "error": "Bad Request",
      "message": "Validation failed",
      "errors": {
        "email": "Invalid email format",
        "name": "Name is required"
      }
    }
    ```
  - `400 Bad Request` (Arquivo não é JPG/PNG ou maior que 5MB):
    ```json
    {
      "timestamp": "2026-10-21T16:10:00.123456",
      "status": 400,
      "error": "Bad Request",
      "message": "arquivos que não sejam JPG, PNG ou JPEG devem ser rejeitados"
    }
    ```

---

#### 1.2. Login (Gerar Token JWT)
- **Método e URL:** `POST {{baseUrl}}/api/v1/auth/login`
- **Autenticação:** Pública (Não enviar token)
- **Headers:** `Content-Type: application/json`
- **Input (Body - raw JSON):** *(aceita `"password"` ou `"senha"`)*
```json
{
  "email": "tutor@uefs.br",
  "password": "SenhaForte123!"
}
```
- **Output Esperado — Sucesso (`200 OK`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE3...",
  "expiresAt": 1792696000000
}
```
👉 **Copie o `token`** para `{{tutorToken}}` (e faça login também com `aluno1@uefs.br` e `aluno2@uefs.br` para salvar `{{studentToken}}` e `{{student2Token}}`).

- **Output Esperado — Erro (`401 Unauthorized`):**
```json
{
  "timestamp": "2026-10-21T16:12:00.000000",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

---

### 🏫 MÓDULO 2: Salas e Dashboard (`RoomController` & `DashboardController`)

#### 2.1. Criar Sala (Apenas Tutor)
- **Método e URL:** `POST {{baseUrl}}/api/v1/rooms`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):** *(Nome obrigatório, entre 3 e 100 caracteres)*
```json
{
  "name": "MI - Engenharia de Software 2026.2"
}
```
- **Output Esperado — Sucesso (`201 Created`):**
```json
{
  "id": "b1c2d3e4-f5a6-47b8-9c0d-112233445566",
  "name": "MI - Engenharia de Software 2026.2",
  "code": "A1B2C3",
  "joinLink": "app/join/A1B2C3"
}
```
👉 **Salve o `id`** como `{{roomId}}` e o `code` como `{{roomCode}}`.

---

#### 2.2. Ingressar na Sala via Código JSON (Aluno)
- **Método e URL:** `POST {{baseUrl}}/api/v1/rooms/join`
- **Headers:**
  - `Authorization: Bearer {{studentToken}}` *(Faça também com `{{student2Token}}`)*
  - `Content-Type: application/json`
- **Input (Body - raw JSON):**
```json
{
  "accessCode": "{{roomCode}}"
}
```
- **Output Esperado — Sucesso (`200 OK`):**
```json
{
  "id": "b1c2d3e4-f5a6-47b8-9c0d-112233445566",
  "name": "MI - Engenharia de Software 2026.2",
  "code": "A1B2C3",
  "joinLink": "app/join/A1B2C3"
}
```
- **Outputs de Erro Possíveis:**
  - `404 Not Found` (`"Código de acesso inválido"`)
  - `400 Bad Request` (`"Tutor não pode ingressar como aluno na prórpia sala"`)
  - `429 Too Many Requests` (`"IP bloqueado temporariamente por excesso de tentativas"` — ocorre após 5 tentativas seguidas com código errado).

---

#### 2.3. Ingressar na Sala via Link/URL (Alternativa ao 2.2)
- **Método e URL:** `POST {{baseUrl}}/api/v1/rooms/join/{{roomCode}}`
- **Headers:** `Authorization: Bearer {{student2Token}}`
- **Input (Body):** *Vazio (sem body)*
- **Output Esperado — Sucesso (`200 OK`):** Mesmo JSON de `RoomResponse` do item 2.2.

---

#### 2.4. Listar Salas do Usuário Logado
- **Método e URL:** `GET {{baseUrl}}/api/v1/rooms`
- **Headers:** `Authorization: Bearer {{tutorToken}}` (ou `{{studentToken}}`)
- **Output Esperado — Sucesso (`200 OK`):**
```json
[
  {
    "id": "b1c2d3e4-f5a6-47b8-9c0d-112233445566",
    "name": "MI - Engenharia de Software 2026.2",
    "code": "A1B2C3",
    "joinLink": "app/join/A1B2C3"
  }
]
```

---

#### 2.5. Consultar Dashboard do Usuário (Salas como Tutor vs. Salas como Aluno)
- **Método e URL:** `GET {{baseUrl}}/api/v1/users/me/rooms`
- **Headers:** `Authorization: Bearer {{tutorToken}}` *(Nota: este endpoint exige especificamente um Token JWT válido)*
- **Output Esperado — Sucesso (`200 OK`):**
```json
{
  "roomsAsTutor": [
    {
      "id": "b1c2d3e4-f5a6-47b8-9c0d-112233445566",
      "name": "MI - Engenharia de Software 2026.2",
      "accessCode": "A1B2C3",
      "tutorId": "550e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "roomsAsStudent": []
}
```

---

#### 2.6. Listar Membros da Sala
- **Método e URL:** `GET {{baseUrl}}/api/v1/rooms/{{roomId}}/members`
- **Headers:** `Authorization: Bearer {{tutorToken}}` (Permitido para o Tutor dono da sala ou Alunos membros ativos)
- **Output Esperado — Sucesso (`200 OK`):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Prof. Carlos Tutor",
    "role": "TUTOR"
  },
  {
    "id": "11111111-2222-3333-4444-555555555551",
    "name": "Ana Aluna",
    "role": "STUDENT"
  },
  {
    "id": "11111111-2222-3333-4444-555555555552",
    "name": "Bruno Aluno",
    "role": "STUDENT"
  }
]
```

---

#### 2.7. Editar Nome da Sala (Apenas Tutor Dono)
- **Método e URL:** `PUT {{baseUrl}}/api/v1/rooms/{{roomId}}`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):**
```json
{
  "name": "MI - Engenharia de Software (Turma P01)"
}
```
- **Output Esperado — Sucesso (`200 OK`):**
```json
{
  "id": "b1c2d3e4-f5a6-47b8-9c0d-112233445566",
  "name": "MI - Engenharia de Software (Turma P01)",
  "code": "A1B2C3",
  "joinLink": "app/join/A1B2C3"
}
```

---

#### 2.8. Excluir Sala (Apenas Tutor Dono)
> ⚠️ **Deixe para testar no final**, pois apaga a sala!
- **Método e URL:** `DELETE {{baseUrl}}/api/v1/rooms/{{roomId}}`
- **Headers:** `Authorization: Bearer {{tutorToken}}`
- **Output Esperado — Sucesso (`204 No Content`):** Sem corpo de resposta.

---

### 🧑‍🎓 MÓDULO 3: Carômetro da Turma (`ClassRosterController` — US18)

#### 3.1. Consultar Carômetro Paginado (Apenas Tutor Dono)
- **Método e URL:** `GET {{baseUrl}}/api/v1/rooms/{{roomId}}/roster?page=0&size=20`
- **Headers:** `Authorization: Bearer {{tutorToken}}`
- **Query Params (Opcionais):**
  - `page`: `0` (padrão `0`)
  - `size`: `20` (padrão `20`, máximo `100`)
- **Output Esperado — Sucesso (`200 OK`):**
```json
{
  "content": [
    {
      "id": "11111111-2222-3333-4444-555555555551",
      "name": "Ana Aluna",
      "profileImageUrl": null,
      "initials": "AA"
    },
    {
      "id": "11111111-2222-3333-4444-555555555552",
      "name": "Bruno Aluno",
      "profileImageUrl": null,
      "initials": "BA"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 2,
  "totalPages": 1
}
```

---

### 👥 MÓDULO 4: Gestão de Grupos/Equipes (`GroupController` — US06)

#### 4.1. Listar Alunos Disponíveis (Sem Grupo na Sala)
- **Método e URL:** `GET {{baseUrl}}/api/v1/rooms/{{roomId}}/groups/available-students`
- **Headers:** `Authorization: Bearer {{tutorToken}}`
- **Output Esperado — Sucesso (`200 OK`):**
```json
[
  {
    "name": "Ana Aluna",
    "id": "11111111-2222-3333-4444-555555555551"
  },
  {
    "name": "Bruno Aluno",
    "id": "11111111-2222-3333-4444-555555555552"
  }
]
```

---

#### 4.2. Criar Grupo (Apenas Tutor Dono)
- **Método e URL:** `POST {{baseUrl}}/api/v1/rooms/{{roomId}}/groups`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):** *(Nome de 3 a 100 caracteres; `memberIds` é opcional na criação)*
```json
{
  "name": "Grupo Alpha",
  "memberIds": [
    "{{studentId}}"
  ]
}
```
- **Output Esperado — Sucesso (`201 Created`):**
```json
{
  "id": "c1d2e3f4-1111-2222-3333-444455556666",
  "name": "Grupo Alpha",
  "roomId": "b1c2d3e4-f5a6-47b8-9c0d-112233445566",
  "members": [
    {
      "name": "Ana Aluna",
      "id": "11111111-2222-3333-4444-555555555551"
    }
  ]
}
```
👉 **Salve o `id` do grupo** como `{{groupId}}`.

---

#### 4.3. Adicionar Integrante ao Grupo (Apenas Tutor Dono)
- **Método e URL:** `POST {{baseUrl}}/api/v1/rooms/{{roomId}}/groups/{{groupId}}/members`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):**
```json
{
  "studentId": "{{student2Id}}"
}
```
- **Output Esperado — Sucesso (`201 Created`):**
```json
{
  "id": "c1d2e3f4-1111-2222-3333-444455556666",
  "name": "Grupo Alpha",
  "roomId": "b1c2d3e4-f5a6-47b8-9c0d-112233445566",
  "members": [
    {
      "name": "Ana Aluna",
      "id": "11111111-2222-3333-4444-555555555551"
    },
    {
      "name": "Bruno Aluno",
      "id": "11111111-2222-3333-4444-555555555552"
    }
  ]
}
```
- **Output de Erro (`409 Conflict`):** Quando o aluno já pertence a algum grupo na mesma sala (`"O aluno já pertence a um grupo desta sala"`).

---

#### 4.4. Listar Todos os Grupos da Sala
- **Método e URL:** `GET {{baseUrl}}/api/v1/rooms/{{roomId}}/groups`
- **Headers:** `Authorization: Bearer {{tutorToken}}` (ou `{{studentToken}}`)
- **Output Esperado — Sucesso (`200 OK`):** Lista de `GroupResponse` (mesmo formato acima).

---

#### 4.5. Consultar Meu Grupo na Sala (Visão do Aluno)
- **Método e URL:** `GET {{baseUrl}}/api/v1/rooms/{{roomId}}/groups/me`
- **Headers:** `Authorization: Bearer {{studentToken}}`
- **Output Esperado — Sucesso (`200 OK`):** Objeto `GroupResponse` do grupo ao qual o aluno pertence.

---

#### 4.6. Renomear Grupo (Apenas Tutor Dono)
- **Método e URL:** `PATCH {{baseUrl}}/api/v1/rooms/{{roomId}}/groups/{{groupId}}`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):**
```json
{
  "name": "Grupo Alpha - Atualizado"
}
```
- **Output Esperado — Sucesso (`200 OK`):** Objeto `GroupResponse` com o nome atualizado.

---

#### 4.7. Remover Integrante do Grupo (Apenas Tutor Dono)
- **Método e URL:** `DELETE {{baseUrl}}/api/v1/rooms/{{roomId}}/groups/{{groupId}}/members/{{student2Id}}`
- **Headers:** `Authorization: Bearer {{tutorToken}}`
- **Output Esperado — Sucesso (`204 No Content`):** Sem corpo de resposta.

---

#### 4.8. Excluir Grupo (Apenas Tutor Dono)
- **Método e URL:** `DELETE {{baseUrl}}/api/v1/rooms/{{roomId}}/groups/{{groupId}}`
- **Headers:** `Authorization: Bearer {{tutorToken}}`
- **Output Esperado — Sucesso (`204 No Content`):** Sem corpo de resposta.

---

### 📋 MÓDULO 5: Problemas (`ProblemController` — US05)

#### 5.1. Criar Problema na Sala (Apenas Tutor Dono)
- **Método e URL:** `POST {{baseUrl}}/api/v1/rooms/{{roomId}}/problems`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):**
```json
{
  "title": "Problema 01 - Arquitetura de Microsserviços"
}
```
- **Output Esperado — Sucesso (`201 Created`):**
```json
{
  "id": "d1e2f3a4-5555-6666-7777-888899990000",
  "title": "Problema 01 - Arquitetura de Microsserviços"
}
```
👉 **Salve o `id`** como `{{problemId}}`.

---

#### 5.2. Listar Problemas da Sala
- **Método e URL:** `GET {{baseUrl}}/api/v1/rooms/{{roomId}}/problems`
- **Headers:** `Authorization: Bearer {{tutorToken}}` (ou `{{studentToken}}`)
- **Output Esperado — Sucesso (`200 OK`):**
```json
[
  {
    "id": "d1e2f3a4-5555-6666-7777-888899990000",
    "title": "Problema 01 - Arquitetura de Microsserviços"
  }
]
```

---

#### 5.3. Atualizar Problema (Apenas Tutor Dono)
- **Método e URL:** `PUT {{baseUrl}}/api/v1/problems/{{problemId}}`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):**
```json
{
  "title": "Problema 01 - Arquitetura Limpa e Hexagonal"
}
```
- **Output Esperado — Sucesso (`200 OK`):**
```json
{
  "id": "d1e2f3a4-5555-6666-7777-888899990000",
  "title": "Problema 01 - Arquitetura Limpa e Hexagonal"
}
```

---

#### 5.4. Excluir Problema (Apenas Tutor Dono)
> ⚠️ **Deixe para testar no final**, pois os módulos de Avaliação e Feedback usam o `{{problemId}}`.
- **Método e URL:** `DELETE {{baseUrl}}/api/v1/problems/{{problemId}}`
- **Headers:** `Authorization: Bearer {{tutorToken}}`
- **Output Esperado — Sucesso (`204 No Content`):** Sem corpo de resposta.

---

### 📊 MÓDULO 6: Tabelas de Desempenho e Critérios (`PerformanceTableController` — US07)

> **Regras de Negócio Importantes:**
> - Os nomes dos critérios aceitam apenas **letras (com ou sem acento), números, espaços e hifens** (`^[a-zA-Z0-9À-ÿ\s-]+$`). Não use barras `/`, pontos `.` ou parênteses `()` no `criteriaName`.
> - Os pesos (`criteriaWeight`) são representados entre `0.0` e `1.0` (onde `1.0` = 100%).
> - Na criação da tabela, você pode **informar todos os pesos somando exatamente `1.0`** OU **omitir (`null`) todos os pesos** para que o sistema distribua igualmente.

#### 6.1. Criar Tabela de Desempenho (Apenas Tutor Dono)
- **Método e URL:** `POST {{baseUrl}}/api/v1/performance-tables`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input Opção A (Com pesos explícitos somando 1.0):**
```json
{
  "roomId": "{{roomId}}",
  "tableName": "Tabela de Avaliação Tutorial",
  "criteriaList": [
    {
      "criteriaName": "Embasamento Teórico",
      "criteriaDescription": "Domínio dos conceitos estudados",
      "criteriaWeight": 0.6
    },
    {
      "criteriaName": "Participação na Discussão",
      "criteriaDescription": "Contribuição ativa durante a sessão",
      "criteriaWeight": 0.4
    }
  ]
}
```
- **Input Opção B (Sem pesos — distribuição igualitária automática):** Basta omitir `"criteriaWeight"` em todos os itens.
- **Output Esperado — Sucesso (`201 Created`):**
```json
{
  "performanceTableId": "e1f2a3b4-1234-5678-9abc-def012345678",
  "roomId": "b1c2d3e4-f5a6-47b8-9c0d-112233445566",
  "tableName": "Tabela de Avaliação Tutorial",
  "status": "ACTIVE",
  "criteriaList": [
    {
      "criterionId": "f1111111-1111-1111-1111-111111111111",
      "criteriaName": "Embasamento Teórico",
      "criteriaDescription": "Domínio dos conceitos estudados",
      "criteriaWeight": 0.6,
      "status": "ACTIVE"
    },
    {
      "criterionId": "f2222222-2222-2222-2222-222222222222",
      "criteriaName": "Participação na Discussão",
      "criteriaDescription": "Contribuição ativa durante a sessão",
      "criteriaWeight": 0.4,
      "status": "ACTIVE"
    }
  ]
}
```
👉 **Salve `performanceTableId`** como `{{tableId}}` e os IDs dos critérios como `{{criterion1Id}}` e `{{criterion2Id}}`.

- **Output Esperado — Erro de Soma de Pesos (`422 Unprocessable Entity`):**
```json
{
  "timestamp": "2026-10-21T16:20:00.000000",
  "status": 422,
  "error": "Unprocessable Entity",
  "message": "A soma dos pesos deve ser exatamente 100% (1.0)."
}
```

---

#### 6.2. Consultar Tabela de Desempenho por ID
- **Método e URL:** `GET {{baseUrl}}/api/v1/performance-tables/{{tableId}}`
- **Headers:** `Authorization: Bearer {{tutorToken}}`
- **Output Esperado — Sucesso (`200 OK`):** Mesmo objeto `PerformanceTableResponse` do item 6.1.

---

#### 6.3. Adicionar Novo Critério à Tabela (Apenas Tutor Dono)
- **Método e URL:** `POST {{baseUrl}}/api/v1/performance-tables/{{tableId}}/criteria`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):** *(Se informar `criteriaWeight`, ex: `0.2`, os critérios existentes terão seus pesos reduzidos proporcionalmente para somar `0.8`. Se omitir `criteriaWeight`, todos serão redistribuídos igualmente).*
```json
{
  "criteriaName": "Trabalho em Equipe",
  "criteriaDescription": "Colaboração com os pares",
  "criteriaWeight": 0.2
}
```
- **Output Esperado — Sucesso (`201 Created`):**
```json
{
  "criterionId": "f3333333-3333-3333-3333-333333333333",
  "criteriaName": "Trabalho em Equipe",
  "criteriaDescription": "Colaboração com os pares",
  "criteriaWeight": 0.2,
  "status": "ACTIVE"
}
```

---

#### 6.4. Atualizar Pesos dos Critérios da Tabela (Apenas Tutor Dono)
> **Atenção:** Critérios da tabela que forem **omitidos** desta lista serão **removidos** da tabela! E a soma dos pesos enviados deve ser `1.0`.
- **Método e URL:** `PUT {{baseUrl}}/api/v1/performance-tables/{{tableId}}/criteria/weights`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):**
```json
{
  "weights": [
    {
      "criterionId": "{{criterion1Id}}",
      "criteriaWeight": 0.5
    },
    {
      "criterionId": "{{criterion2Id}}",
      "criteriaWeight": 0.5
    }
  ]
}
```
- **Output Esperado — Sucesso (`200 OK`):** Objeto `PerformanceTableResponse` atualizado.

---

#### 6.5. Remover um Critério da Tabela (Apenas Tutor Dono)
> **Regra:** Não é permitido remover o último critério restante (retornará `422 Unprocessable Entity`). Ao remover um critério, os pesos dos restantes são re-normalizados para somar `1.0`.
- **Método e URL:** `DELETE {{baseUrl}}/api/v1/performance-tables/{{tableId}}/criteria/{{criterion2Id}}`
- **Headers:** `Authorization: Bearer {{tutorToken}}`
- **Output Esperado — Sucesso (`204 No Content`):** Sem corpo de resposta.

---

### 🗓️ MÓDULO 7: Sessões — Chamada/Frequência e Papéis (`AttendanceController` US08 & `SessionRoleAssignmentController` US10)

> ⚠️ **Pré-requisito de Banco/Seed para `sessionId`:**
> Ainda não há um endpoint HTTP `POST /sessions` no backend para criar uma `TutoringSession` (ela é criada via banco ou via endpoint de seed E2E).
> - **Se estiver usando `docker-compose.yml` (porta 8080)**, execute este comando único no terminal para criar uma sessão vinculada ao seu `{{problemId}}` e retornar o `sessionId`:
>   ```powershell
>   docker exec -it avalia_postgres psql -U tfs_user -d tfs_test -c "INSERT INTO tutoring_sessions (id, problem_id) SELECT gen_random_uuid(), id FROM problems LIMIT 1 RETURNING id, problem_id;"
>   ```
> - **Se estiver usando `docker-compose.e2e.yml` (porta 8081)**, basta chamar `POST http://localhost:8081/api/e2e/seed` no Postman e copiar o `E2E_SESSION_ID`.

#### 7.1. Registrar ou Atualizar Presença de Aluno na Sessão (US08 — Apenas Tutor Dono)
- **Método e URL:** `PUT {{baseUrl}}/api/v1/sessions/{{sessionId}}/attendances/{{studentId}}`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Valores aceitos para `status`:**
  - `"PRESENT"` (Presente)
  - `"ABSENT"` (Falta)
  - `"LATE"` (Atrasado)
  - `"JUSTIFIED_ABSENCE"` (Falta Justificada)
- **Input (Body - raw JSON):**
```json
{
  "status": "PRESENT"
}
```
- **Output Esperado — Sucesso (`200 OK`):**
```json
{
  "id": "a9b8c7d6-0000-1111-2222-333344445555",
  "sessionId": "77777777-8888-9999-aaaa-bbbbcccccccc",
  "studentId": "11111111-2222-3333-4444-555555555551",
  "studentName": "Ana Aluna",
  "status": "PRESENT",
  "recordedAt": "2026-10-21T19:25:10.123456Z"
}
```
*(Dica de teste: se você enviar o mesmo `status` novamente, o `recordedAt` permanece idêntico garantindo idempotência; se mudar para `"LATE"`, o `recordedAt` é atualizado).*

---

#### 7.2. Atribuir Papel e Nota Extra na Sessão (US10 — Apenas Tutor Dono)
- **Método e URL:** `PUT {{baseUrl}}/api/v1/sessions/{{sessionId}}/roles/{role}`
  - Substitua `{role}` na URL por um dos 3 valores:
    - `COORDINATOR` (Coordenador)
    - `BOARD_SECRETARY` (Secretário de Quadro)
    - `TABLE_SECRETARY` (Secretário de Mesa)
  - Exemplo: `PUT {{baseUrl}}/api/v1/sessions/{{sessionId}}/roles/COORDINATOR`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):** *(`extraGrade` deve ser entre `0.0` e `10.0`)*
```json
{
  "studentId": "{{studentId}}",
  "extraGrade": 1.0
}
```
- **Output Esperado — Sucesso (`201 Created`):**
```json
{
  "id": "99998888-7777-6666-5555-444433332222",
  "sessionId": "77777777-8888-9999-aaaa-bbbbcccccccc",
  "studentId": "11111111-2222-3333-4444-555555555551",
  "studentName": "Ana Aluna",
  "role": "COORDINATOR",
  "extraGrade": 1.0
}
```
- **Outputs de Erro Possíveis:**
  - `422 Unprocessable Entity`: `"Este papel já foi atribuído a outro aluno nesta sessão."` ou `"Este aluno já possui um papel nesta sessão."`
  - `400 Bad Request`: `"O aluno não possui vínculo ativo com a sala informada"`

---

### 📝 MÓDULO 8: Liberação, Autoavaliação, Avaliação por Pares e Ajuste de Nota (US12, US13, US14, US15)

#### 8.1. Liberar / Bloquear Autoavaliação do Problema (US12 — Tutor)
> **Nota:** Funciona como um interruptor (*toggle*). Como o problema nasce com `selfAssessmentReleased = false`, a **1ª chamada libera (`true`)** e uma **2ª chamada bloqueia (`false`)**.
- **Método e URL:** `PATCH {{baseUrl}}/api/v1/problems/{{problemId}}/self-assessment-release`
- **Headers:** `Authorization: Bearer {{tutorToken}}`
- **Input (Body):** *Vazio (sem body)*
- **Output Esperado — Sucesso (`200 OK`):** Sem corpo de resposta.

---

#### 8.2. Liberar / Bloquear Avaliação por Pares do Problema (US12 — Tutor)
> **Nota:** Também funciona como *toggle*. A **1ª chamada libera (`true`)**.
- **Método e URL:** `PATCH {{baseUrl}}/api/v1/problems/{{problemId}}/peer-assessment-release`
- **Headers:** `Authorization: Bearer {{tutorToken}}`
- **Input (Body):** *Vazio (sem body)*
- **Output Esperado — Sucesso (`200 OK`):** Sem corpo de resposta.

---

#### 8.3. Enviar Autoavaliação (US13 — Aluno)
> **Pré-requisito:** A autoavaliação precisa estar liberada pelo Tutor (passo 8.1), caso contrário retornará `403 Forbidden`.
- **Método e URL:** `POST {{baseUrl}}/api/v1/problems/{{problemId}}/self-assessment`
- **Headers:**
  - `Authorization: Bearer {{studentToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):** *(`score` entre `0` e `10`, `comment` obrigatório)*
```json
{
  "score": 8.5,
  "comment": "Estudei todas as referências e participei ativamente da abertura e fechamento do problema."
}
```
- **Output Esperado — Sucesso (`201 Created`):** Sem corpo de resposta.

---

#### 8.4. Enviar Avaliação por Pares (US14 — Aluno)
> **Pré-requisitos:**
> 1. Avaliação por pares liberada pelo Tutor (passo 8.2).
> 2. O aluno avaliador (`studentId`) e o colega avaliado (`student2Id`) devem estar vinculados à mesma equipe (`team_id` na tabela `room_members`).
>    - Caso esteja testando no container padrão (`avalia_postgres`), vincule os membros da sala a uma equipe com o comando:
>      ```powershell
>      docker exec -it avalia_postgres psql -U tfs_user -d tfs_test -c "WITH new_team AS (INSERT INTO teams (id, name, room_id) SELECT gen_random_uuid(), 'Equipe 1', id FROM rooms LIMIT 1 RETURNING id, room_id) UPDATE room_members SET team_id = new_team.id FROM new_team WHERE room_members.room_id = new_team.room_id;"
>      ```

- **Método e URL:** `POST {{baseUrl}}/api/v1/problems/{{problemId}}/peer-assessments`
- **Headers:**
  - `Authorization: Bearer {{studentToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):** *(Deve ser um **Array JSON** `List<AssessmentRequest>`; não pode avaliar a si mesmo)*
```json
[
  {
    "targetId": "{{student2Id}}",
    "score": 9.0,
    "comment": "Bruno trouxe ótimos diagramas e colaborou muito com o grupo."
  }
]
```
- **Output Esperado — Sucesso (`201 Created`):** Sem corpo de resposta.
- **Outputs de Erro Possíveis:**
  - `400 Bad Request`: `"Cannot peer-evaluate yourself"`
  - `403 Forbidden`: `"You do not have permission to perform this operation"` (Quando a avaliação por pares está fechada ou os alunos não estão na mesma equipe).

---

#### 8.5. Ajustar / Moderar Nota de Avaliação (US15 — Apenas Tutor Dono)
> **Como obter o `{{assessmentId}}`:**
> - Se estiver no modo padrão (`8080`), consulte o ID da avaliação criada no passo 8.3 ou 8.4 rodando:
>   ```powershell
>   docker exec -it avalia_postgres psql -U tfs_user -d tfs_test -c "SELECT id, score, comment FROM assessments;"
>   ```
> - Se estiver no modo E2E (`8081`), o endpoint `/api/e2e/seed` já retorna `E2E_ASSESSMENT_ID`.

- **Método e URL:** `PATCH {{baseUrl}}/api/v1/assessments/{{assessmentId}}/grade-adjustment`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):** *(`adjustedGrade` entre `0` e `10`, `justification` obrigatória)*
```json
{
  "adjustedGrade": 9.2,
  "justification": "O aluno demonstrou excelente domínio prático além do relatado na autoavaliação."
}
```
- **Output Esperado — Sucesso (`200 OK`):**
```json
{
  "assessmentId": "33334444-5555-6666-7777-88889999aaaa",
  "originalGrade": 8.5,
  "adjustedGrade": 9.2,
  "justification": "O aluno demonstrou excelente domínio prático além do relatado na autoavaliação.",
  "modifiedByTutor": true
}
```
*(Dica: Se você ajustar novamente a mesma avaliação para `9.5`, o campo `originalGrade` continuará preservando `8.5` para auditoria!).*

---

### 💬 MÓDULO 9: Envio e Consulta de Feedbacks (`FeedbackController` US16 & `FeedbackRetrievalController` US17)

#### 9.1. Enviar Feedback Individual para um Aluno (US16 — Apenas Tutor Dono)
- **Método e URL:** `POST {{baseUrl}}/api/v1/problems/{{problemId}}/feedbacks`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):** *(`grade` entre `0` e `10`, `text` obrigatório, `studentId` deve ser membro ativo da sala)*
```json
{
  "studentId": "{{studentId}}",
  "grade": 9.5,
  "text": "Excelente condução como coordenadora na sessão de fechamento."
}
```
- **Output Esperado — Sucesso (`201 Created`):**
```json
{
  "id": "12345678-aaaa-bbbb-cccc-1234567890ab",
  "problemId": "d1e2f3a4-5555-6666-7777-888899990000",
  "studentId": "11111111-2222-3333-4444-555555555551",
  "grade": 9.5,
  "text": "Excelente condução como coordenadora na sessão de fechamento."
}
```

---

#### 9.2. Enviar Feedbacks em Lote / Batch (US16 — Apenas Tutor Dono)
> **Nota:** O envio em lote é **atômico** — se qualquer item da lista for inválido ou tiver um aluno fora da sala, nenhum feedback do lote é salvo (`400 Bad Request`).
- **Método e URL:** `POST {{baseUrl}}/api/v1/problems/{{problemId}}/feedbacks/batch`
- **Headers:**
  - `Authorization: Bearer {{tutorToken}}`
  - `Content-Type: application/json`
- **Input (Body - raw JSON):**
```json
{
  "feedbacks": [
    {
      "studentId": "{{studentId}}",
      "grade": 9.0,
      "text": "Ótima síntese teórica no fechamento."
    },
    {
      "studentId": "{{student2Id}}",
      "grade": 8.5,
      "text": "Boa participação, pode aprofundar mais nas referências."
    }
  ]
}
```
- **Output Esperado — Sucesso (`201 Created`):**
```json
[
  {
    "id": "22345678-aaaa-bbbb-cccc-1234567890ab",
    "problemId": "d1e2f3a4-5555-6666-7777-888899990000",
    "studentId": "11111111-2222-3333-4444-555555555551",
    "grade": 9.0,
    "text": "Ótima síntese teórica no fechamento."
  },
  {
    "id": "32345678-aaaa-bbbb-cccc-1234567890ab",
    "problemId": "d1e2f3a4-5555-6666-7777-888899990000",
    "studentId": "11111111-2222-3333-4444-555555555552",
    "grade": 8.5,
    "text": "Boa participação, pode aprofundar mais nas referências."
  }
]
```

---

#### 9.3. Listar Feedbacks de um Aluno (US17 — Aluno dono ou Tutor emissor)
> **Segurança:** Apenas o próprio aluno (`{{studentToken}}`) ou o tutor que enviou os feedbacks (`{{tutorToken}}`) podem acessar esta rota. Se outro aluno (`{{student2Token}}`) tentar ler os feedbacks de `{{studentId}}`, receberá `403 Forbidden`.
- **Método e URL:** `GET {{baseUrl}}/api/v1/students/{{studentId}}/feedbacks?page=0&size=20`
- **Headers:** `Authorization: Bearer {{studentToken}}` (ou `{{tutorToken}}`)
- **Output Esperado — Sucesso (`200 OK`):**
```json
{
  "content": [
    {
      "tutorName": "Prof. Carlos Tutor",
      "problemTitle": "Problema 01 - Arquitetura Limpa e Hexagonal",
      "grade": 9.0,
      "text": "Ótima síntese teórica no fechamento.",
      "createdAt": "2026-10-21T19:30:00.123456Z"
    },
    {
      "tutorName": "Prof. Carlos Tutor",
      "problemTitle": "Problema 01 - Arquitetura Limpa e Hexagonal",
      "grade": 9.5,
      "text": "Excelente condução como coordenadora na sessão de fechamento.",
      "createdAt": "2026-10-21T19:29:15.123456Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 2,
  "totalPages": 1
}
```

---

### ⚡ BÔNUS: Endpoint de Seed Automático (Apenas Modo E2E na porta `8081`)

Se você subiu o ambiente com `docker compose -f docker-compose.e2e.yml up --build -d`:

- **Método e URL:** `POST http://localhost:8081/api/e2e/seed`
- **Autenticação:** Pública
- **Output Esperado (`201 Created`):**
```json
{
  "E2E_USER_ID": "0192b0...",
  "E2E_TUTOR_ID": "0192b0...",
  "E2E_TUTOR_NAME": "Tutora E2E a1b2c3d4",
  "E2E_OTHER_TUTOR_ID": "0192b0...",
  "E2E_ROOM_ID": "0192b0...",
  "E2E_PROBLEM_ID": "0192b0...",
  "E2E_SESSION_ID": "0192b0...",
  "E2E_PERFORMANCE_TABLE_ID": "0192b0...",
  "E2E_ASSESSMENT_ID": "0192b0...",
  "E2E_ORIGINAL_GRADE": "7.0",
  "E2E_STUDENT_ID": "0192b0...",
  "E2E_STUDENT_NAME": "Ana E2E a1b2c3d4",
  "E2E_OTHER_STUDENT_ID": "0192b0...",
  "E2E_OTHER_STUDENT_NAME": "Bruno E2E a1b2c3d4"
}
```
> No modo E2E (`8081`), em vez de `Authorization: Bearer ...`, basta enviar o header **`X-User-Id`** com o valor de `E2E_TUTOR_ID` (para agir como tutor) ou `E2E_STUDENT_ID` (para agir como aluno)!
