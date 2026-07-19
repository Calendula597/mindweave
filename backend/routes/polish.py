"""
LLM润色服务路由
提供笔记润色、标题生成、结构整理等功能
"""
import httpx
import yaml
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/polish", tags=["polish"])

# 知识库根目录
KB_ROOT = Path(__file__).parent.parent / "knowledge_bases"


class PolishRequest(BaseModel):
    """润色请求"""
    content: str
    polish_type: str  # title, text, structure, summary, all
    kb_name: Optional[str] = None


class PolishResponse(BaseModel):
    """润色响应"""
    original: str
    polished: str
    title: Optional[str] = None
    summary: Optional[str] = None


def load_kb_llm_config(kb_name: str) -> dict:
    """加载知识库LLM配置"""
    config_path = KB_ROOT / kb_name / "config.yaml"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
            return config.get("llm", {})
    return {}


def load_global_llm_config() -> dict:
    """加载全局LLM配置"""
    config_path = Path(__file__).parent.parent / "config.yaml"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
            return config.get("llm", {})
    return {}


def get_llm_config(kb_name: Optional[str] = None) -> dict:
    """获取LLM配置（优先使用知识库配置）"""
    if kb_name:
        kb_config = load_kb_llm_config(kb_name)
        if kb_config.get("api_key"):
            return kb_config
    return load_global_llm_config()


async def call_llm(prompt: str, config: dict) -> str:
    """调用LLM API"""
    if not config.get("api_key"):
        raise HTTPException(status_code=400, detail="未配置API Key")
    
    api_key = config.get("api_key", "")
    model = config.get("model", "gpt-4o-mini")
    base_url = config.get("base_url", "https://api.openai.com/v1")
    temperature = config.get("temperature", 0.7)
    max_tokens = config.get("max_tokens", 4096)
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"LLM调用失败: {response.text}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM调用错误: {str(e)}")


def build_polish_prompt(content: str, polish_type: str) -> str:
    """构建润色提示词"""
    if polish_type == "title":
        return f"""请根据以下笔记内容，生成一个简洁明了的标题（不超过20字）。

笔记内容：
{content}

请只返回标题，不要有其他内容。"""

    elif polish_type == "text":
        return f"""请对以下笔记内容进行文字润色，要求：
1. 优化表达，使文字更加流畅自然
2. 修正可能的语法错误和错别字
3. 保持原文的核心意思不变
4. 保持Markdown格式

笔记内容：
{content}

请只返回润色后的内容，不要有其他说明。"""

    elif polish_type == "structure":
        return f"""请对以下笔记内容进行结构整理，要求：
1. 合理划分段落
2. 添加适当的小标题
3. 调整内容的逻辑顺序
4. 保持Markdown格式

笔记内容：
{content}

请只返回整理后的内容，不要有其他说明。"""

    elif polish_type == "summary":
        return f"""请为以下笔记内容生成一个摘要，要求：
1. 概括主要内容
2. 提取关键要点
3. 不超过200字

笔记内容：
{content}

请只返回摘要内容，不要有其他说明。"""

    elif polish_type == "all":
        return f"""请对以下笔记内容进行综合润色，包括：
1. 生成一个合适的标题
2. 润色文字表达
3. 整理结构
4. 生成摘要

请按以下格式返回：
## 标题
[生成的标题]

## 润色后内容
[润色整理后的内容]

## 摘要
[内容摘要]

笔记内容：
{content}"""

    return content


@router.post("", response_model=PolishResponse)
async def polish_content(request: PolishRequest):
    """
    润色笔记内容
    """
    if not request.content or not request.content.strip():
        raise HTTPException(status_code=400, detail="内容不能为空")
    
    # 获取LLM配置
    config = get_llm_config(request.kb_name)
    
    if not config.get("api_key"):
        raise HTTPException(status_code=400, detail="请先配置API Key")
    
    # 构建提示词
    prompt = build_polish_prompt(request.content, request.polish_type)
    
    # 调用LLM
    result = await call_llm(prompt, config)
    
    # 处理结果
    if request.polish_type == "all":
        # 解析综合润色结果
        title = None
        polished = result
        summary = None
        
        if "## 标题" in result:
            parts = result.split("## ")
            for part in parts:
                if part.startswith("标题"):
                    lines = part.split("\n")
                    if len(lines) > 1:
                        title = lines[1].strip()
                elif part.startswith("润色后内容"):
                    polished = "## " + part.replace("润色后内容", "").strip()
                elif part.startswith("摘要"):
                    lines = part.split("\n")
                    if len(lines) > 1:
                        summary = lines[1].strip()
        
        return PolishResponse(
            original=request.content,
            polished=polished,
            title=title,
            summary=summary
        )
    
    elif request.polish_type == "title":
        return PolishResponse(
            original=request.content,
            polished=request.content,
            title=result.strip()
        )
    
    elif request.polish_type == "summary":
        return PolishResponse(
            original=request.content,
            polished=request.content,
            summary=result.strip()
        )
    
    else:
        return PolishResponse(
            original=request.content,
            polished=result
        )


@router.post("/title")
async def generate_title(request: PolishRequest):
    """
    生成标题
    """
    request.polish_type = "title"
    return await polish_content(request)


@router.post("/summary")
async def generate_summary(request: PolishRequest):
    """
    生成摘要
    """
    request.polish_type = "summary"
    return await polish_content(request)