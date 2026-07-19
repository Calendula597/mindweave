"""
知识库管理路由
提供知识库的创建、列表、删除、文件管理、LLM配置管理功能
"""
import os
import shutil
import yaml
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/kb", tags=["knowledge-base"])

# 知识库根目录
KB_ROOT = Path(__file__).parent.parent / "knowledge_bases"
KB_ROOT.mkdir(exist_ok=True)

# 允许的文件类型
ALLOWED_EXTENSIONS = {".pdf", ".md", ".markdown"}

# 默认LLM配置模板
DEFAULT_KB_LLM_CONFIG = {
    "llm": {
        "api_key": "",
        "model": "gpt-4o-mini",
        "base_url": "https://api.openai.com/v1",
        "temperature": 0.7,
        "max_tokens": 4096,
        "system_prompt": "你是一个专业的学习助手，负责帮助用户学习和掌握知识库中的内容。"
    }
}


class KnowledgeBase(BaseModel):
    """知识库模型"""
    name: str
    file_count: int
    created_time: str
    updated_time: str
    has_llm_config: bool = False


class KnowledgeBaseList(BaseModel):
    """知识库列表响应"""
    knowledge_bases: List[KnowledgeBase]
    total: int


class KBFile(BaseModel):
    """知识库文件模型"""
    filename: str
    file_type: str  # pdf, markdown, note
    file_size: int
    created_time: str
    updated_time: str


class KBFileList(BaseModel):
    """文件列表响应"""
    files: List[KBFile]
    total: int


class KBLLMConfig(BaseModel):
    """知识库LLM配置模型"""
    api_key: str = ""
    model: str = "gpt-4o-mini"
    base_url: str = "https://api.openai.com/v1"
    temperature: float = 0.7
    max_tokens: int = 4096
    system_prompt: str = ""


def get_file_type(filename: str) -> str:
    """根据文件扩展名获取文件类型"""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    elif ext in [".md", ".markdown"]:
        return "markdown"
    return "unknown"


def format_size(size: int) -> str:
    """格式化文件大小"""
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.2f} {unit}"
        size /= 1024
    return f"{size:.2f} TB"


def get_kb_config_path(kb_name: str) -> Path:
    """获取知识库配置文件路径"""
    return KB_ROOT / kb_name / "config.yaml"


def load_kb_config(kb_name: str) -> dict:
    """加载知识库LLM配置"""
    config_path = get_kb_config_path(kb_name)
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}


def save_kb_config(kb_name: str, config: dict):
    """保存知识库LLM配置"""
    config_path = get_kb_config_path(kb_name)
    with open(config_path, "w", encoding="utf-8") as f:
        yaml.dump(config, f, allow_unicode=True, default_flow_style=False)


# ==================== 知识库管理 ====================

