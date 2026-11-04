-- Schema relacional do Avalia-system para PostgreSQL.
-- Este arquivo representa as entidades JPA atuais. IDs UUID são gerados pelo Hibernate,
-- exceto password_reset_token.id, que usa a identidade gerada pelo PostgreSQL.
-- Os nomes em snake_case seguem a estratégia física padrão do Spring Boot/Hibernate.

-- Usuários: tutor e aluno são papéis de domínio, não tabelas separadas.
CREATE TABLE users (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    token_version INTEGER DEFAULT 0 NOT NULL,
    profile_picture_url VARCHAR(255),
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
);

-- Uma sala tem exatamente um tutor; um tutor pode possuir várias salas.
CREATE TABLE rooms (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    access_code VARCHAR(255) NOT NULL,
    invite_link VARCHAR(255),
    tutor_id UUID NOT NULL,
    CONSTRAINT pk_rooms PRIMARY KEY (id),
    CONSTRAINT uk_rooms_access_code UNIQUE (access_code),
    CONSTRAINT fk_rooms_tutor FOREIGN KEY (tutor_id) REFERENCES users (id)
);

CREATE INDEX idx_rooms_tutor_id ON rooms (tutor_id); -- RoomRepository.findByTutorId filtra por tutor_id; o índice localiza as salas correspondentes sem percorrer todas as salas.

-- Times pertencem a uma sala; a associação é N:1 e não limita a quantidade de times por sala.
CREATE TABLE teams (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    room_id UUID NOT NULL,
    CONSTRAINT pk_teams PRIMARY KEY (id),
    CONSTRAINT fk_teams_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
);

CREATE INDEX idx_teams_room_id ON teams (room_id); -- Permite localizar os times pela FK room_id sem percorrer toda a tabela de times.

-- Registro de vínculo de usuário com sala. O histórico é representado por active/unlinked_at.
-- A model não declara unicidade de room_id + user_id, então não se impõe uma regra 1:1 aqui.
CREATE TABLE room_members (
    id UUID NOT NULL,
    room_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL,
    unlinked_at TIMESTAMP WITH TIME ZONE,
    team_id UUID,
    CONSTRAINT pk_room_members PRIMARY KEY (id),
    CONSTRAINT fk_room_members_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_room_members_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_room_members_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL
);

CREATE INDEX idx_room_members_room_id ON room_members (room_id); -- Consultas de membros por sala filtram por room_id; o índice evita examinar vínculos de outras salas.
CREATE INDEX idx_room_members_user_id ON room_members (user_id); -- Consultas de participação filtram por user_id; o índice encontra os vínculos do usuário sem varrer todos os membros.
CREATE INDEX idx_room_members_team_id ON room_members (team_id); -- Consultas de membros por time filtram por team_id; o índice restringe a busca aos vínculos daquele time.
CREATE INDEX idx_room_members_room_active_role ON room_members (room_id, active, role); -- A ordem das colunas atende aos filtros que começam por sala e também verificam estado ativo e papel.

-- Grupos pertencem a uma sala. A lista members é mapeada pela FK em group_member.
CREATE TABLE groups (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    room_id UUID NOT NULL,
    CONSTRAINT pk_groups PRIMARY KEY (id),
    CONSTRAINT fk_group_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
);

CREATE INDEX idx_groups_room_id ON groups (room_id); -- GroupRepository.findByRoomId filtra por room_id; o índice evita percorrer grupos de outras salas.

