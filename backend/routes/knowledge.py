"""
知识处理API路由
处理文档上传、向量化、知识点提取
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from pathlib import Path

from services.rag_service import process_document_for_rag
from services.wiki_service import process_document_for_wiki

router = APIRouter(prefix="/api/knowledge", tags=["知识处理"])

# 知识库根目录
KB_ROOT = Path(__file__).parent.parent / "knowledge_bases"


class ProcessRequest(BaseModel):
    """处理请求"""
    kb_name: str
    filename: str
    process_type: str = "both"  # "rag", "wiki", "both"
    api_key: str  # OpenAI API Key for embeddings


class ProcessResponse(BaseModel):
    """处理响应"""
    status: str
    rag_chunks: Optional[int] = None
    wiki_points: Optional[int] = None
    wiki_relations: Optional[int] = None


async def process_document_task(kb_name: str, filename: str, content: str, file_type: str, api_key: str):
    """
    后台处理文档任务
    
    Args:
        kb_name: 知识库名称
        filename: 文件名
        content: 文档内容
        file_type: 文件类型
        api_key: OpenAI API Key
    """
    # 1. RAG处理
    rag_chunks = process_document_for_rag(kb_name, filename, content, file_type, api_key)
    print(f"RAG处理完成: {filename}, 分块数: {rag_chunks}")
    
    # 2. Wiki处理
    wiki_result = await process_document_for_wiki(kb_name, filename, content)
    print(f"Wiki处理完成: {filename}, 知识点: {wiki_result.get('knowledge_points_added', 0)}")


@router.post("/process", response_model=ProcessResponse)
async def process_document(request: ProcessRequest, background_tasks: BackgroundTasks):
    """
    处理已上传的文档
    
    将文档添加到向量数据库并提取知识点
    """
    kb_path = KB_ROOT / request.kb_name
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    file_path = kb_path / request.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    if not request.api_key:
        raise HTTPException(status_code=400, detail="请提供 OpenAI API Key")
    
    # 读取文件内容
    file_type = request.filename.split(".")[-1].lower()
    
    if file_type == "pdf":
        # PDF需要特殊处理
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            content = "\n".join([page.extract_text() or "" for page in pdf.pages])
    else:
        # MD和文本文件
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    
    if not content or not content.strip():
        raise HTTPException(status_code=400, detail="文件内容为空")
    
    # 后台处理
    if request.process_type == "both":
        background_tasks.add_task(
            process_document_task,
            request.kb_name,
            request.filename,
            content,
            file_type,
            request.api_key
        )
        return ProcessResponse(
            status="processing",
            rag_chunks=None,
            wiki_points=None
        )
    
    elif request.process_type == "rag":
        chunks = process_document_for_rag(request.kb_name, request.filename, content, file_type, request.api_key)
        return ProcessResponse(
            status="completed",
            rag_chunks=chunks
        )
    
    elif request.process_type == "wiki":
        result = await process_document_for_wiki(request.kb_name, request.filename, content)
        return ProcessResponse(
            status="completed",
            wiki_points=result.get("knowledge_points_added", 0),
            wiki_relations=result.get("relations_added", 0)
        )
    
    raise HTTPException(status_code=400, detail="无效的处理类型")


@router.get("/stats/{kb_name}")
async def get_knowledge_stats(kb_name: str):
    """
    获取知识库统计信息
    """
    from services.hybrid_search_service import HybridSearchService
    
    kb_path = KB_ROOT / kb_name
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    service = HybridSearchService(kb_name)
    return service.get_stats()


@router.delete("/clear/{kb_name}")
async def clear_knowledge(kb_name: str):
    """
    清空知识库的所有知识数据（RAG和Wiki）
    """
    from services.rag_service import RAGService
    from services.wiki_service import WikiService
    
    kb_path = KB_ROOT / kb_name
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 清空RAG
    rag = RAGService(kb_name)
    rag.clear_all()
    
    # 清空Wiki
    wiki = WikiService(kb_name)
    wiki.clear_all()
    
    return {"status": "success", "message": "知识数据已清空"}