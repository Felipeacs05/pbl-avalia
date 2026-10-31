# Documentação do Sistema AvaliaSystem (PBL)

Bem-vindo à documentação oficial da API e da arquitetura do projeto **AvaliaSystem** — Sistema de Gestão e Avaliação para Aprendizagem Baseada em Problemas (PBL) da UEFS.

---

## 📁 Estrutura desta Documentação

Esta pasta reúne todo o mapeamento técnico necessário para conectar e sincronizar perfeitamente o **Frontend (Next.js / TypeScript)** com o **Backend (Spring Boot / Java)**:

1. 📄 **[endpoints-api.md](./endpoints-api.md)**  
   *Especificação Completa dos Endpoints da API REST:* Contém todos os 15 controladores, rotas, verbos HTTP, headers obrigatórios, estruturas JSON de envio (request body) e de resposta (response body), códigos de status HTTP e regras de autorização/segurança.

2. 📄 **[analise-mocks-frontend.md](./analise-mocks-frontend.md)**  
   *Auditoria de Conformidade Frontend vs. Backend:* Análise detalhada respondendo se os mocks e serviços do front-end estão condizentes com o backend real, apontando divergências em rotas, payloads, campos e endpoints pendentes.

---

## 🏛️ Visão Geral da Arquitetura

O sistema adota uma arquitetura em camadas desacopladas:

```
[ Frontend: Next.js + React + TypeScript ]
                 │
                 │ HTTP / REST (JSON & Multipart)
                 │ Cabeçalho: Authorization: Bearer <JWT>
                 ▼
[ Backend: Spring Boot 3 + Spring Security + OAuth2 Resource Server ]
                 │
                 │ JPA / Hibernate
                 ▼
[ Banco de Dados: PostgreSQL ]
```

### Tecnologias do Backend
- **Java 17+ / Spring Boot 3**
- **Spring Security & OAuth2 Resource Server (JWT)**
- **Spring Data JPA & Hibernate**
- **Bean Validation (Jakarta Validation)**
- **Swagger / OpenAPI 3** (`/swagger-ui.html`)

### Tecnologias do Frontend
- **Next.js 14 / React**
- **TypeScript**
- **Tailwind CSS / Vanilla CSS**
- **Axios & Fetch API** para comunicação HTTP

---

## 🔐 Fluxo de Autenticação e Segurança (JWT)

1. **Registro:** `POST /api/v1/auth/register` (requisição `multipart/form-data` com `@RequestPart("data")` e `@RequestPart("photo")`).
2. **Login:** `POST /api/v1/auth/login` com `{ email, password }`. Retorna `{ token, expiresAt }`.
3. **Persistência no Frontend:** O token JWT retornado deve ser armazenado (geralmente no `localStorage`) e anexado em todas as requisições subsequentes:
   ```http
   Authorization: Bearer <token_jwt>
   ```
4. **Resolução de Identidade:** O backend Spring Security valida a assinatura do token e injeta a identidade do usuário através do Subject (`sub`). Controladores acessam o ID do usuário diretamente via:
   ```java
   UUID userId = UUID.fromString(principal.getName());
   ```
5. **Controle de Acesso em Métodos:** Anotações `@PreAuthorize` garantem que somente o tutor responsável pela sala tenha permissão de criar critérios, ajustar notas, gerenciar grupos e liberar avaliações.

---

## 🚀 Resumo Rápido dos Principais Endpoints

| Módulo | Endpoint Principal | Descrição |
| :--- | :--- | :--- |
| **Autenticação** | `POST /api/v1/auth/login` | Login e emissão de token JWT |
| **Autenticação** | `POST /api/v1/auth/register` | Cadastro com foto de perfil (`multipart`) |
| **Dashboard** | `GET /api/v1/users/me/rooms` | Salas do usuário logado (como tutor e como aluno) |
| **Salas** | `POST /api/v1/rooms` | Criação de turma/sala pelo tutor |
| **Salas** | `POST /api/v1/rooms/join` | Entrada do aluno em uma sala via código de acesso |
| **Carômetro** | `GET /api/v1/rooms/{roomId}/roster` | Listagem paginada de fotos e dados dos alunos da turma |
| **Problemas** | `POST /api/v1/rooms/{roomId}/problems` | Cadastro de novo problema PBL na sala |
| **Grupos** | `POST /api/v1/rooms/{roomId}/groups` | Formação de equipes tutoriais |
| **Critérios** | `PUT /api/v1/performance-tables/{id}/criteria/weights` | Ajuste dos pesos (soma deve ser 1.0) |
| **Presença** | `PUT /api/v1/sessions/{id}/attendances/{studentId}` | Registro de presença (`PRESENT`, `ABSENT`, etc.) |
| **Papéis** | `PUT /api/v1/sessions/{id}/roles/{role}` | Atribuição de Coordenador/Secretários |
| **Liberação** | `PATCH /api/v1/problems/{id}/self-assessment-release` | Abertura/fechamento da autoavaliação (toggle) |
| **Autoavaliação**| `POST /api/v1/problems/{id}/self-assessment` | Envio de nota e comentário pelo aluno |
| **Pares** | `POST /api/v1/problems/{id}/peer-assessments` | Avaliação mútua entre membros do grupo |
| **Ajuste de Nota**| `PATCH /api/v1/assessments/{id}/grade-adjustment` | Modificação de nota com justificativa pelo tutor |
| **Feedbacks** | `POST /api/v1/problems/{id}/feedbacks` | Envio de parecer descritivo e nota para aluno |
| **Feedbacks** | `GET /api/v1/students/{id}/feedbacks` | Histórico de avaliações recebidas pelo aluno |
