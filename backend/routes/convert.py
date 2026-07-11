from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import os
import uuid
from markitdown import MarkItDown

router = APIRouter()

MD_OUTPUT_DIR = Path(__file__).parent.parent / "output" / "md"

if not MD_OUTPUT_DIR.exists():
    MD_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

md_converter = MarkItDown()


@router.post("/convert")
async def convert_to_markdown(file: UploadFile = File(...)):
    try:
        file_extension = Path(file.filename).suffix.lower()
        
        temp_file_path = MD_OUTPUT_DIR / f"temp_{uuid.uuid4()}{file_extension}"
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        result = md_converter.convert(str(temp_file_path))
        
        md_content = result.text_content
        
        base_name = Path(file.filename).stem
        md_filename = f"{base_name}.md"
        md_file_path = MD_OUTPUT_DIR / md_filename
        
        with open(md_file_path, "w", encoding="utf-8") as f:
            f.write(md_content)
        
        if temp_file_path.exists():
            os.remove(temp_file_path)
        
        return {
            "original_filename": file.filename,
            "md_filename": md_filename,
            "md_file_path": str(md_file_path),
            "content_preview": md_content[:500] + "..." if len(md_content) > 500 else md_content,
            "content_length": len(md_content),
            "message": "文件转换成功"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件转换失败: {str(e)}")