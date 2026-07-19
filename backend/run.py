"""
测试后端启动脚本
"""
import sys
import os

# 添加backend目录到路径
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

print(f"Python路径: {sys.path}")
print(f"工作目录: {os.getcwd()}")
print(f"Backend目录: {backend_dir}")

try:
    print("\n测试导入模块...")
    from routes import upload, config, convert, files, knowledge_base, learning
    print("[OK] 所有路由模块导入成功")
    
    print("\n测试FastAPI应用...")
    from main import app
    print("[OK] FastAPI应用创建成功")
    
    print("\n启动服务器...")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
except ImportError as e:
    print(f"[ERROR] 导入错误: {e}")
    print(f"缺少依赖，请运行: pip install -r requirements.txt")
except Exception as e:
    print(f"[ERROR] 错误: {e}")