-- 初始化 PGVector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建知识库表
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id VARCHAR(100) PRIMARY KEY,
    kb_name VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    chunk_index INTEGER,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建向量索引（使用 IVFFlat 索引）
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx 
ON knowledge_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 创建知识库名称索引
CREATE INDEX IF NOT EXISTS knowledge_chunks_kb_name_idx 
ON knowledge_chunks (kb_name);

-- 创建文件名索引
CREATE INDEX IF NOT EXISTS knowledge_chunks_filename_idx 
ON knowledge_chunks (kb_name, filename);

-- 创建知识点表
CREATE TABLE IF NOT EXISTS knowledge_points (
    id VARCHAR(100) PRIMARY KEY,
    kb_name VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    source VARCHAR(500),
    tags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建知识点索引
CREATE INDEX IF NOT EXISTS knowledge_points_kb_name_idx 
ON knowledge_points (kb_name);

-- 创建知识关联表
CREATE TABLE IF NOT EXISTS knowledge_relations (
    id VARCHAR(100) PRIMARY KEY,
    kb_name VARCHAR(255) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    relation_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建关联索引
CREATE INDEX IF NOT EXISTS knowledge_relations_kb_name_idx 
ON knowledge_relations (kb_name);

-- 创建学习任务表
CREATE TABLE IF NOT EXISTS learning_tasks (
    id VARCHAR(100) PRIMARY KEY,
    kb_name VARCHAR(255),
    knowledge_point TEXT,
    review_count INTEGER DEFAULT 0,
    next_review_date DATE,
    status VARCHAR(50) DEFAULT 'learning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建学习任务索引
CREATE INDEX IF NOT EXISTS learning_tasks_status_idx 
ON learning_tasks (status, next_review_date);