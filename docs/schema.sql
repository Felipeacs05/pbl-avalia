-- ==============================================================================
-- Relational Database Schema - Avalia-system (PostgreSQL)
-- All IDs use UUID
-- Cascading architecture for the PBL model:
-- Rooms -> Problems -> Sessions -> Attendance Records & Evaluations
-- ==============================================================================

-- 1. Users (Teachers/Tutors and Students)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    profile_picture_url VARCHAR(255)
    );

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- 2. PBL Tutoring Rooms
CREATE TABLE IF NOT EXISTS room (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    access_code VARCHAR(50) NOT NULL UNIQUE,
    tutor_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_room_tutor
    FOREIGN KEY (tutor_id)
    REFERENCES users(id)
                         ON DELETE RESTRICT
    );

CREATE INDEX IF NOT EXISTS idx_room_tutor ON room(tutor_id);


-- 3. Student-Room Association (Many-to-Many)
CREATE TABLE IF NOT EXISTS room_student (
    room_id UUID NOT NULL,
    student_id UUID NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (room_id, student_id),

    CONSTRAINT fk_room_student_room
    FOREIGN KEY (room_id)
    REFERENCES room(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_room_student_student
    FOREIGN KEY (student_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    );


-- 4. Problems (belong to a Room)
CREATE TABLE IF NOT EXISTS problem (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 1,

    CONSTRAINT fk_problem_room
    FOREIGN KEY (room_id)
    REFERENCES room(id)
    ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_problem_room ON problem(room_id);


-- 5. Tutoring Sessions (Problem opening / closing)
CREATE TABLE IF NOT EXISTS session (
    id UUID PRIMARY KEY,
    problem_id UUID NOT NULL,
    session_number INT NOT NULL DEFAULT 1,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',

    CONSTRAINT fk_session_problem
    FOREIGN KEY (problem_id)
    REFERENCES problem(id)
    ON DELETE CASCADE
    );

CREATE INDEX IF NOT EXISTS idx_session_problem ON session(problem_id);


-- 6. Attendance Records per Session
CREATE TABLE IF NOT EXISTS attendance_record (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    present BOOLEAN NOT NULL DEFAULT TRUE,
    justification VARCHAR(255),

    CONSTRAINT uk_session_student_attendance
    UNIQUE (session_id, student_id),

    CONSTRAINT fk_attendance_session
    FOREIGN KEY (session_id)
    REFERENCES session(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_attendance_student
    FOREIGN KEY (student_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    );


-- 7. Evaluation / Grade Records per Session
CREATE TABLE IF NOT EXISTS evaluation (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    student_id UUID NOT NULL,
    evaluator_id UUID NOT NULL,
    performance_score NUMERIC(4, 2)
    CHECK (performance_score >= 0 AND performance_score <= 10),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_evaluation_session
    FOREIGN KEY (session_id)
    REFERENCES session(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_student
    FOREIGN KEY (student_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_evaluation_evaluator
    FOREIGN KEY (evaluator_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    );