-- A unicidade evita cadastrar o mesmo usuário mais de uma vez no mesmo grupo.
CREATE TABLE group_member (
    id UUID NOT NULL,
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    CONSTRAINT pk_group_member PRIMARY KEY (id),
    CONSTRAINT uk_group_member_group_user UNIQUE (group_id, user_id),
    CONSTRAINT fk_group_member_group FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    CONSTRAINT fk_group_member_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_group_member_user_id ON group_member (user_id); -- Permite encontrar os grupos do usuário pelo segundo lado da associação, sem varrer todas as associações.

-- Problemas pertencem a uma sala. Os booleanos são estados independentes de liberação.
CREATE TABLE problems (
    id UUID NOT NULL,
    room_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL,
    self_assessment_released BOOLEAN NOT NULL,
    peer_assessment_released BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT pk_problems PRIMARY KEY (id),
    CONSTRAINT fk_problems_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
);

CREATE INDEX idx_problems_room_id ON problems (room_id); -- ProblemRepository filtra por room_id para listar os problemas da sala sem examinar problemas de outras salas.

-- Cada sessão pertence a um problema; não há outros atributos declarados pela entidade.
CREATE TABLE tutoring_sessions (
    id UUID NOT NULL,
    problem_id UUID NOT NULL,
    CONSTRAINT pk_tutoring_sessions PRIMARY KEY (id),
    CONSTRAINT fk_tutoring_sessions_problem FOREIGN KEY (problem_id) REFERENCES problems (id) ON DELETE CASCADE
);

CREATE INDEX idx_tutoring_sessions_problem_id ON tutoring_sessions (problem_id); -- Permite localizar as sessões pela FK problem_id sem percorrer sessões ligadas a outros problemas.

-- Presença: a constraint da model evita duplicidade do mesmo aluno na mesma sessão.
CREATE TABLE attendances (
    id UUID NOT NULL,
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    status VARCHAR(255) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_attendances PRIMARY KEY (id),
    CONSTRAINT uk_attendance_session_student UNIQUE (session_id, student_id),
    CONSTRAINT fk_attendances_session FOREIGN KEY (session_id) REFERENCES tutoring_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_attendances_student FOREIGN KEY (student_id) REFERENCES users (id)
);

CREATE INDEX idx_attendances_student_id ON attendances (student_id); -- A restrição única começa por session_id; este índice separado atende buscas de presenças pelo aluno.

-- Um aluno pode receber no máximo um papel por sessão, e cada papel só pode ter um aluno.
CREATE TABLE session_role_assignment (
    id UUID NOT NULL,
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    role VARCHAR(255) NOT NULL,
    extra_grade DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_session_role_assignment PRIMARY KEY (id),
    CONSTRAINT uk_session_role UNIQUE (session_id, role),
    CONSTRAINT uk_session_student UNIQUE (session_id, student_id),
    CONSTRAINT fk_session_role_assignment_session FOREIGN KEY (session_id) REFERENCES tutoring_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_session_role_assignment_student FOREIGN KEY (student_id) REFERENCES users (id)
);

CREATE INDEX idx_session_role_assignment_student_id ON session_role_assignment (student_id); -- As restrições únicas começam por session_id; este índice atende buscas iniciadas pelo aluno.

-- Avaliações são ligadas ao problema, avaliador e avaliado; as notas moderadas preservam o valor original.
CREATE TABLE assessments (
    id UUID NOT NULL,
    problem_id UUID NOT NULL,
    evaluator_id UUID NOT NULL,
    target_id UUID NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    comment VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    original_grade DOUBLE PRECISION,
    adjusted_grade DOUBLE PRECISION,
    justification VARCHAR(1000),
    modified_by_tutor BOOLEAN DEFAULT FALSE NOT NULL,
    CONSTRAINT pk_assessments PRIMARY KEY (id),
    CONSTRAINT fk_assessments_problem FOREIGN KEY (problem_id) REFERENCES problems (id) ON DELETE CASCADE,
    CONSTRAINT fk_assessments_evaluator FOREIGN KEY (evaluator_id) REFERENCES users (id),
    CONSTRAINT fk_assessments_target FOREIGN KEY (target_id) REFERENCES users (id)
);

CREATE INDEX idx_assessments_problem_id ON assessments (problem_id); -- AssessmentRepository filtra por problema; o índice restringe a busca às avaliações daquele problema.
CREATE INDEX idx_assessments_evaluator_id ON assessments (evaluator_id); -- As consultas que combinam problema e avaliador podem usar este índice para localizar as avaliações do autor.
CREATE INDEX idx_assessments_target_id ON assessments (target_id); -- Permite filtrar avaliações pelo usuário avaliado sem percorrer toda a tabela.

-- Feedback é vinculado ao problema e ao aluno que o recebe.
CREATE TABLE feedbacks (
    id UUID NOT NULL,
    problem_id UUID NOT NULL,
    student_id UUID NOT NULL,
    grade DOUBLE PRECISION NOT NULL,
    feedback_text VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT pk_feedbacks PRIMARY KEY (id),
    CONSTRAINT fk_feedbacks_problem FOREIGN KEY (problem_id) REFERENCES problems (id) ON DELETE CASCADE,
    CONSTRAINT fk_feedbacks_student FOREIGN KEY (student_id) REFERENCES users (id)
);

CREATE INDEX idx_feedbacks_problem_id ON feedbacks (problem_id); -- FeedbackRepository.findByProblemId filtra por problem_id; o índice evita examinar feedbacks de outros problemas.
CREATE INDEX idx_feedbacks_student_id ON feedbacks (student_id); -- As consultas de feedback paginado começam por student_id; o índice encontra os registros do aluno antes da ordenação.

-- Tags de comportamento são configuradas por sala e podem ser reutilizadas nos registros.
CREATE TABLE behavior_tag (
    id UUID NOT NULL,
    room_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    CONSTRAINT pk_behavior_tag PRIMARY KEY (id),
    CONSTRAINT fk_behavior_tag_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
);

CREATE INDEX idx_behavior_tag_room_id ON behavior_tag (room_id); -- BehaviorTagRepository filtra por room_id e ordena pelo nome; o índice reduz as tags candidatas da sala.

-- O registro precisa ter uma tag, um texto não vazio, ou ambos, conforme a constraint da entidade.
CREATE TABLE behavior_record (
    id UUID NOT NULL,
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    tag_id UUID,
    text VARCHAR(500),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_behavior_record PRIMARY KEY (id),
    CONSTRAINT ck_has_tag_or_text CHECK (
        tag_id IS NOT NULL OR (text IS NOT NULL AND BTRIM(text) <> '')
    ),
    CONSTRAINT fk_behavior_record_session FOREIGN KEY (session_id) REFERENCES tutoring_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_behavior_record_student FOREIGN KEY (student_id) REFERENCES users (id),
    CONSTRAINT fk_behavior_record_tag FOREIGN KEY (tag_id) REFERENCES behavior_tag (id) ON DELETE CASCADE
);

CREATE INDEX idx_behavior_record_session_id ON behavior_record (session_id); -- Permite filtrar registros pela sessão sem percorrer registros de outras sessões.
CREATE INDEX idx_behavior_record_student_id ON behavior_record (student_id); -- Permite filtrar registros pelo aluno sem percorrer registros de outros alunos.
CREATE INDEX idx_behavior_record_tag_id ON behavior_record (tag_id); -- Permite localizar registros que referenciam a tag sem percorrer toda a tabela.

-- Tabela de desempenho pertence a exatamente uma sala OU a exatamente um problema, nunca aos 2 simultanemanete, semelhante a um XOR.
CREATE TABLE performance_tables (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    room_id UUID,
    problem_id UUID,
    CONSTRAINT pk_performance_tables PRIMARY KEY (id),
    CONSTRAINT chk_performance_table_owner CHECK (
        (room_id IS NOT NULL AND problem_id IS NULL)
        OR (room_id IS NULL AND problem_id IS NOT NULL)
    ),
    CONSTRAINT fk_performance_tables_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
    CONSTRAINT fk_performance_tables_problem FOREIGN KEY (problem_id) REFERENCES problems (id) ON DELETE CASCADE
);

CREATE INDEX idx_performance_tables_room_id ON performance_tables (room_id); -- As consultas por tabela de desempenho da sala filtram room_id; o índice atende esse lado do proprietário opcional.
CREATE INDEX idx_performance_tables_problem_id ON performance_tables (problem_id); -- As consultas por tabela de desempenho do problema filtram problem_id; o índice atende o outro lado do proprietário opcional.

-- Critérios pertencem a uma tabela; description é opcional e weight é armazenado como double precision.
CREATE TABLE criteria (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    weight DOUBLE PRECISION NOT NULL,
    performance_table_id UUID NOT NULL,
    CONSTRAINT pk_criteria PRIMARY KEY (id),
    CONSTRAINT fk_criteria_performance_table FOREIGN KEY (performance_table_id) REFERENCES performance_tables (id) ON DELETE CASCADE
);

CREATE INDEX idx_criteria_performance_table_id ON criteria (performance_table_id); -- CriterionRepository.findByPerformanceTableId filtra pela tabela; o índice evita percorrer critérios de outras tabelas.

-- Token de redefinição é associado a um usuário; o ID usa identidade, ao contrário dos UUIDs das demais entidades.
CREATE TABLE password_reset_token (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY,
    token VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL,
    CONSTRAINT pk_password_reset_token PRIMARY KEY (id),
    CONSTRAINT uk_password_reset_token_token UNIQUE (token),
    CONSTRAINT fk_password_reset_token_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_password_reset_token_user_id_id ON password_reset_token (user_id, id DESC); -- Corresponde ao filtro por usuário e à ordenação decrescente por ID, permitindo obter o token mais recente sem ordenar todos os tokens.
