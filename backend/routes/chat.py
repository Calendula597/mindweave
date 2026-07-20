"""
智能问答API路由
提供基于混合检索的问答功能
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path

from services.hybrid_search_service import HybridSearchService, get_kb_llm_config

router = APIRouter(prefix="/api/chat", tags=["智能问答"])

# 知识库根目录
KB_ROOT = Path(__file__).parent.parent / "knowledge_bases"


class ChatRequest(BaseModel):
    """问答请求"""
    kb_name: str
    question: str


class SourceInfo(BaseModel):
    """来源信息"""
    type: str
    filename: Optional[str] = None
    title: Optional[str] = None
    preview: str


class ChatResponse(BaseModel):
    """问答响应"""
    answer: str
    question_type: str
    sources: List[SourceInfo]


@router.post("/ask", response_model=ChatResponse)
async def ask_question(request: ChatRequest):
    """
    向知识库提问
    
    使用混合检索（RAG + Wiki）获取相关内容，并使用LLM生成回答
    """
    kb_path = KB_ROOT / request.kb_name
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="问题不能为空")
    
    # 获取知识库LLM配置
    config = get_kb_llm_config(request.kb_name)
    
    if not config.get("api_key"):
        raise HTTPException(status_code=400, detail="知识库尚未配置LLM，请先在知识库设置中配置API Key")
    
    # 混合检索并回答
    service = HybridSearchService(request.kb_name)
    result = await service.answer_question(request.question, config)
    
    return ChatResponse(
        answer=result["answer"],
        question_type=result["question_type"],
        sources=[
            SourceInfo(
                type=s.get("type", ""),
                filename=s.get("filename"),
                title=s.get("title"),
                preview=s.get("preview", "")
            )
            for s in result["sources"]
        ]
    )


@router.post("/search")
async def search_knowledge(request: ChatRequest):
    """
    搜索知识库
    
    返回相关的文档片段和知识点，不生成回答
    """
    kb_path = KB_ROOT / request.kb_name
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    service = HybridSearchService(request.kb_name)
    config = get_kb_llm_config(request.kb_name)
    
    result = await service.hybrid_search(request.question, config)
    
    return {
        "question_type": result["question_type"],
        "rag_results": result["rag_results"],
        "wiki_results": result["wiki_results"]
    }


@router.get("/history/{kb_name}")
async def get_chat_history(kb_name: str, limit: int = 50):
    """
    获取聊天历史
    
    注：目前返回空列表，后续可添加持久化功能
    """
    return {"history": []}