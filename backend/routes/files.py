"""
文件管理路由
提供文件上传、列表、删除、下载和预览功能
"""
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/files", tags=["files"])

# 上传目录配置
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# 允许上传的文件类型
ALLOWED_EXTENSIONS = {".pdf", ".md", ".markdown"}


class FileInfo(BaseModel):
    """文件信息模型"""
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    upload_time: str
    file_path: str


class FileListResponse(BaseModel):
    """文件列表响应模型"""
    files: List[FileInfo]
    total: int


def get_file_type(filename: str) -> str:
    """根据文件扩展名获取文件类型"""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    elif ext in [".md", ".markdown"]:
        return "markdown"
    return "unknown"


def format_file_size(size: int) -> str:
    """格式化文件大小"""
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.2f} {unit}"
        size /= 1024
    return f"{size:.2f} TB"


@router.post("/upload", response_model=FileInfo)
async def upload_file(file: UploadFile = File(...)):
    """
    上传PDF或MD文件
    文件会被保存到 uploads 目录
    """
    # 检查文件扩展名
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {file_ext}。仅支持 PDF 和 MD 文件。"
        )
    
    # 生成唯一文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{timestamp}_{file.filename}"
    file_path = UPLOAD_DIR / unique_filename
    
    # 保存文件
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")
    
    # 获取文件大小
    file_size = file_path.stat().st_size
    
    return FileInfo(
        filename=unique_filename,
        original_filename=file.filename,
        file_type=get_file_type(file.filename),
        file_size=file_size,
        upload_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        file_path=str(file_path)
    )


@router.get("/list", response_model=FileListResponse)
async def list_files(file_type: Optional[str] = None):
    """
    获取文件列表
    可按文件类型筛选 (pdf, markdown)
    """
    files = []
    
    for file_path in UPLOAD_DIR.iterdir():
        if not file_path.is_file():
            continue
        
        file_ext = file_path.suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            continue
        
        current_file_type = get_file_type(file_path.name)
        
        # 按类型筛选
        if file_type and current_file_type != file_type:
            continue
        
        # 获取文件信息
        stat = file_path.stat()
        
        # 从文件名中提取原始文件名（去除时间戳前缀）
        parts = file_path.name.split("_", 2)
        original_filename = parts[2] if len(parts) > 2 else file_path.name
        
        files.append(FileInfo(
            filename=file_path.name,
            original_filename=original_filename,
            file_type=current_file_type,
            file_size=stat.st_size,
            upload_time=datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
            file_path=str(file_path)
        ))
    
    # 按上传时间降序排序
    files.sort(key=lambda x: x.upload_time, reverse=True)
    
    return FileListResponse(files=files, total=len(files))


@router.get("/download/{filename}")
async def download_file(filename: str):
    """
    下载文件
    """
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@router.get("/preview/{filename}")
async def preview_file(filename: str):
    """
    预览文件（返回文件内容）
    - PDF: 返回文件流
    - MD: 返回文本内容
    """
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    file_type = get_file_type(filename)
    
    if file_type == "pdf":
        # PDF 文件直接返回文件流
        return FileResponse(
            path=file_path,
            media_type="application/pdf"
        )
    elif file_type == "markdown":
        # MD 文件返回文本内容
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        return {
            "filename": filename,
            "file_type": "markdown",
            "content": content
        }
    else:
        raise HTTPException(status_code=400, detail="不支持的预览文件类型")


@router.delete("/delete/{filename}")
async def delete_file(filename: str):
    """
    删除文件
    """
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    try:
        file_path.unlink()
        return {"message": "文件删除成功", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件删除失败: {str(e)}")
