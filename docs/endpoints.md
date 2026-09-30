# Mapeamento de Endpoints do Sistema

Abaixo estão listados os endpoints mapeados a partir dos controllers do backend (Spring Boot).

## 🔐 Autenticação (`/api/v1/auth`)
Gerencia o registro e login de usuários.
- **`POST /api/v1/auth/register`**: Registra um novo usuário.
- **`POST /api/v1/auth/login`**: Autentica um usuário e retorna o token de acesso.

## 📊 Dashboard (`/api/users/me`)
Ações relacionadas ao usuário logado.
- **`GET /api/users/me/rooms`**: Retorna as informações do dashboard e salas do usuário logado.

## 📈 Tabelas de Desempenho (`/api/v1/performance-tables`)
Gerencia as tabelas de avaliação e seus critérios.
- **`POST /api/v1/performance-tables`**: Cria uma nova tabela de desempenho.
- **`GET /api/v1/performance-tables/{id}`**: Busca os detalhes de uma tabela específica.
- **`POST /api/v1/performance-tables/{performanceTableId}/criteria`**: Adiciona um critério a uma tabela de desempenho.
- **`DELETE /api/v1/performance-tables/{performanceTableId}/criteria/{criterionId}`**: Remove um critério de uma tabela de desempenho.

## 🏫 Salas (`/api/v1/rooms`)
Gerencia as salas do sistema.
- **`GET /api/v1/rooms`**: Lista as salas.
- **`POST /api/v1/rooms`**: Cria uma nova sala.
- **`PUT /api/v1/rooms/{id}`**: Atualiza os dados de uma sala.
- **`DELETE /api/v1/rooms/{id}`**: Exclui uma sala.
- **`POST /api/v1/rooms/join`**: Permite que um usuário entre em uma sala.
- **`POST /api/v1/rooms/join/{code}`**: Permite que um usuário entre em uma sala via link/código.
