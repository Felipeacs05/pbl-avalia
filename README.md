# 🌿 Fluxo de Git, Desenvolvimento e QA

## 📌 SETUP BASE — ANTES DAS USs

Antes de qualquer pessoa criar uma branch de funcionalidade, precisamos finalizar o **SETUP BASE**.

### 1️⃣ FRONTEND

Alguém do Front deve:

- Clonar o repositório.
- Entrar na branch `develop`.
- Entrar na pasta `/frontend`.
- Inicializar o projeto React + Tailwind.
- Fazer commit.
- Dar push na `develop`.

### 2️⃣ BACKEND

Alguém do Back deve:

- Entrar na branch `develop`.
- Entrar na pasta `/backend`.
- Inicializar a base do Spring Boot (Maven/Gradle).
- Fazer commit.
- Dar push na `develop`.

### 3️⃣ QA

O QA trabalha principalmente em:

- `/.github/workflows` → configuração de CI/CD.
- `/backend/src/test` → testes unitários e de integração.
- `/frontend` → testes do Frontend.

O QA depende do setup inicial do Frontend e Backend estar na `develop` para configurar e validar as pipelines.

O QA pode criar branches como:

    test/setup-ci

Também pode adicionar testes nas branches das USs antes do merge e realizar a validação dos Pull Requests.

> ⚠️ **SOMENTE DEPOIS que Front e Back estiverem configurados na `develop`, liberamos as branches das USs.**

---

# 🌿 COMO VAMOS TRABALHAR COM AS BRANCHES

Toda branch deve ser criada a partir da `develop` atualizada.

Antes de criar uma branch:

    git checkout develop
    git pull

## 📌 Padrão das branches

### Features

    feat/US01-backend
    feat/US01-frontend
    feat/US02-backend
    feat/US02-frontend

### Testes

    test/setup-ci
    test/US01-backend

### Correções

Para bugs pontuais em USs já integradas:

    fix/US01-validacao-email

---

# 🚨 REGRA DE OURO DO GIT

### ❌ NUNCA deem push direto na `main` ou na `develop`.

Cada pessoa deve trabalhar na sua própria branch.

Exemplo:

    git push origin feat/US01-frontend

Quando terminar a tarefa e testar:

1. Abrir um **Pull Request (PR)** da sua branch para a `develop`.
2. O PR será revisado.
3. O GitHub Actions executará os testes automaticamente.
4. O QA fará a validação quando necessário.
5. Estando tudo certo, o PR será aprovado e integrado na `develop`.

A `main` só recebe o código fechado no final da Sprint.

---

# 🧪 COMO OS QAs VÃO TRABALHAR NO GIT E NO DIA A DIA

## 1️⃣ CONFIGURAÇÃO DA PIPELINE DE CI — GITHUB ACTIONS

O QA cria uma branch própria a partir da `develop`:

    test/setup-ci

Nessa branch, ele trabalha na pasta:

    /.github/workflows

Configurando os arquivos de automação para que os testes sejam executados automaticamente sempre que alguém abrir um Pull Request.

Quando terminar:

1. Fazer commit.
2. Fazer push da branch.
3. Abrir um **Pull Request para a `develop`**.

O QA segue o mesmo fluxo de Pull Request utilizado pelos desenvolvedores.

---

## 2️⃣ CRIAÇÃO DE TESTES AUTOMATIZADOS

### 🧪 Testes de API / Integração — Backend

O QA cria uma branch a partir da `develop`, por exemplo:

    test/US01-backend

Os testes ficam principalmente dentro de:

    /backend/src/test

Nessa pasta serão desenvolvidos os testes unitários e de integração com base nos cenários definidos no PRD.

### Exemplos de cenários:

- Cadastro sem foto.
- Cadastro com senha fraca.
- E-mail inválido.
- Dados obrigatórios ausentes.
- Credenciais inválidas.
- Usuário não autenticado tentando acessar um recurso protegido.
- Dados inválidos enviados para a API.

Terminou os testes?

➡️ Fazer commit, push e abrir um **Pull Request para a `develop`**.

---

## 3️⃣ TESTES DO FRONTEND

Quando necessário, o QA também pode criar testes para o Frontend.

