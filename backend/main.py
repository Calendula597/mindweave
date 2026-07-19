from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import upload, config, convert, files, knowledge_base, learning

app = FastAPI(title="MindWeave AI助手", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["文件上传"])
app.include_router(config.router, prefix="/api", tags=["配置管理"])
app.include_router(convert.router, prefix="/api", tags=["文档转换"])
app.include_router(files.router, tags=["文件管理"])
app.include_router(knowledge_base.router, tags=["知识库管理"])
app.include_router(learning.router, tags=["学习任务"])

@app.get("/")
def read_root():
    return {"message": "欢迎使用MindWeave AI助手"}