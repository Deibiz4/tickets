CREATE TABLE IF NOT EXISTS tickets.kb_attachments (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES tickets.kb_articles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES tickets.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