Esses testes ficam dentro da própria estrutura do projeto:

    /frontend

O QA pode criar uma branch específica, por exemplo:

    test/US01-frontend

E desenvolver os testes relacionados aos componentes, telas e fluxos da aplicação.

Depois:

1. Fazer commit.
2. Fazer push.
3. Abrir Pull Request para a `develop`.

---

# 🔎 VALIDAÇÃO E HOMOLOGAÇÃO MANUAL

O QA também atua como uma espécie de **gatekeeper** antes do merge dos Pull Requests.

Quando um desenvolvedor abrir um PR para a `develop`, por exemplo:

    feat/US01-backend → develop

O QA entra em ação antes do merge.

### 1. ✅ Verificar a Pipeline

O QA deve conferir se:

- O GitHub Actions foi executado.
- A pipeline terminou sem erros.
- Os testes automatizados passaram.
- O projeto conseguiu ser compilado/buildado corretamente.

### 2. 🧪 Realizar testes manuais

Quando necessário, o QA pode baixar a branch daquele desenvolvedor localmente e realizar testes utilizando ferramentas como:

- Postman.
- Navegador.
- Outras ferramentas de teste necessárias.

### 3. 🐛 Reportar problemas

Se encontrar algum problema, o QA deve comentar diretamente no Pull Request.

Exemplo:

> **Ajuste necessário:** ao enviar um e-mail sem `@`, a API retorna `500` em vez de `400`.

O desenvolvedor então realiza a correção e atualiza o mesmo Pull Request.

### 4. ✅ Aprovar o PR

Se estiver tudo funcionando corretamente e atender aos critérios de aceite definidos no PRD:

➡️ O QA aprova o Pull Request.

---

# 🔗 FLUXO DO PULL REQUEST

O fluxo esperado é:

    Dev cria branch
           ↓
    Desenvolve a funcionalidade
           ↓
    Executa testes
           ↓
    Push da branch
           ↓
    Abre PR → develop
           ↓
    GitHub Actions executa os testes
           ↓
    QA verifica a pipeline
           ↓
    QA realiza testes manuais quando necessário
           ↓
       Encontrou bug?
          ↙     ↘
        Sim      Não
         ↓        ↓
    Solicita     Aprova
     ajuste        PR
         ↓          ↓
    Dev corrige   Merge na
         ↓        develop
    Novo teste

---

# 🔗 ORDEM DE DEPENDÊNCIA — SPRINT 1

A ordem de dependência das User Stories será:

    US01 — Cadastro
            +
    US02 — Login/JWT
            ↓
    O restante precisa do usuário autenticado
            ↓
    US03 — Criação de Salas
            +
    US04 — Ingresso na Sala
            ↓
    Precisa do ID da sala existir no banco
            ↓
    US05 — CRUD de Problemas
            +
    US06 — Gestão de Grupos
            ↓
    US07 — CRUD de Tabelas de Desempenho e Critérios

---

# 💡 FRONTEND NÃO FICA BLOQUEADO PELO BACKEND

O Frontend **não precisa esperar o Backend terminar tudo**.

A equipe pode definir primeiro o formato do JSON, estabelecendo o **contrato da API**, e desenvolver as telas utilizando **mocks/dados simulados**.

Exemplo de contrato:

    {
      "id": 1,
      "nome": "Felipe",
      "email": "felipe@email.com"
    }

Enquanto o endpoint real ainda não estiver disponível, o Front pode trabalhar com esses dados simulados.

Quando o endpoint estiver disponível na `develop`, basta substituir o mock pela chamada real da API.

---

# 📌 RESUMO DO FLUXO

    SETUP FRONTEND
          +
    SETUP BACKEND
          ↓
    Configuração do QA / CI
          ↓
    Branches das USs liberadas
          ↓
    Dev cria branch a partir da develop
          ↓
    Desenvolvimento + testes
          ↓
    Pull Request → develop
          ↓
    GitHub Actions
          ↓
    Validação do QA
          ↓
    Correções, se necessário
          ↓
    Aprovação
          ↓
    Merge → develop
          ↓
    Final da Sprint
          ↓
    Merge → main
