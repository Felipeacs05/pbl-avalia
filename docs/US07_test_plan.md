# Plano de Testes — US07: CRUD de Tabelas de Desempenho e Critérios

**Projeto:** Avalia-system (PBL)  
**User Story:** US07 — CRUD de Tabelas de Desempenho e Critérios  
**Perfil / Ator:** Tutor da Sala (`Room Tutor`)  
**Responsável:** Engenheiro de QA Sênior  
**Versão:** 1.0  
**Data:** 2026-09-29  

---

## 1. Identificação da User Story e Critérios de Aceite

### 1.1 Descrição da História
* **Como:** Tutor da Sala (`Room Tutor`).
* **Quero:** Criar e editar tabelas contendo critérios de avaliação (ex: Postura, Raciocínio Lógico).
* **Para:** Definir os parâmetros qualitativos que usarei para avaliar os alunos nas sessões tutorais.

### 1.2 Regras de Negócio e Critérios de Aceite
1. Os critérios pertencem obrigatoriamente à tabela de desempenho da sala (`performanceTable`).
2. O tutor da sala deve poder definir quais critérios (`criteriaList`) serão utilizados nas avaliações.
3. Não é permitido criar critérios com nome vazio (`criteriaName = ""`) ou contendo apenas espaços em branco.
4. Não é permitido inserir caracteres especiais não suportados (ex: tags HTML `<script>`, comandos SQL, símbolos de controle).
5. O peso de cada critério (`criteriaWeight`) deve ser um valor numérico positivo.

### 1.3 Requisitos de UX / Frontend
1. A interface deve permitir adicionar e remover critérios dinamicamente na mesma tela.
2. O comportamento da aplicação deve ser de Single Page Application (SPA), garantindo atualização imediata do DOM sem recarregamento da página (*no-reload*).
3. As validações de campos obrigatórios e caracteres inválidos devem bloquear o envio de forma síncrona no frontend, além de serem estritamente validadas pelo backend na API.

---

## 2. Nomenclatura Técnica e Contrato de Dados

### 2.1 Identificadores de Elementos de Interface (Frontend DOM IDs)
* `formPerformanceTable`: Formulário principal de criação e edição da tabela.
* `inputPerformanceTableName`: Campo de texto para o título/nome da tabela.
* `inputCriterionName`: Campo de texto para o nome do critério de avaliação.
* `inputCriterionDescription`: Campo de texto para detalhamento qualitativo do critério.
* `inputCriterionWeight`: Campo numérico para peso ou valor ponderado do critério.
* `btnAddCriterion`: Botão para adicionar o critério na lista dinâmica em tela.
* `btnRemoveCriterion_{criterionId}`: Botão para remover um critério específico da listagem.
* `tableCriteriaList`: Container da listagem dos critérios ativos no DOM.
* `rowCriterionItem_{criterionId}`: Linha ou card de exibição individual de cada critério.
* `feedbackErrorCriteriaName`: Elemento de exibição de erro síncrono para validação de nome do critério.
* `btnSavePerformanceTable`: Botão para submeter e salvar a tabela de desempenho completa.
* `toastNotification`: Componente visual de notificação assíncrona (sucesso/erro da API).

### 2.2 Endpoints REST da API (Backend)
* `POST /api/v1/performance-tables` — Criação da tabela de desempenho com lista inicial de critérios.
* `GET /api/v1/performance-tables/{performanceTableId}` — Obtenção dos dados da tabela e critérios associados.
* `PUT /api/v1/performance-tables/{performanceTableId}` — Atualização do nome e dados cadastrais da tabela.
* `POST /api/v1/performance-tables/{performanceTableId}/criteria` — Inclusão avulsa de um novo critério em tabela existente.
* `DELETE /api/v1/performance-tables/{performanceTableId}/criteria/{criterionId}` — Exclusão lógica/física de um critério de avaliação.

---

## 3. Cenários de Teste em Formato BDD (Gherkin)

### 3.1 Cenários de Frontend (UI/UX - SPA)

