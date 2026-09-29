-- ==============================================================================
-- Schema do Banco de Dados Relacional - Avalia-system (PostgreSQL)
-- Arquitetura em Cascata para o Modelo PBL:
-- Salas -> Problemas -> Sessões -> Registros/Chamadas & Avaliações
-- ==============================================================================

-- 1. Usuários (Professores/Tutores e Alunos)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    profile_picture_url VARCHAR(255)
    );