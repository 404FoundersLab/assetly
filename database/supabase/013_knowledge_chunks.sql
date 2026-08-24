-- RAG knowledge chunks (pgvector). Free stack: Gemini embeddings + Neon Postgres.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_title TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source_type, source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_tenant_idx
  ON knowledge_chunks (tenant_id);

CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx
  ON knowledge_chunks (tenant_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