#### CT-FE-01: Adição dinâmica de critério na interface com comportamento SPA (Happy Path)
```gherkin
Funcionalidade: Adição dinâmica de critérios de avaliação na interface
  Como Tutor da Sala autenticado
  Quero adicionar critérios na mesma tela de forma dinâmica
  Para compor a tabela de desempenho sem interrupção de fluxo

  Cenário: Inclusão bem-sucedida de critério com atualização imediata do DOM sem reload
    Dado que o tutor está na página de criação de tabela ("/performance-tables/new")
    E o campo "inputPerformanceTableName" está preenchido com "Tabela de Soft Skills PBL"
    Quando o tutor digita "Raciocínio Lógico" no campo "inputCriterionName"
    E o tutor digita "Capacidade analítica e síntese de hipóteses" no campo "inputCriterionDescription"
    E o tutor digita "5.0" no campo "inputCriterionWeight"
    E clica no botão "btnAddCriterion"
    Então o critério "Raciocínio Lógico" deve ser exibido imediatamente dentro de "tableCriteriaList"
    E o campo "inputCriterionName" deve ser limpo e receber o foco para nova digitação
    E a página NÃO deve executar recarregamento (comportamento SPA estrito)
    E os dados já preenchidos no formulário não devem ser perdidos
```

#### CT-FE-02: Remoção dinâmica de critério na interface com comportamento SPA (Happy Path)
```gherkin
Funcionalidade: Remoção dinâmica de critérios na interface
  Cenário: Exclusão de critério da listagem temporária sem reload
    Dado que o tutor possui 2 critérios ("Postura", "Comunicação") exibidos em "tableCriteriaList"
    Quando o tutor clica no botão "btnRemoveCriterion" associado ao critério "Postura"
    Então o item correspondente ao critério "Postura" deve ser removido do DOM em "tableCriteriaList"
    E o critério "Comunicação" deve continuar visível na listagem
    E a página NÃO deve realizar recarregamento total
    E o foco do navegador deve permanecer acessível
```

#### CT-FE-03: Validação síncrona de campo obrigatório vazio no Frontend (Unhappy Path)
```gherkin
Funcionalidade: Validação síncrona de campos obrigatórios
  Cenário: Bloqueio imediato ao tentar adicionar critério com criteriaName vazio
    Dado que o tutor está na interface de cadastro de critérios
    E o campo "inputCriterionName" está em branco ou contém apenas espaços ("   ")
    Quando o tutor clica no botão "btnAddCriterion"
    Então o sistema deve bloquear o evento de inclusão imediatamente no navegador
    E nenhuma chamada de rede para a API deve ser disparada
    E o container "feedbackErrorCriteriaName" deve exibir a mensagem: "O nome do critério é obrigatório."
    E o elemento "inputCriterionName" deve receber marcação visual de erro (borda vermelha e foco)
```

#### CT-FE-04: Bloqueio de caracteres especiais não permitidos no Frontend (Unhappy Path)
```gherkin
Funcionalidade: Validação de caracteres no Frontend
  Cenário: Bloqueio ao digitar caracteres especiais proibidos ou scripts maliciosos
    Dado que o tutor insere o texto "<script>alert('XSS')</script>" no campo "inputCriterionName"
    Quando o tutor tenta acionar o botão "btnAddCriterion" ou retira o foco do campo
    Então a adição do item à lista deve ser impedida
    E a mensagem de validação deve ser exibida: "O nome do critério contém caracteres inválidos. Utilize apenas letras, números e hifens."
    E o botão "btnAddCriterion" deve permanecer desabilitado enquanto houver erro de validação
```

---

### 3.2 Cenários de Backend (API REST)

#### CT-BE-01: Criação de Tabela de Desempenho com Critérios Válidos (Happy Path)
```gherkin
Funcionalidade: API - Criação de Tabela de Desempenho e Critérios
  Cenário: Criação de tabela contendo critérios com payload íntegro
    Dado que o cliente realiza uma requisição autenticada com token de "ROOM_TUTOR"
    Quando enviar um "POST" para "/api/v1/performance-tables" com "roomId", "tableName" e array "criteriaList"
    Então o status HTTP retornado deve ser 201 (Created)
    E o corpo da resposta deve conter o "performanceTableId" gerado no formato UUID
    E cada item em "criteriaList" deve conter um "criterionId" único e status "ACTIVE"
```

#### CT-BE-02: Adição unitária de critério a uma tabela existente (Happy Path)
```gherkin
Funcionalidade: API - Inclusão de Critério em Tabela Existente
  Cenário: Inclusão avulsa de critério com sucesso
    Dado que existe uma tabela de desempenho cadastrada com id "tbl-8842-uuid"
    Quando enviar uma requisição "POST" para "/api/v1/performance-tables/tbl-8842-uuid/criteria" com "criteriaName" = "Pontualidade"
    Então o status HTTP deve ser 201 (Created)
    E a resposta deve conter os dados do critério persistido associado a "performanceTableId"
```

