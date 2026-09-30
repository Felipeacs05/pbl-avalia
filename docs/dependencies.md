# Dependências do Sistema

Este documento lista as principais bibliotecas e frameworks utilizados no desenvolvimento do sistema, separados por ambiente.

## 🛠️ Backend (Java / Spring Boot)
O backend foi construído em **Java** utilizando **Spring Boot 4.1.1** e gerenciado pelo **Maven**.

### Dependências Principais
- **Spring Boot Starter WebMVC**: Criação da API REST.
- **Spring Boot Starter Data JPA**: Integração e persistência de dados.
- **Spring Boot Starter Validation**: Validação de dados de entrada.
- **Spring Boot Starter OAuth2 Resource Server**: Segurança e validação de tokens OAuth2/JWT.
- **Spring Security Crypto**: Criptografia de dados e senhas.
- **PostgreSQL Driver**: Conector do banco de dados em produção.
- **Lombok**: Redução de boilerplate (Getters, Setters, etc.).

### Dependências de Teste e Desenvolvimento
- **Spring Boot Test (WebMVC, Data JPA, Security)**: Ferramentas base para testes no Spring.
- **H2 Database**: Banco de dados em memória para testes.
- **Testcontainers (PostgreSQL, JUnit Jupiter)**: Testes de integração utilizando containers Docker.
- **Selenium Java**: Testes end-to-end / automação de navegador.

---

## 💻 Frontend (React / Next.js)
O frontend foi construído utilizando **Next.js** e **React**.

### Dependências Principais
- **Next.js (`16.3.5`)**: Framework React com suporte a SSR e rotas.
- **React e React DOM (`19.2.8`)**: Biblioteca principal para construção de interfaces.
- **Axios (`^1.20.0`)**: Cliente HTTP para chamadas à API do backend.
- **Lucide React (`^1.47.0`)**: Biblioteca de ícones.

### Dependências de Desenvolvimento e Testes
- **TypeScript (`^5`)**: Tipagem estática para JavaScript.
- **Tailwind CSS (`^4`)** e **PostCSS**: Framework de estilização utilitária.
- **ESLint (`^9`)**: Linter para garantir qualidade e padrão do código.
- **Vitest (`^4`)**: Framework de testes unitários.
- **Testing Library (React, DOM, Jest-DOM, User-Event)**: Utilitários para testes de componentes.
- **Playwright (`^1`)**: Testes End-to-End (E2E).
