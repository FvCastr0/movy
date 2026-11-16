-- Criação idempotente do banco de dados movy_db no PostgreSQL
SELECT 'CREATE DATABASE movy_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'movy_db')\gexec
