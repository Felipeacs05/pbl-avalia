# Especificação Completa dos Endpoints da API REST (Backend)

Este documento detalha todos os endpoints HTTP expostos pelo backend Spring Boot do **AvaliaSystem** (`/api/v1`), com seus métodos, cabeçalhos, parâmetros, corpos de requisição e resposta (JSON), códigos HTTP de status e regras de negócio/autorização.

---

## Índice de Controladores e Recursos

1. [Autenticação e Registro (`/api/v1/auth`)](#1-autenticação-e-registro-apiv1auth)
2. [Dashboard do Usuário (`/api/v1/users/me`)](#2-dashboard-do-usuário-apiv1usersme)
3. [Salas / Turmas (`/api/v1/rooms`)](#3-salas--turmas-apiv1rooms)
4. [Carômetro da Turma (`/api/v1/rooms/{roomId}/roster`)](#4-carômetro-da-turma-apiv1roomsroomidroster)
5. [Problemas PBL (`/api/v1/rooms/{roomId}/problems` e `/api/v1/problems`)](#5-problemas-pbl-apiv1roomsroomidproblems-e-apiv1problems)
6. [Grupos de Alunos (`/api/v1/rooms/{roomId}/groups`)](#6-grupos-de-alunos-apiv1roomsroomidgroups)
7. [Tabelas de Desempenho e Critérios (`/api/v1/performance-tables`)](#7-tabelas-de-desempenho-e-critérios-apiv1performance-tables)
8. [Presença Tutorial (`/api/v1/sessions/{sessionId}/attendances`)](#8-presença-tutorial-apiv1sessionssessionidattendances)
9. [Papéis de Sessão PBL (`/api/v1/sessions/{sessionId}/roles`)](#9-papéis-de-sessão-pbl-apiv1sessionssessionidroles)
10. [Liberação de Avaliações (`/api/v1/problems/{problemId}`)](#10-liberação-de-avaliações-apiv1problemsproblemid)
11. [Autoavaliação do Aluno (`/api/v1/problems/{problemId}/self-assessment`)](#11-autoavaliação-do-aluno-apiv1problemsproblemidself-assessment)
12. [Avaliação de Pares (`/api/v1/problems/{problemId}/peer-assessments`)](#12-avaliação-de-pares-apiv1problemsproblemidpeer-assessments)
13. [Ajuste de Nota pelo Tutor (`/api/v1/assessments/{assessmentId}/grade-adjustment`)](#13-ajuste-de-nota-pelo-tutor-apiv1assessmentsassessmentidgrade-adjustment)
14. [Envio de Feedbacks (`/api/v1/problems/{problemId}/feedbacks`)](#14-envio-de-feedbacks-apiv1problemsproblemidfeedbacks)
15. [Consulta de Feedbacks do Aluno (`/api/v1/students/{studentId}/feedbacks`)](#15-consulta-de-feedbacks-do-aluno-apiv1studentsstudentidfeedbacks)

---

## Convenções Globais

- **URL Base:** `http://localhost:8080` (padrão local) ou variável de ambiente.
- **Autenticação:** Todas as rotas (exceto `/api/v1/auth/login` e `/api/v1/auth/register`) exigem o cabeçalho:
  ```http
  Authorization: Bearer <token_jwt>
  ```
- **Identificação do Usuário:** O backend extrai o ID do usuário diretamente do claim `sub` (Subject) do token JWT assinado (`Principal.getName()`).
- **Formato Padrão de Dados:** `application/json` (com exceção do cadastro que utiliza `multipart/form-data`).
- **IDs:** Todos os identificadores no sistema são representados por Strings no formato `UUID` v4.

---

## 1. Autenticação e Registro (`/api/v1/auth`)

### 1.1 Cadastrar Novo Usuário
- **Método / Rota:** `POST /api/v1/auth/register`
- **Autenticação:** Pública (não requer token)
- **Content-Type:** `multipart/form-data`
- **Partes da Requisição (`Multipart`):**
  1. `data` (JSON, Obrigatório): Objeto `RegisterUserRequest`
  2. `photo` (Arquivo Binário, Opcional): Imagem de perfil do usuário (`MultipartFile`)

**Exemplo de Envio em JSON da parte `data`:**
```json
{
  "name": "Maria Silva",
  "email": "maria@uefs.br",
  "password": "SenhaSegura123",
  "profilePictureUrl": null
}
```
*(Também aceita os alias em português: `nome`, `senha`, `fotoUrl`)*

**Resposta Sucesso:** `201 Created`
- Header: `Location: /api/v1/users/{userId}`
- Body:
```json
{
  "id": "c1f2e4b0-8f20-42f8-958b-944a1fa33f91",
  "name": "Maria Silva",
  "email": "maria@uefs.br",
  "profilePictureUrl": "/uploads/c1f2e4b0-8f20-42f8-958b-944a1fa33f91.png"
}
```

**Erros Comuns:**
- `400 Bad Request`: Validação de dados (e-mail inválido, senha em branco, nome contendo caracteres proibidos `<` ou `>`) ou e-mail já existente.

---

### 1.2 Realizar Login
- **Método / Rota:** `POST /api/v1/auth/login`
- **Autenticação:** Pública
- **Content-Type:** `application/json`

**Corpo da Requisição:**
```json
{
  "email": "maria@uefs.br",
  "password": "SenhaSegura123"
}
```

**Resposta Sucesso:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1740000000000
}
```
> **Atenção:** O backend **NÃO** retorna o objeto `user` dentro do corpo de login. O token JWT retornado contém o ID do usuário como Subject (`sub`). O frontend deve salvar o token no `localStorage` e enviá-lo nas próximas requisições.

**Erros Comuns:**
- `401 Unauthorized`: Credenciais incorretas (e-mail ou senha inválidos).

---

## 2. Dashboard do Usuário (`/api/v1/users/me`)

### 2.1 Obter Salas do Usuário Logado
- **Método / Rota:** `GET /api/v1/users/me/rooms`
- **Autenticação:** Requer Token JWT
- **Descrição:** Retorna as salas onde o usuário autenticado atua como Tutor e as salas onde está matriculado como Aluno.

**Resposta Sucesso:** `200 OK`
```json
{
  "roomsAsTutor": [
    {
      "id": "e22a84a6-1234-4b55-a8cd-112233445566",
      "name": "Circuitos Digitais",
      "accessCode": "TEC498",
      "tutorId": "c1f2e4b0-8f20-42f8-958b-944a1fa33f91"
    }
  ],
  "roomsAsStudent": [
    {
      "id": "f55b99a6-5678-4c66-b9ef-998877665544",
      "name": "Sistemas Digitais",
      "accessCode": "TEC499",
      "tutorId": "a77c33d1-9988-4e12-b345-001122334455"
    }
  ]
}
```

---

## 3. Salas / Turmas (`/api/v1/rooms`)

### 3.1 Criar Sala
- **Método / Rota:** `POST /api/v1/rooms`
- **Autenticação:** Requer Token JWT (o criador se torna o Tutor responsável)
- **Corpo da Requisição:**
```json
{
  "name": "Estruturas de Dados e Algoritmos"
}
```
**Resposta Sucesso:** `201 Created`
```json
{
  "id": "e22a84a6-1234-4b55-a8cd-112233445566",
  "name": "Estruturas de Dados e Algoritmos",
  "code": "EDA001",
  "joinLink": "app/join/EDA001"
}
```

### 3.2 Atualizar Sala
- **Método / Rota:** `PUT /api/v1/rooms/{id}`
- **Permissão:** Apenas o Tutor criador da sala (`@roomSecurity.isOwner`)
- **Corpo da Requisição:**
```json
{
  "name": "Estruturas de Dados II"
}
```
**Resposta Sucesso:** `200 OK`
```json
{
  "id": "e22a84a6-1234-4b55-a8cd-112233445566",
  "name": "Estruturas de Dados II",
  "code": "EDA001",
  "joinLink": "app/join/EDA001"
}
```

### 3.3 Excluir Sala
- **Método / Rota:** `DELETE /api/v1/rooms/{id}`
- **Permissão:** Apenas o Tutor criador da sala
- **Resposta Sucesso:** `204 No Content`

### 3.4 Listar Salas do Usuário
- **Método / Rota:** `GET /api/v1/rooms`
- **Resposta Sucesso:** `200 OK`
```json
[
  {
    "id": "e22a84a6-1234-4b55-a8cd-112233445566",
    "name": "Estruturas de Dados II",
    "code": "EDA001",
    "joinLink": "app/join/EDA001"
  }
]
```

### 3.5 Listar Membros da Sala
- **Método / Rota:** `GET /api/v1/rooms/{roomId}/members`
- **Permissão:** Membro ou Tutor da sala
- **Resposta Sucesso:** `200 OK`
```json
[
  {
    "id": "c1f2e4b0-8f20-42f8-958b-944a1fa33f91",
    "name": "Maria Silva",
    "role": "TUTOR"
  },
  {
    "id": "890a12b3-45c6-78d9-e012-3456789abcde",
    "name": "João Pereira",
    "role": "STUDENT"
  }
]
```

### 3.6 Entrar na Sala via Código (JSON)
- **Método / Rota:** `POST /api/v1/rooms/join`
- **Corpo da Requisição:**
```json
{
  "accessCode": "EDA001"
}
```
- **Resposta Sucesso:** `200 OK` (retorna o `RoomResponse`)

### 3.7 Entrar na Sala via Link (Path)
- **Método / Rota:** `POST /api/v1/rooms/join/{code}`
- **Resposta Sucesso:** `200 OK` (retorna o `RoomResponse`)

---

## 4. Carômetro da Turma (`/api/v1/rooms/{roomId}/roster`)

### 4.1 Consultar Carômetro Paginado
- **Método / Rota:** `GET /api/v1/rooms/{roomId}/roster?page=0&size=20`
- **Permissão:** Apenas o Tutor da sala (`@roomSecurity.isOwner`)
- **Query Params:**
  - `page`: Número da página (iniciando em 0, default 0)
  - `size`: Tamanho da página (default 20)

**Resposta Sucesso:** `200 OK`
```json
{
  "content": [
    {
      "id": "890a12b3-45c6-78d9-e012-3456789abcde",
      "name": "Ana Beatriz Souza",
      "profileImageUrl": "/uploads/ana.jpg",
      "initials": "AS"
    },
    {
      "id": "901b23c4-56d7-89e0-f123-456789abcdef",
      "name": "Bruno Costa",
      "profileImageUrl": null,
      "initials": "BC"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 38,
  "totalPages": 2
}
```

---

## 5. Problemas PBL (`/api/v1/rooms/{roomId}/problems` e `/api/v1/problems`)

### 5.1 Criar Problema na Sala
- **Método / Rota:** `POST /api/v1/rooms/{roomId}/problems`
- **Autenticação:** Requer Token JWT do Tutor
- **Corpo da Requisição:**
```json
{
  "title": "Problema 1: Aquecimento Global e Sensores IoT"
}
```
**Resposta Sucesso:** `201 Created`
```json
{
  "id": "11112222-3333-4444-5555-666677778888",
  "title": "Problema 1: Aquecimento Global e Sensores IoT"
}
```

### 5.2 Listar Problemas da Sala
- **Método / Rota:** `GET /api/v1/rooms/{roomId}/problems`
- **Resposta Sucesso:** `200 OK`
```json
[
  {
    "id": "11112222-3333-4444-5555-666677778888",
    "title": "Problema 1: Aquecimento Global e Sensores IoT"
  }
]
```

### 5.3 Atualizar Problema
- **Método / Rota:** `PUT /api/v1/problems/{id}`
- **Corpo da Requisição:**
```json
{
  "title": "Problema 1: Sensores IoT e Monitoramento Climático"
}
```
**Resposta Sucesso:** `200 OK`

### 5.4 Excluir Problema
- **Método / Rota:** `DELETE /api/v1/problems/{id}`
- **Resposta Sucesso:** `204 No Content`

---

## 6. Grupos de Alunos (`/api/v1/rooms/{roomId}/groups`)

### 6.1 Criar Grupo
- **Método / Rota:** `POST /api/v1/rooms/{roomId}/groups`
- **Permissão:** Apenas Tutor da sala
- **Corpo da Requisição:**
```json
{
  "name": "Grupo Alpha",
  "memberIds": [
    "890a12b3-45c6-78d9-e012-3456789abcde",
    "901b23c4-56d7-89e0-f123-456789abcdef"
  ]
}
```
**Resposta Sucesso:** `201 Created`
```json
{
  "id": "33334444-5555-6666-7777-888899990000",
  "name": "Grupo Alpha",
  "roomId": "e22a84a6-1234-4b55-a8cd-112233445566",
  "members": [
    {
      "name": "Ana Beatriz Souza",
      "id": "890a12b3-45c6-78d9-e012-3456789abcde"
    },
    {
      "name": "Bruno Costa",
      "id": "901b23c4-56d7-89e0-f123-456789abcdef"
    }
  ]
}
```

### 6.2 Listar Grupos da Sala
- **Método / Rota:** `GET /api/v1/rooms/{roomId}/groups`
- **Permissão:** Membro ou Tutor
- **Resposta Sucesso:** `200 OK` (retorna `List<GroupResponse>`)

### 6.3 Atualizar Grupo
- **Método / Rota:** `PATCH /api/v1/rooms/{roomId}/groups/{groupId}`
- **Permissão:** Tutor
- **Corpo da Requisição:**
```json
{
  "name": "Grupo Alpha (Renomeado)",
  "memberIds": ["890a12b3-45c6-78d9-e012-3456789abcde"]
}
```
**Resposta Sucesso:** `200 OK`

### 6.4 Excluir Grupo
- **Método / Rota:** `DELETE /api/v1/rooms/{roomId}/groups/{groupId}`
- **Permissão:** Tutor
- **Resposta Sucesso:** `204 No Content`

### 6.5 Adicionar Aluno ao Grupo
- **Método / Rota:** `POST /api/v1/rooms/{roomId}/groups/{groupId}/members`
- **Permissão:** Tutor
- **Corpo da Requisição:**
```json
{
  "studentId": "901b23c4-56d7-89e0-f123-456789abcdef"
}
```
**Resposta Sucesso:** `201 Created` (retorna o `GroupResponse` atualizado)

### 6.6 Remover Aluno do Grupo
- **Método / Rota:** `DELETE /api/v1/rooms/{roomId}/groups/{groupId}/members/{studentId}`
- **Permissão:** Tutor
- **Resposta Sucesso:** `204 No Content`

### 6.7 Consultar Meu Grupo (Visão do Aluno)
- **Método / Rota:** `GET /api/v1/rooms/{roomId}/groups/me`
- **Resposta Sucesso:** `200 OK` (retorna o `GroupResponse` do aluno logado)

### 6.8 Listar Alunos Disponíveis (Sem Grupo)
- **Método / Rota:** `GET /api/v1/rooms/{roomId}/groups/available-students`
- **Permissão:** Tutor
- **Resposta Sucesso:** `200 OK`
```json
[
  {
    "name": "Carlos Eduardo",
    "id": "789a12b3-1111-2222-3333-444455556666"
  }
]
```

---

## 7. Tabelas de Desempenho e Critérios (`/api/v1/performance-tables`)

### 7.1 Criar Tabela de Desempenho
- **Método / Rota:** `POST /api/v1/performance-tables`
- **Corpo da Requisição:**
```json
{
  "roomId": "e22a84a6-1234-4b55-a8cd-112233445566",
  "tableName": "Tabela Padrão PBL",
  "criteriaList": [
    {
      "criteriaName": "Conteúdo e Domínio Conceitual",
      "criteriaDescription": "Demonstração de conhecimento técnico",
      "criteriaWeight": 0.4
    },
    {
      "criteriaName": "Participação e Colaboração",
      "criteriaDescription": "Engajamento nos debates do grupo",
      "criteriaWeight": 0.3
    },
    {
      "criteriaName": "Autoavaliação e Postura Ética",
      "criteriaDescription": "Capacidade reflexiva e pontualidade",
      "criteriaWeight": 0.3
    }
  ]
}
```
**Resposta Sucesso:** `201 Created`
```json
{
  "performanceTableId": "771a3400-e29b-41d4-b825-112233445566",
  "roomId": "e22a84a6-1234-4b55-a8cd-112233445566",
  "tableName": "Tabela Padrão PBL",
  "status": "ACTIVE",
  "criteriaList": [
    {
      "criterionId": "881a3400-e29b-41d4-b825-112233445561",
      "criteriaName": "Conteúdo e Domínio Conceitual",
      "criteriaDescription": "Demonstração de conhecimento técnico",
      "criteriaWeight": 0.4,
      "status": "ACTIVE"
    },
    {
      "criterionId": "881a3400-e29b-41d4-b825-112233445562",
      "criteriaName": "Participação e Colaboração",
      "criteriaDescription": "Engajamento nos debates do grupo",
      "criteriaWeight": 0.3,
      "status": "ACTIVE"
    },
    {
      "criterionId": "881a3400-e29b-41d4-b825-112233445563",
      "criteriaName": "Autoavaliação e Postura Ética",
      "criteriaDescription": "Capacidade reflexiva e pontualidade",
      "criteriaWeight": 0.3,
      "status": "ACTIVE"
    }
  ]
}
```

### 7.2 Consultar Tabela de Desempenho
- **Método / Rota:** `GET /api/v1/performance-tables/{id}`
- **Resposta Sucesso:** `200 OK` (retorna `PerformanceTableResponse`)

### 7.3 Atualizar Pesos dos Critérios
- **Método / Rota:** `PUT /api/v1/performance-tables/{performanceTableId}/criteria/weights`
- **Permissão:** Tutor responsável (`@performanceTableSecurity.isOwner`)
- **Regra de Negócio:** A soma exata de todos os `criteriaWeight` deve ser igual a 1.0 (100%). Critérios omitidos são removidos.
- **Corpo da Requisição:**
```json
{
  "weights": [
    {
      "criterionId": "881a3400-e29b-41d4-b825-112233445561",
      "criteriaWeight": 0.5
    },
    {
      "criterionId": "881a3400-e29b-41d4-b825-112233445562",
      "criteriaWeight": 0.3
    },
    {
      "criterionId": "881a3400-e29b-41d4-b825-112233445563",
      "criteriaWeight": 0.2
    }
  ]
}
```
**Resposta Sucesso:** `200 OK` (retorna `PerformanceTableResponse`)
**Erros:** `422 Unprocessable Entity` se a soma for diferente de 1.0; `403 Forbidden` se não for o tutor.

### 7.4 Adicionar Novo Critério
- **Método / Rota:** `POST /api/v1/performance-tables/{performanceTableId}/criteria`
- **Permissão:** Tutor responsável
- **Corpo da Requisição:**
```json
{
  "criteriaName": "Comunicação Oral",
  "criteriaDescription": "Clareza na apresentação das ideias",
  "criteriaWeight": 0.0
}
```
**Resposta Sucesso:** `201 Created`

### 7.5 Remover Critério
- **Método / Rota:** `DELETE /api/v1/performance-tables/{performanceTableId}/criteria/{criterionId}`
- **Permissão:** Tutor responsável
- **Resposta Sucesso:** `204 No Content`

---

## 8. Presença Tutorial (`/api/v1/sessions/{sessionId}/attendances`)

### 8.1 Registrar ou Atualizar Presença de Aluno
- **Método / Rota:** `PUT /api/v1/sessions/{sessionId}/attendances/{studentId}`
- **Autenticação:** Tutor da sessão
- **Valores Permitidos para `status`:**
  - `PRESENT` (Presente)
  - `ABSENT` (Ausente)
  - `LATE` (Atrasado)
  - `JUSTIFIED_ABSENCE` (Falta justificada)

**Corpo da Requisição:**
```json
{
  "status": "PRESENT"
}
```
**Resposta Sucesso:** `200 OK`
```json
{
  "id": "99998888-7777-6666-5555-444433332222",
  "sessionId": "44445555-6666-7777-8888-999900001111",
  "studentId": "890a12b3-45c6-78d9-e012-3456789abcde",
  "studentName": "Ana Beatriz Souza",
  "status": "PRESENT",
  "recordedAt": "2026-10-27T20:30:00Z"
}
```

---

## 9. Papéis de Sessão PBL (`/api/v1/sessions/{sessionId}/roles`)

### 9.1 Atribuir Papel da Sessão a Aluno
- **Método / Rota:** `PUT /api/v1/sessions/{sessionId}/roles/{role}`
- **Valores Permitidos para `{role}`:**
  - `COORDINATOR` (Coordenador)
  - `BOARD_SECRETARY` (Secretário da Mesa)
  - `TABLE_SECRETARY` (Secretário do Quadro)
- **Corpo da Requisição:**
```json
{
  "studentId": "890a12b3-45c6-78d9-e012-3456789abcde",
  "extraGrade": 0.5
}
```
> `extraGrade` deve estar entre `0.0` e `10.0`.

**Resposta Sucesso:** `201 Created`
```json
{
  "id": "12345678-9abc-def0-1234-56789abcdef0",
  "sessionId": "44445555-6666-7777-8888-999900001111",
  "studentId": "890a12b3-45c6-78d9-e012-3456789abcde",
  "studentName": "Ana Beatriz Souza",
  "role": "COORDINATOR",
  "extraGrade": 0.5
}
```
**Erros Comuns:** `422 Unprocessable Entity` se o papel já estiver atribuído a outro aluno na mesma sessão.

---

## 10. Liberação de Avaliações (`/api/v1/problems/{problemId}`)

### 10.1 Alternar Liberação de Autoavaliação (Toggle)
- **Método / Rota:** `PATCH /api/v1/problems/{problemId}/self-assessment-release`
- **Permissão:** Tutor responsável
- **Corpo:** Vazio
- **Resposta Sucesso:** `200 OK` (sem corpo)

### 10.2 Alternar Liberação de Avaliação de Pares (Toggle)
- **Método / Rota:** `PATCH /api/v1/problems/{problemId}/peer-assessment-release`
- **Permissão:** Tutor responsável
- **Corpo:** Vazio
- **Resposta Sucesso:** `200 OK` (sem corpo)

---

## 11. Autoavaliação do Aluno (`/api/v1/problems/{problemId}/self-assessment`)

### 11.1 Enviar Autoavaliação
- **Método / Rota:** `POST /api/v1/problems/{problemId}/self-assessment`
- **Autenticação:** Aluno matriculado na sala do problema
- **Regras:** A autoavaliação deve estar liberada pelo tutor.
- **Corpo da Requisição:**
```json
{
  "score": 8.5,
  "comment": "Participei ativamente de todas as discussões e estudei os tópicos antecipadamente."
}
```
> `score`: Número de 0.0 a 10.0. `comment`: Obrigatório, não pode ser vazio.

**Resposta Sucesso:** `201 Created` (sem corpo)

---

## 12. Avaliação de Pares (`/api/v1/problems/{problemId}/peer-assessments`)

### 12.1 Enviar Avaliações dos Colegas do Grupo
- **Método / Rota:** `POST /api/v1/problems/{problemId}/peer-assessments`
- **Autenticação:** Aluno do grupo
- **Regras:** A avaliação de pares deve estar liberada pelo tutor.
- **Corpo da Requisição (Array de avaliações):**
```json
[
  {
    "targetId": "890a12b3-45c6-78d9-e012-3456789abcde",
    "score": 9.0,
    "comment": "Liderou a pesquisa bibliográfica com excelência."
  },
  {
    "targetId": "901b23c4-56d7-89e0-f123-456789abcdef",
    "score": 7.5,
    "comment": "Contribuiu pontualmente mas poderia ter falado mais nas sessões."
  }
]
```
**Resposta Sucesso:** `201 Created` (sem corpo)

---

## 13. Ajuste de Nota pelo Tutor (`/api/v1/assessments/{assessmentId}/grade-adjustment`)

### 13.1 Ajustar Nota de uma Avaliação
- **Método / Rota:** `PATCH /api/v1/assessments/{assessmentId}/grade-adjustment`
- **Permissão:** Tutor responsável pela sala da avaliação
- **Corpo da Requisição:**
```json
{
  "adjustedGrade": 8.0,
  "justification": "Ajustado devido à participação acima da média demonstrada nos relatórios."
}
```
> `adjustedGrade`: [0..10], `justification`: Obrigatória.

**Resposta Sucesso:** `200 OK`
```json
{
  "assessmentId": "55556666-7777-8888-9999-000011112222",
  "originalGrade": 6.5,
  "adjustedGrade": 8.0,
  "justification": "Ajustado devido à participação acima da média demonstrada nos relatórios.",
  "modifiedByTutor": true
}
```

---

## 14. Envio de Feedbacks (`/api/v1/problems/{problemId}/feedbacks`)

### 14.1 Enviar Feedback Individual
- **Método / Rota:** `POST /api/v1/problems/{problemId}/feedbacks`
- **Permissão:** Tutor responsável
- **Corpo da Requisição:**
```json
{
  "studentId": "890a12b3-45c6-78d9-e012-3456789abcde",
  "grade": 8.5,
  "text": "Excelente raciocínio clínico e colaboração no problema."
}
```
**Resposta Sucesso:** `201 Created`
```json
{
  "id": "fe112233-4455-6677-8899-aabbccddeeff",
  "problemId": "11112222-3333-4444-5555-666677778888",
  "studentId": "890a12b3-45c6-78d9-e012-3456789abcde",
  "grade": 8.5,
  "text": "Excelente raciocínio clínico e colaboração no problema."
}
```

### 14.2 Enviar Feedback em Lote (Batch)
- **Método / Rota:** `POST /api/v1/problems/{problemId}/feedbacks/batch`
- **Permissão:** Tutor responsável
- **Corpo da Requisição:**
```json
{
  "feedbacks": [
    {
      "studentId": "890a12b3-45c6-78d9-e012-3456789abcde",
      "grade": 9.0,
      "text": "Excelente participação no problema."
    },
    {
      "studentId": "901b23c4-56d7-89e0-f123-456789abcdef",
      "grade": 7.0,
      "text": "Aprofundar os estudos conceituais para as próximas sessões."
    }
  ]
}
```
**Resposta Sucesso:** `201 Created` (retorna `List<FeedbackResponse>`)

---

## 15. Consulta de Feedbacks do Aluno (`/api/v1/students/{studentId}/feedbacks`)

### 15.1 Obter Histórico de Feedbacks Paginado
- **Método / Rota:** `GET /api/v1/students/{studentId}/feedbacks?page=0&size=20`
- **Permissão:** `@feedbackSecurity.canView(#studentId, authentication)` (o próprio aluno autenticado ou o tutor)
- **Privacidade:** O endpoint omite IDs internos, e-mails ou credenciais sensíveis.

**Resposta Sucesso:** `200 OK`
```json
{
  "content": [
    {
      "tutorName": "Prof. Roberto Oliveira",
      "problemTitle": "Problema 1: Aquecimento Global e Sensores IoT",
      "grade": 8.5,
      "text": "Excelente raciocínio clínico e colaboração no problema.",
      "createdAt": "2026-10-27T19:45:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```
