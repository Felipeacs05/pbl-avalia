# Avalia-system

Repositório monorepo do **Avalia-system**, uma plataforma voltada ao ecossistema de Aprendizagem Baseada em Problemas (**PBL**). O projeto é dividido de forma desacoplada entre **Frontend** e **Backend**, com pipelines de CI/CD automatizadas e independentes no GitHub Actions.

---

## 🏛️ Justificativa e Decisões Arquiteturais

### 1. Front-end: React + Tailwind CSS
- **React**: A escolha do React se justifica pela necessidade de construir uma *Single Page Application* (SPA) rápida e fluida. Como o sistema exige interações dinâmicas (como registrar chamadas ou comportamentos sem recarregar a tela do professor), a virtualização do DOM no React oferece a performance necessária para o contexto **"Mobile First"**.
- **Tailwind CSS**: Adotado para estilização em nível de utilitários (*Utility-First*). Isso permite aos desenvolvedores construírem e adaptarem componentes responsivos de forma extremamente ágil, padronizando o *design system* diretamente no HTML/JSX sem a necessidade de manter grandes arquivos CSS externos.

### 2. Back-end: Java Spring Boot
- **Justificativa**: O Spring foi escolhido por ser um framework robusto, fortemente tipado e ideal para arquiteturas empresariais. Ele fornece injeção de dependências nativa e ecossistemas prontos para a segurança (como o Spring Security, necessário para gerar e validar tokens, e criptografar senhas). Além disso, a linguagem Java garante confiabilidade no tratamento das regras matemáticas rígidas exigidas (cálculos de médias ponderadas e consolidação de notas).

### 3. Banco de Dados: PostgreSQL
- **Justificativa**: A escolha por um banco de dados relacional foi mandatória. O sistema de PBL possui entidades que dependem estritamente umas das outras em formato de cascata:
  $$\text{Salas} \longrightarrow \text{Problemas} \longrightarrow \text{Sessões} \longrightarrow \text{Registros / Chamadas e Avaliações}$$
  O PostgreSQL garante a integridade referencial (através de *Foreign Keys* com `ON DELETE CASCADE`) e confiabilidade de transações (ACID), fundamentais para que **não existam notas, avaliações ou chamadas "órfãs"** no sistema.

### 4. Testes e CI/CD: GitHub Actions, JUnit + Mockito e Selenium
- **Justificativa**: Para manter a estabilidade do MVP, escolhemos o GitHub Actions para a infraestrutura de testes contínuos. Ele nos permite rodar pipelines automatizadas diretamente no repositório. A cada *Push* ou *Pull Request*, os testes são executados automaticamente:
  - **Backend**: Testes unitários e de integração de serviços/APIs com **JUnit 5** e **Mockito**, além de contêineres de banco para testes de persistência.
  - **Frontend / E2E**: Testes de componentes e automação de fluxos ponta a ponta com **Selenium**, garantindo que código quebrado nunca afete a branch principal (`main` e `develop`).

---

## 📁 Estrutura de Diretórios

```text
Avalia-system/
├── .github/
│   └── workflows/
│       ├── backend-ci.yml       # Pipeline do Backend (JUnit, Mockito, PostgreSQL)
│       └── frontend-ci.yml      # Pipeline do Frontend (Lint, Testes, Build)
├── backend/                     # API REST Spring Boot (Java 21)
│   ├── .mvn/
│   ├── src/
│   │   ├── main/java/...        # Camadas: config, controller, dto, exception, model, repository, service
│   │   └── test/java/...        # Testes das histórias de usuário (US01, US02, etc.)
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd
│   └── HELP.md
├── frontend/                    # SPA React + Tailwind CSS (Mobile First)
│   ├── public/
│   ├── src/
│   │   ├── App.tsx              # Componentes de interface interativos
│   │   ├── index.css            # Diretivas do Tailwind CSS
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.ts
├── docs/
│   └── schema.sql               # Modelo relacional em cascata (Salas -> Problemas -> Sessões -> Registros)
├── docker-compose.yml           # Ambiente local para PostgreSQL
└── .gitignore
```

---

## 🚀 Como Executar o Projeto

### 1. Banco de Dados (PostgreSQL via Docker)
Suba a instância de banco em segundo plano:
```bash
docker compose up -d postgres
```
O banco aplicará automaticamente o script [docs/schema.sql](file:///C:/Users/joaov/IdeaProjects/Avalia-system/docs/schema.sql).

### 2. Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run     # Linux/macOS
.\mvnw.cmd spring-boot:run # Windows
```

Para rodar os testes automatizados do backend:
```bash
cd backend
./mvnw test
```

### 3. Frontend (React + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:5173`.
