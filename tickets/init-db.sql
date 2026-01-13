-- Crear esquema
CREATE SCHEMA IF NOT EXISTS tickets;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS tickets.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'agent', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de categorías de tickets
CREATE TABLE IF NOT EXISTS tickets.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tickets
CREATE TABLE IF NOT EXISTS tickets.tickets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'in_progress', 'waiting', 'closed')),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    category_id INTEGER REFERENCES tickets.categories(id),
    created_by INTEGER REFERENCES tickets.users(id) NOT NULL,
    assigned_to INTEGER REFERENCES tickets.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de comentarios en tickets
CREATE TABLE IF NOT EXISTS tickets.comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets.tickets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES tickets.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de archivos adjuntos
CREATE TABLE IF NOT EXISTS tickets.attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES tickets.tickets(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES tickets.comments(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INTEGER REFERENCES tickets.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías por defecto
INSERT INTO tickets.categories (name, description) VALUES 
    ('Soporte Técnico', 'Problemas técnicos y de software'),
    ('Facturación', 'Consultas y problemas de facturación'),
    ('Cuenta de usuario', 'Gestión de cuentas de usuario'),
    ('Sugerencias', 'Sugerencias y mejoras'),
    ('Otros', 'Otras consultas no categorizadas')
ON CONFLICT DO NOTHING;

-- Insertar usuario administrador por defecto (contraseña: admin123)
INSERT INTO tickets.users (username, email, password_hash, full_name, role) VALUES 
    ('admin', 'admin@tickets.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', 'admin')
ON CONFLICT DO NOTHING;
