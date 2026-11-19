-- Criação idempotente do banco de dados movy_db e movy_concierge_db no PostgreSQL
SELECT 'CREATE DATABASE movy_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'movy_db')\gexec

SELECT 'CREATE DATABASE movy_concierge_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'movy_concierge_db')\gexec
