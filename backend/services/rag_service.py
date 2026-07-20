"""
RAG 向量数据库服务 - PostgreSQL + PGVector版
使用 PostgreSQL + PGVector 存储文档向量，支持语义检索
"""
import os
from typing import List, Dict, Optional
import hashlib
import json

import psycopg2
from psycopg2.extras import execute_values
from pgvector.psycopg2 import register_vector
from openai import OpenAI

# PostgreSQL 配置
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_DATABASE = os.getenv("PG_DATABASE", "mindweave")
PG_USER = os.getenv("PG_USER", "postgres")
PG_PASSWORD = os.getenv("PG_PASSWORD", "postgres")

# OpenAI Embedding 配置
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536  # text-embedding-3-small 的维度


def get_embedding(text: str, api_key: str) -> List[float]:
    """获取文本的向量表示"""
    client = OpenAI(api_key=api_key)
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding


def get_connection():
    """获取数据库连接"""
    conn = psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        database=PG_DATABASE,
        user=PG_USER,
        password=PG_PASSWORD
    )
    # 注册 pgvector
    register_vector(conn)
    return conn


def init_database():
    """初始化数据库表"""
    conn = get_connection()
    cur = conn.cursor()
    
    # 创建 pgvector 扩展
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    
    # 创建知识库表
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
            id VARCHAR(100) PRIMARY KEY,
            kb_name VARCHAR(255) NOT NULL,
            filename VARCHAR(500) NOT NULL,
            file_type VARCHAR(50),
            chunk_index INTEGER,
            content TEXT NOT NULL,
            embedding vector({EMBEDDING_DIM}),
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 创建向量索引（使用 IVFFlat 索引）
    cur.execute("""
        CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx 
        ON knowledge_chunks 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    """)
    
    # 创建知识库名称索引
    cur.execute("""
        CREATE INDEX IF NOT EXISTS knowledge_chunks_kb_name_idx 
        ON knowledge_chunks (kb_name);
    """)
    
    # 创建文件名索引
    cur.execute("""
        CREATE INDEX IF NOT EXISTS knowledge_chunks_filename_idx 
        ON knowledge_chunks (kb_name, filename);
    """)
    
    conn.commit()
    cur.close()
    conn.close()


