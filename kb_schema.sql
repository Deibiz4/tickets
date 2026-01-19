-- Knowledge Base Categories
CREATE TABLE IF NOT EXISTS tickets.kb_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Base Articles
CREATE TABLE IF NOT EXISTS tickets.kb_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category_id INTEGER REFERENCES tickets.kb_categories(id) ON DELETE SET NULL,
    author_id INTEGER REFERENCES tickets.users(id),
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Categories
INSERT INTO tickets.kb_categories (name, description) VALUES 
('General', 'Preguntas frecuentes y ayuda general'),
('Sistemas', 'Problemas con ordenadores, impresoras y red'),
('Software', 'Ayuda con programas y aplicaciones corporativas')
ON CONFLICT DO NOTHING;
