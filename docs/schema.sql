-- ==============================================================================
-- Schema do Banco de Dados Relacional - Avalia-system (PostgreSQL)
-- Arquitetura em Cascata para o Modelo PBL:
-- Salas -> Problemas -> Sessões -> Registros/Chamadas & Avaliações
-- ==============================================================================

-- 1. Usuários (Professores/Tutores e Alunos)
CREATE TABLE IF NOT EXISTS usuario (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    foto_perfil_url VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_usuario_email ON usuario(email);

-- 2. Salas de Tutoria PBL
CREATE TABLE IF NOT EXISTS sala (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    codigo_acesso VARCHAR(50) NOT NULL UNIQUE,
    tutor_id BIGINT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sala_tutor FOREIGN KEY (tutor_id) REFERENCES usuario(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sala_tutor ON sala(tutor_id);

-- 3. Associação de Alunos à Sala (Muitos-para-Muitos)
CREATE TABLE IF NOT EXISTS sala_aluno (
    sala_id BIGINT NOT NULL,
    aluno_id BIGINT NOT NULL,
    inscrito_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sala_id, aluno_id),
    CONSTRAINT fk_sala_aluno_sala FOREIGN KEY (sala_id) REFERENCES sala(id) ON DELETE CASCADE,
    CONSTRAINT fk_sala_aluno_aluno FOREIGN KEY (aluno_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- 4. Problemas (pertencem a uma Sala)
CREATE TABLE IF NOT EXISTS problema (
    id BIGSERIAL PRIMARY KEY,
    sala_id BIGINT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    ordem INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_problema_sala FOREIGN KEY (sala_id) REFERENCES sala(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_problema_sala ON problema(sala_id);

-- 5. Sessões de Tutoria (Abertura / Fechamento do Problema)
CREATE TABLE IF NOT EXISTS sessao (
    id BIGSERIAL PRIMARY KEY,
    problema_id BIGINT NOT NULL,
    numero_sessao INT NOT NULL DEFAULT 1,
    data_sessao DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ABERTA', -- ABERTA, FINALIZADA
    CONSTRAINT fk_sessao_problema FOREIGN KEY (problema_id) REFERENCES problema(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessao_problema ON sessao(problema_id);

-- 6. Registros de Chamada / Frequência por Sessão
CREATE TABLE IF NOT EXISTS registro_chamada (
    id BIGSERIAL PRIMARY KEY,
    sessao_id BIGINT NOT NULL,
    aluno_id BIGINT NOT NULL,
    presente BOOLEAN NOT NULL DEFAULT TRUE,
    justificativa VARCHAR(255),
    CONSTRAINT uk_sessao_aluno_chamada UNIQUE (sessao_id, aluno_id),
    CONSTRAINT fk_chamada_sessao FOREIGN KEY (sessao_id) REFERENCES sessao(id) ON DELETE CASCADE,
    CONSTRAINT fk_chamada_aluno FOREIGN KEY (aluno_id) REFERENCES usuario(id) ON DELETE CASCADE
);

-- 7. Registros de Avaliações / Notas por Sessão (Elimina notas órfãs)
CREATE TABLE IF NOT EXISTS avaliacao (
    id BIGSERIAL PRIMARY KEY,
    sessao_id BIGINT NOT NULL,
    aluno_id BIGINT NOT NULL,
    avaliador_id BIGINT NOT NULL,
    nota_desempenho NUMERIC(4, 2) CHECK (nota_desempenho >= 0 AND nota_desempenho <= 10),
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_avaliacao_sessao FOREIGN KEY (sessao_id) REFERENCES sessao(id) ON DELETE CASCADE,
    CONSTRAINT fk_avaliacao_aluno FOREIGN KEY (aluno_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_avaliacao_avaliador FOREIGN KEY (avaliador_id) REFERENCES usuario(id) ON DELETE RESTRICT
);