@router.post("/create")
async def create_knowledge_base(name: str):
    """
    创建新的知识库（自动创建LLM配置文件）
    """
    # 验证名称
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="知识库名称不能为空")
    
    name = name.strip()
    kb_path = KB_ROOT / name
    
    # 检查是否已存在
    if kb_path.exists():
        raise HTTPException(status_code=400, detail="知识库已存在")
    
    # 创建目录
    try:
        kb_path.mkdir(parents=True)
        
        # 创建默认LLM配置文件
        save_kb_config(name, DEFAULT_KB_LLM_CONFIG)
        
        return {
            "message": "知识库创建成功",
            "name": name,
            "path": str(kb_path),
            "config_created": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建知识库失败: {str(e)}")


@router.get("/list", response_model=KnowledgeBaseList)
async def list_knowledge_bases():
    """
    获取所有知识库列表
    """
    knowledge_bases = []
    
    if not KB_ROOT.exists():
        return KnowledgeBaseList(knowledge_bases=[], total=0)
    
    for kb_path in KB_ROOT.iterdir():
        if not kb_path.is_dir():
            continue
        
        # 统计文件数量（排除config.yaml）
        file_count = sum(1 for f in kb_path.iterdir() if f.is_file() and f.name != "config.yaml")
        
        # 检查是否有LLM配置
        has_config = get_kb_config_path(kb_path.name).exists()
        
        # 获取创建和修改时间
        stat = kb_path.stat()
        created_time = datetime.fromtimestamp(stat.st_ctime).strftime("%Y-%m-%d %H:%M:%S")
        updated_time = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        
        knowledge_bases.append(KnowledgeBase(
            name=kb_path.name,
            file_count=file_count,
            created_time=created_time,
            updated_time=updated_time,
            has_llm_config=has_config
        ))
    
    # 按更新时间降序排序
    knowledge_bases.sort(key=lambda x: x.updated_time, reverse=True)
    
    return KnowledgeBaseList(knowledge_bases=knowledge_bases, total=len(knowledge_bases))


@router.delete("/delete/{name}")
async def delete_knowledge_base(name: str):
    """
    删除知识库及其所有文件
    """
    kb_path = KB_ROOT / name
    
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    try:
        shutil.rmtree(kb_path)
        return {"message": "知识库删除成功", "name": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除知识库失败: {str(e)}")


@router.put("/rename/{old_name}")
async def rename_knowledge_base(old_name: str, new_name: str):
    """
    重命名知识库
    """
    old_path = KB_ROOT / old_name
    new_path = KB_ROOT / new_name
    
    if not old_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    if new_path.exists():
        raise HTTPException(status_code=400, detail="目标名称已存在")
    
    try:
        old_path.rename(new_path)
        return {"message": "重命名成功", "old_name": old_name, "new_name": new_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重命名失败: {str(e)}")


# ==================== 知识库LLM配置管理 ====================

@router.get("/{kb_name}/config")
async def get_kb_llm_config(kb_name: str):
    """
    获取知识库的LLM配置
    """
    kb_path = KB_ROOT / kb_name
    
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    config = load_kb_config(kb_name)
    llm_config = config.get("llm", {})
    
    return {
        "api_key": llm_config.get("api_key", ""),
        "model": llm_config.get("model", "gpt-4o-mini"),
        "base_url": llm_config.get("base_url", "https://api.openai.com/v1"),
        "temperature": llm_config.get("temperature", 0.7),
        "max_tokens": llm_config.get("max_tokens", 4096),
        "system_prompt": llm_config.get("system_prompt", "")
    }


@router.post("/{kb_name}/config")
async def update_kb_llm_config(kb_name: str, config: KBLLMConfig):
    """
    更新知识库的LLM配置
    """
    kb_path = KB_ROOT / kb_name
    
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 加载现有配置
    existing_config = load_kb_config(kb_name)
    
    # 更新LLM配置
    existing_config["llm"] = {
        "api_key": config.api_key,
        "model": config.model,
        "base_url": config.base_url,
        "temperature": config.temperature,
        "max_tokens": config.max_tokens,
        "system_prompt": config.system_prompt
    }
    
    save_kb_config(kb_name, existing_config)
    
    return {
        "message": "配置更新成功",
        "kb_name": kb_name,
        "config": existing_config["llm"]
    }


# ==================== 文件管理 ====================

@router.get("/{kb_name}/files", response_model=KBFileList)
async def list_kb_files(kb_name: str):
    """
    获取知识库内的文件列表
    """
    kb_path = KB_ROOT / kb_name
    
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    files = []
    for file_path in kb_path.iterdir():
        if not file_path.is_file():
            continue
        
        # 跳过配置文件
        if file_path.name == "config.yaml":
            continue
        
        file_ext = file_path.suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            continue
        
        stat = file_path.stat()
        created_time = datetime.fromtimestamp(stat.st_ctime).strftime("%Y-%m-%d %H:%M:%S")
        updated_time = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        
        files.append(KBFile(
            filename=file_path.name,
            file_type=get_file_type(file_path.name),
            file_size=stat.st_size,
            created_time=created_time,
            updated_time=updated_time
        ))
    
    # 按更新时间降序排序
    files.sort(key=lambda x: x.updated_time, reverse=True)
    
    return KBFileList(files=files, total=len(files))


@router.post("/{kb_name}/upload")
async def upload_file_to_kb(kb_name: str, file: UploadFile = File(...)):
    """
    上传文件到知识库
    """
    kb_path = KB_ROOT / kb_name
    
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 检查文件类型
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {file_ext}。仅支持 PDF 和 MD 文件。"
        )
    
    # 保存文件
    file_path = kb_path / file.filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "message": "文件上传成功",
            "filename": file.filename,
            "kb_name": kb_name,
            "file_path": str(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")


@router.post("/{kb_name}/create-note")
async def create_note_in_kb(kb_name: str, filename: str, content: str = ""):
    """
    在知识库中创建新笔记
    """
    kb_path = KB_ROOT / kb_name
    
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 确保文件名以.md结尾
    if not filename.endswith('.md'):
        filename = filename + '.md'
    
    file_path = kb_path / filename
    
    if file_path.exists():
        raise HTTPException(status_code=400, detail="文件已存在")
    
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        return {
            "message": "笔记创建成功",
            "filename": filename,
            "kb_name": kb_name,
            "file_path": str(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"笔记创建失败: {str(e)}")


@router.get("/{kb_name}/preview/{filename}")
async def preview_kb_file(kb_name: str, filename: str):
    """
    预览知识库中的文件
    """
    kb_path = KB_ROOT / kb_name
    file_path = kb_path / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    file_type = get_file_type(filename)
    
    if file_type == "pdf":
        return FileResponse(
            path=file_path,
            media_type="application/pdf"
        )
    elif file_type == "markdown":
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        return {
            "filename": filename,
            "file_type": "markdown",
            "content": content
        }
    else:
        raise HTTPException(status_code=400, detail="不支持的文件类型")


@router.get("/{kb_name}/download/{filename}")
async def download_kb_file(kb_name: str, filename: str):
    """
    下载知识库中的文件
    """
    kb_path = KB_ROOT / kb_name
    file_path = kb_path / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@router.delete("/{kb_name}/delete/{filename}")
async def delete_kb_file(kb_name: str, filename: str):
    """
    删除知识库中的文件
    """
    kb_path = KB_ROOT / kb_name
    file_path = kb_path / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    try:
        file_path.unlink()
        return {"message": "文件删除成功", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件删除失败: {str(e)}")


@router.put("/{kb_name}/save/{filename}")
async def save_kb_file_content(kb_name: str, filename: str, content: str):
    """
    保存/更新知识库中的笔记内容
    """
    kb_path = KB_ROOT / kb_name
    file_path = kb_path / filename
    
    if not kb_path.exists():
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        return {
            "message": "文件保存成功",
            "filename": filename,
            "kb_name": kb_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")