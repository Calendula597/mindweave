from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import os
import uuid

router = APIRouter()

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"

if not UPLOAD_DIR.exists():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename

        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        return {
            "filename": file.filename,
            "saved_as": unique_filename,
            "file_path": str(file_path),
            "message": "文件上传成功"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")