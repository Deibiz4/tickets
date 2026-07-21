INSERT INTO tickets.departments (name) VALUES 
    ('Compras'),
    ('SAT')
ON CONFLICT (name) DO NOTHING;