#### CT-BE-03: Remoção de critério de avaliação existente (Happy Path)
```gherkin
Funcionalidade: API - Exclusão de Critério
  Cenário: Exclusão com sucesso de critério existente
    Dado que existe o critério com id "crit-1029-uuid" vinculado à tabela "tbl-8842-uuid"
    Quando enviar uma requisição "DELETE" para "/api/v1/performance-tables/tbl-8842-uuid/criteria/crit-1029-uuid"
    Então o status HTTP deve ser 204 (No Content)
    E o critério não deve mais estar disponível para novas avaliações
```

#### CT-BE-04: Rejeição de critério com criteriaName vazio ou nulo (Unhappy Path)
```gherkin
Funcionalidade: API - Validação de campos obrigatórios
  Cenário: Submissão de critério sem nome preenchido
    Dado que uma requisição "POST" é enviada para "/api/v1/performance-tables/{performanceTableId}/criteria"
    E o campo "criteriaName" é enviado como string vazia ("") ou nulo
    Então o backend deve rejeitar a requisição com status 400 (Bad Request)
    E a resposta no formato RFC 7807 deve especificar o campo "criteriaName" como inválido
```

#### CT-BE-05: Rejeição de caracteres especiais proibidos e injeção de código (Unhappy Path)
```gherkin
Funcionalidade: API - Sanitização e segurança de entrada
  Cenário: Tentativa de inserção com caracteres especiais e código executável
    Dado que uma requisição "POST" é enviada contendo "criteriaName" = "Critério <script>alert(1)</script>"
    Quando os filtros de validação de DTO do backend processarem o payload
    Então a requisição deve ser rejeitada com status 422 (Unprocessable Entity) ou 400 (Bad Request)
    E nenhuma alteração deve ser persistida no banco de dados
```

#### CT-BE-06: Associação de critério a tabela inexistente (Unhappy Path)
```gherkin
Funcionalidade: API - Integridade referencial
  Cenário: Tentativa de adicionar critério a um performanceTableId inexistente
    Dado que o cliente envia um "POST" com identificador de tabela "tbl-inexistente"
    Quando a API tentar localizar a tabela de desempenho
    Então deve retornar status 404 (Not Found)
    E a mensagem de detalhe deve indicar que a tabela solicitada não existe
```

#### CT-BE-07: Controle de Acesso e Permissão por Perfil (Segurança - RBAC)
```gherkin
Funcionalidade: API - Segurança e Controle de Acesso
  Cenário: Usuário com perfil de estudante tentando criar tabela de critérios
    Dado que a requisição é realizada com credenciais válidas, mas com perfil "STUDENT"
    Quando tentar invocar o endpoint "POST /api/v1/performance-tables"
    Então o sistema de segurança deve barrar o acesso com status 403 (Forbidden)
    E a mensagem deve indicar privilégios insuficientes para a operação
```

---

## 4. Exemplos de Payloads JSON (API Request & Response)

### 4.1 Criação de Tabela com Lista de Critérios (`POST /api/v1/performance-tables`)

#### Request (`POST`)
```json
{
  "roomId": "room-550e8400-e29b-41d4-a716-446655440000",
  "tableName": "Tabela de Avaliação Trimestral - Módulo 1",
  "criteriaList": [
    {
      "criteriaName": "Postura e Ética Profissional",
      "criteriaDescription": "Avaliação comportamental e respeito às normas da sessão tutoral",
      "criteriaWeight": 2.5
    },
    {
      "criteriaName": "Raciocínio Lógico",
      "criteriaDescription": "Estruturação coerente de argumentos e resolução de problemas",
      "criteriaWeight": 5.0
    },
    {
      "criteriaName": "Comunicação e Trabalho em Equipe",
      "criteriaDescription": "Clareza na exposição de ideias e escuta ativa dos colegas",
      "criteriaWeight": 2.5
    }
  ]
}
```

#### Response (`201 Created`)
```json
{
  "performanceTableId": "tbl-771a3400-e29b-41d4-b825-112233445566",
  "roomId": "room-550e8400-e29b-41d4-a716-446655440000",
  "tableName": "Tabela de Avaliação Trimestral - Módulo 1",
  "status": "ACTIVE",
  "createdAt": "2026-09-29T23:00:00Z",
  "criteriaList": [
    {
      "criterionId": "crit-01",
      "criteriaName": "Postura e Ética Profissional",
      "criteriaDescription": "Avaliação comportamental e respeito às normas da sessão tutoral",
      "criteriaWeight": 2.5,
      "status": "ACTIVE"
    },
    {
      "criterionId": "crit-02",
      "criteriaName": "Raciocínio Lógico",
      "criteriaDescription": "Estruturação coerente de argumentos e resolução de problemas",
      "criteriaWeight": 5.0,
      "status": "ACTIVE"
    },
    {
      "criterionId": "crit-03",
      "criteriaName": "Comunicação e Trabalho em Equipe",
      "criteriaDescription": "Clareza na exposição de ideias e escuta ativa dos colegas",
      "criteriaWeight": 2.5,
      "status": "ACTIVE"
    }
  ]
}
```