class RAGService:
    """RAG 向量检索服务 - PostgreSQL + PGVector版"""
    
    def __init__(self, kb_name: str):
        self.kb_name = kb_name
        # 初始化数据库
        init_database()
    
    def _get_connection(self):
        """获取数据库连接"""
        return get_connection()
    
    def add_document(self, doc_id: str, content: str, api_key: str, metadata: Optional[Dict] = None):
        """
        添加文档到向量数据库
        
        Args:
            doc_id: 文档唯一ID
            content: 文档内容
            api_key: OpenAI API Key
            metadata: 元数据（如文件名、页码等）
        """
        if not content or not content.strip():
            return
        
        # 生成向量
        embedding = get_embedding(content, api_key)
        
        # 准备元数据
        meta = metadata or {}
        
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                INSERT INTO knowledge_chunks (id, kb_name, filename, file_type, chunk_index, content, embedding, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata
            """, (
                doc_id,
                self.kb_name,
                meta.get("filename", ""),
                meta.get("file_type", ""),
                meta.get("chunk_index", 0),
                content,
                embedding,
                json.dumps(meta)
            ))
            conn.commit()
        finally:
            cur.close()
            conn.close()
    
    def add_documents_batch(self, documents: List[Dict], api_key: str):
        """
        批量添加文档
        
        Args:
            documents: [{"id": str, "content": str, "metadata": dict}, ...]
            api_key: OpenAI API Key
        """
        if not documents:
            return
        
        # 批量生成向量
        contents = [doc["content"] for doc in documents]
        embeddings = [get_embedding(content, api_key) for content in contents]
        
        # 准备数据
        data = []
        for i, doc in enumerate(documents):
            meta = doc.get("metadata", {})
            data.append((
                doc["id"],
                self.kb_name,
                meta.get("filename", ""),
                meta.get("file_type", ""),
                meta.get("chunk_index", 0),
                doc["content"],
                embeddings[i],
                json.dumps(meta)
            ))
        
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            execute_values(
                cur,
                """
                INSERT INTO knowledge_chunks (id, kb_name, filename, file_type, chunk_index, content, embedding, metadata)
                VALUES %s
                ON CONFLICT (id) DO UPDATE SET
                    content = EXCLUDED.content,
                    embedding = EXCLUDED.embedding,
                    metadata = EXCLUDED.metadata
                """,
                data
            )
            conn.commit()
        finally:
            cur.close()
            conn.close()
    
    def search(self, query: str, api_key: str, top_k: int = 5) -> List[Dict]:
        """
        语义检索
        
        Args:
            query: 查询文本
            api_key: OpenAI API Key
            top_k: 返回结果数量
            
        Returns:
            [{"id": str, "content": str, "metadata": dict, "distance": float}, ...]
        """
        # 生成查询向量
        query_embedding = get_embedding(query, api_key)
        
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            # 使用余弦相似度检索
            cur.execute("""
                SELECT id, content, filename, file_type, chunk_index, metadata,
                       1 - (embedding <=> %s) as similarity
                FROM knowledge_chunks
                WHERE kb_name = %s
                ORDER BY embedding <=> %s
                LIMIT %s
            """, (query_embedding, self.kb_name, query_embedding, top_k))
            
            results = cur.fetchall()
            
            # 格式化结果
            formatted_results = []
            for row in results:
                formatted_results.append({
                    "id": row[0],
                    "content": row[1],
                    "metadata": {
                        "filename": row[2],
                        "file_type": row[3],
                        "chunk_index": row[4],
                        "metadata": row[5]
                    },
                    "distance": 1 - row[6]  # 转换为距离
                })
            
            return formatted_results
        finally:
            cur.close()
            conn.close()
    
    def delete_document(self, doc_id: str):
        """删除文档"""
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("DELETE FROM knowledge_chunks WHERE id = %s", (doc_id,))
            conn.commit()
        finally:
            cur.close()
            conn.close()
    
    def delete_by_file(self, filename: str):
        """删除指定文件的所有片段"""
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute(
                "DELETE FROM knowledge_chunks WHERE kb_name = %s AND filename = %s",
                (self.kb_name, filename)
            )
            conn.commit()
        finally:
            cur.close()
            conn.close()
    
    def clear_all(self):
        """清空知识库的所有向量数据"""
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("DELETE FROM knowledge_chunks WHERE kb_name = %s", (self.kb_name,))
            conn.commit()
        finally:
            cur.close()
            conn.close()
    
    def count(self) -> int:
        """获取文档数量"""
        conn = self._get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("SELECT COUNT(*) FROM knowledge_chunks WHERE kb_name = %s", (self.kb_name,))
            return cur.fetchone()[0]
        finally:
            cur.close()
            conn.close()
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        return {
            "document_count": self.count(),
            "kb_name": self.kb_name,
            "vector_store": "PostgreSQL + PGVector"
        }


def split_text_into_chunks(text: str, chunk_size: int = 500, overlap: int = 50) -> List[Dict]:
    """
    将文本分割成块
    
    Args:
        text: 原始文本
        chunk_size: 每块字符数
        overlap: 重叠字符数
        
    Returns:
        [{"content": str, "start": int, "end": int}, ...]
    """
    if not text:
        return []
    
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        
        # 尝试在句子边界处分割
        if end < text_length:
            # 向后查找句子结束符
            for sep in ["。", "！", "？", ".", "!", "?", "\n\n", "\n"]:
                idx = text.rfind(sep, start, end + 100)
                if idx > start:
                    end = idx + 1
                    break
        
        chunk_content = text[start:end].strip()
        if chunk_content:
            chunks.append({
                "content": chunk_content,
                "start": start,
                "end": end
            })
        
        start = end - overlap if end < text_length else text_length
    
    return chunks


def process_document_for_rag(kb_name: str, filename: str, content: str, file_type: str, api_key: str) -> int:
    """
    处理文档并添加到向量数据库
    
    Args:
        kb_name: 知识库名称
        filename: 文件名
        content: 文档内容
        file_type: 文件类型
        api_key: OpenAI API Key
        
    Returns:
        添加的文档块数量
    """
    rag = RAGService(kb_name)
    
    # 先删除该文件的旧数据
    rag.delete_by_file(filename)
    
    # 分割文本
    chunks = split_text_into_chunks(content)
    
    # 添加到向量数据库
    documents = []
    for i, chunk in enumerate(chunks):
        doc_id = f"{kb_name}_{filename}_{i}"
        documents.append({
            "id": doc_id,
            "content": chunk["content"],
            "metadata": {
                "filename": filename,
                "file_type": file_type,
                "chunk_index": i,
                "total_chunks": len(chunks)
            }
        })
    
    if documents:
        rag.add_documents_batch(documents, api_key)
    
    return len(documents)