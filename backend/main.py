from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import upload

app = FastAPI(title="文件上传服务", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["文件上传"])

@app.get("/")
def read_root():
    return {"message": "欢迎使用文件上传服务"}