---

### 4.2 Inclusão Unitária de Critério (`POST /api/v1/performance-tables/{performanceTableId}/criteria`)

#### Request (`POST`)
```json
{
  "criteriaName": "Pontualidade e Assiduidade",
  "criteriaDescription": "Chegada no horário e cumprimento dos prazos das metas acordadas",
  "criteriaWeight": 1.5
}
```

#### Response (`201 Created`)
```json
{
  "criterionId": "crit-04",
  "performanceTableId": "tbl-771a3400-e29b-41d4-b825-112233445566",
  "criteriaName": "Pontualidade e Assiduidade",
  "criteriaDescription": "Chegada no horário e cumprimento dos prazos das metas acordadas",
  "criteriaWeight": 1.5,
  "status": "ACTIVE",
  "createdAt": "2026-09-29T23:05:00Z"
}
```

---

### 4.3 Erro: Campo Obrigatório Vazio (`400 Bad Request` - RFC 7807)

#### Request Inválido
```json
{
  "criteriaName": "",
  "criteriaDescription": "Descrição sem nome",
  "criteriaWeight": 2.0
}
```

#### Response
```json
{
  "type": "https://api.avalia.edu/errors/validation-failed",
  "title": "Erro de Validação",
  "status": 400,
  "detail": "Um ou mais campos do payload violam regras de validação cadastrais.",
  "instance": "/api/v1/performance-tables/tbl-771a3400-e29b-41d4-b825-112233445566/criteria",
  "timestamp": "2026-09-29T23:06:00Z",
  "invalidParams": [
    {
      "field": "criteriaName",
      "rejectedValue": "",
      "message": "O campo 'criteriaName' é obrigatório e não pode ser vazio."
    }
  ]
}
```

---

### 4.4 Erro: Caracteres Especiais Inválidos / Tentativa de XSS (`422 Unprocessable Entity`)

#### Request Inválido
```json
{
  "criteriaName": "Postura <script>alert('XSS')</script> *#;",
  "criteriaDescription": "Tentativa de injeção",
  "criteriaWeight": 1.0
}
```

#### Response
```json
{
  "type": "https://api.avalia.edu/errors/invalid-characters",
  "title": "Entidade Não Processável",
  "status": 422,
  "detail": "O campo criteriaName contém caracteres especiais não permitidos.",
  "instance": "/api/v1/performance-tables/tbl-771a3400-e29b-41d4-b825-112233445566/criteria",
  "timestamp": "2026-09-29T23:07:00Z",
  "invalidParams": [
    {
      "field": "criteriaName",
      "rejectedValue": "Postura <script>alert('XSS')</script> *#;",
      "message": "O nome do critério permite apenas caracteres alfanuméricos, acentos da língua portuguesa, espaços e hifens."
    }
  ]
}
```

---

## 5. Matriz de Testes de Limite e Casos de Borda (Boundary Tests)

| Identificador | Camada | Variável / Alvo | Cenário de Teste | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **CT-BND-01** | Frontend/API | `criteriaName` | Texto com 256 caracteres (limite máximo é 255) | Frontend restringe por `maxlength="255"`; API rejeita com `400 Bad Request` |
| **CT-BND-02** | Frontend/API | `criteriaName` | Texto com 1 caractere válido ("A") | Inclusão e persistência realizadas com sucesso (limite inferior) |
| **CT-BND-03** | Frontend/API | `criteriaName` | Critério duplicado (mesmo nome na mesma tabela) | Alerta na interface e rejeição na API com `409 Conflict` |
| **CT-BND-04** | Frontend (SPA)| `tableCriteriaList` | Adição e exclusão rápida de 15 critérios sequenciais | DOM atualizado sem acúmulo de nós órfãos ou inconsistência no estado local |
| **CT-BND-05** | API | `criteriaWeight` | Valor numérico negativo (`-2.5`) ou acima de `100.0` | Rejeição imediata com `400 Bad Request` ("O peso deve ser entre 0 e 100") |
| **CT-BND-06** | Frontend (SPA)| `btnSavePerformanceTable`| Submeter formulário sem nenhum critério adicionado | Bloqueio com aviso: "A tabela de desempenho deve conter no mínimo um critério de avaliação." |
