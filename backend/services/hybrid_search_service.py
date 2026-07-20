"""
混合检索服务
结合 RAG 和 Wiki 进行智能检索和问答
"""
from typing import List, Dict, Optional
import httpx
import yaml
from pathlib import Path

from services.rag_service import RAGService
from services.wiki_service import WikiService

# 知识库根目录
KB_ROOT = Path(__file__).parent.parent / "knowledge_bases"


class HybridSearchService:
    """混合检索服务"""
    
    def __init__(self, kb_name: str):
        self.kb_name = kb_name
        self.rag = RAGService(kb_name)
        self.wiki = WikiService(kb_name)
    
    async def analyze_question_type(self, question: str, config: dict) -> str:
        """
        分析问题类型
        
        Returns:
            "概念解释" | "事实查询" | "操作步骤" | "对比分析" | "综合问答"
        """
        api_key = config.get("api_key", "")
        if not api_key:
            return "综合问答"
        
        model = config.get("model", "gpt-4o-mini")
        base_url = config.get("base_url", "https://api.openai.com/v1")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        prompt = f"""分析以下问题的类型，只返回类型名称，不要其他内容。

问题：{question}

类型选项：
- 概念解释：询问某个概念、术语的含义
- 事实查询：询问具体事实、数据、内容
- 操作步骤：询问如何做某事
- 对比分析：比较两个或多个事物的区别
- 综合问答：其他类型的问题

只返回类型名称，如"概念解释"."""

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 50
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    result = data["choices"][0]["message"]["content"].strip()
                    
                    # 验证返回的类型
                    valid_types = ["概念解释", "事实查询", "操作步骤", "对比分析", "综合问答"]
                    if result in valid_types:
                        return result
        except Exception as e:
            print(f"分析问题类型失败: {e}")
        
        return "综合问答"
    
    def search_rag(self, query: str, api_key: str, top_k: int = 5) -> List[Dict]:
        """RAG检索"""
        try:
            return self.rag.search(query, api_key, top_k)
        except Exception as e:
            print(f"RAG检索失败: {e}")
            return []
    
    def search_wiki(self, query: str, top_k: int = 3) -> List[Dict]:
        """Wiki检索"""
        return self.wiki.search(query, top_k)
    
    async def hybrid_search(self, question: str, config: dict) -> Dict:
        """
        混合检索
        
        Args:
            question: 用户问题
            config: LLM配置
            
        Returns:
            {
                "question_type": str,
                "rag_results": [...],
                "wiki_results": [...],
                "context": str
            }
        """
        api_key = config.get("api_key", "")
        
        # 1. 分析问题类型
        question_type = await self.analyze_question_type(question, config)
        
        # 2. 并行检索
        rag_results = self.search_rag(question, api_key, top_k=5)
        wiki_results = self.search_wiki(question, top_k=3)
        
        # 3. 根据问题类型构建上下文
        context = self._build_context(question_type, rag_results, wiki_results)
        
        return {
            "question_type": question_type,
            "rag_results": rag_results,
            "wiki_results": wiki_results,
            "context": context
        }
    
    def _build_context(self, question_type: str, rag_results: List[Dict], wiki_results: List[Dict]) -> str:
        """构建回答上下文"""
        context_parts = []
        
        if question_type == "概念解释":
            # Wiki优先
            if wiki_results:
                context_parts.append("【知识点解释】")
                for i, wp in enumerate(wiki_results[:2], 1):
                    context_parts.append(f"{i}. {wp.get('title', '')}\n{wp.get('content', '')}\n")
            
            if rag_results:
                context_parts.append("\n【相关原文】")
                context_parts.append(rag_results[0].get("content", ""))
        
        elif question_type == "事实查询":
            # RAG优先
            if rag_results:
                context_parts.append("【相关原文】")
                for i, rr in enumerate(rag_results[:3], 1):
                    context_parts.append(f"{i}. {rr.get('content', '')}\n")
            
            if wiki_results:
                context_parts.append("\n【知识点补充】")
                context_parts.append(wiki_results[0].get("content", ""))
        
        elif question_type == "对比分析":
            # Wiki优先
            if wiki_results:
                context_parts.append("【相关知识点】")
                for wp in wiki_results:
                    context_parts.append(f"- {wp.get('title', '')}: {wp.get('content', '')}\n")
            
            if rag_results:
                context_parts.append("\n【参考内容】")
                for rr in rag_results[:2]:
                    context_parts.append(f"{rr.get('content', '')}\n")
        
        else:
            # 综合问答 - 两者结合
            if wiki_results:
                context_parts.append("【知识点】")
                for wp in wiki_results[:2]:
                    context_parts.append(f"- {wp.get('title', '')}: {wp.get('content', '')}\n")
            
            if rag_results:
                context_parts.append("\n【相关原文】")
                for rr in rag_results[:2]:
                    context_parts.append(f"{rr.get('content', '')}\n")
        
        return "\n".join(context_parts)
    
    async def answer_question(self, question: str, config: dict) -> Dict:
        """
        回答问题
        
        Args:
            question: 用户问题
            config: LLM配置
            
        Returns:
            {
                "answer": str,
                "question_type": str,
                "sources": [...]
            }
        """
        # 混合检索
        search_result = await self.hybrid_search(question, config)
        
        # 如果没有检索到任何内容
        if not search_result["rag_results"] and not search_result["wiki_results"]:
            return {
                "answer": "抱歉，我在知识库中没有找到相关信息。请尝试上传相关文档后再提问。",
                "question_type": search_result["question_type"],
                "sources": []
            }
        
        # 调用LLM生成回答
        answer = await self._generate_answer(question, search_result["context"], config)
        
        # 构建来源信息
        sources = []
        for rr in search_result["rag_results"][:2]:
            sources.append({
                "type": "文档片段",
                "filename": rr.get("metadata", {}).get("filename", "未知"),
                "preview": rr.get("content", "")[:100] + "..."
            })
        for wp in search_result["wiki_results"][:2]:
            sources.append({
                "type": "知识点",
                "title": wp.get("title", "未知"),
                "preview": wp.get("content", "")[:100] + "..."
            })
        
        return {
            "answer": answer,
            "question_type": search_result["question_type"],
            "sources": sources
        }
    
    async def _generate_answer(self, question: str, context: str, config: dict) -> str:
        """调用LLM生成回答"""
        api_key = config.get("api_key", "")
        if not api_key:
            return "抱歉，知识库尚未配置LLM。请先在知识库设置中配置API Key。"
        
        model = config.get("model", "gpt-4o-mini")
        base_url = config.get("base_url", "https://api.openai.com/v1")
        system_prompt = config.get("system_prompt", "你是一个专业的学习助手。")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        prompt = f"""{system_prompt}

请根据以下知识库内容回答用户问题。

知识库内容：
{context}

用户问题：{question}

请给出准确、详细的回答。如果知识库内容不足以回答问题，请诚实说明。"""

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    return f"生成回答失败：{response.status_code}"
        except Exception as e:
            return f"生成回答时出错：{str(e)}"
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        rag_stats = self.rag.get_stats()
        wiki_stats = self.wiki.get_stats()
        
        return {
            "kb_name": self.kb_name,
            "rag": rag_stats,
            "wiki": wiki_stats
        }


def get_kb_llm_config(kb_name: str) -> dict:
    """获取知识库LLM配置"""
    config_path = KB_ROOT / kb_name / "config.yaml"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
            return config.get("llm", {})
    return {}