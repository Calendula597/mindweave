"""
学习任务管理路由
提供学习任务的生成、查询、完成、复习等功能
"""
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/api/learning", tags=["learning"])

# 数据存储路径
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
TASKS_FILE = DATA_DIR / "learning_tasks.json"
PROGRESS_FILE = DATA_DIR / "learning_progress.json"

# 艾宾浩斯复习间隔（天）- 经典节点
EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15]


class LearningTask(BaseModel):
    """学习任务模型"""
    task_id: str
    kb_name: str
    source_file: str
    knowledge_point: str
    detail: str  # 详细描述/解释
    created_date: str
    next_review_date: str
    review_count: int = 0
    review_history: List[dict] = []
    status: str = "learning"  # learning, completed, archived


class TaskCreateRequest(BaseModel):
    """创建任务请求"""
    kb_name: str
    source_file: str
    knowledge_point: str
    detail: str = ""


class TaskCompleteRequest(BaseModel):
    """完成任务请求"""
    completed: bool = True


def load_tasks() -> List[dict]:
    """加载任务数据"""
    if not TASKS_FILE.exists():
        return []
    with open(TASKS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_tasks(tasks: List[dict]):
    """保存任务数据"""
    with open(TASKS_FILE, "w", encoding="utf-8") as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)


def get_next_review_date(review_count: int, base_date: datetime = None) -> str:
    """根据艾宾浩斯曲线计算下次复习日期"""
    if base_date is None:
        base_date = datetime.now()
    
    # 如果已超过最大复习次数，返回空（任务完成）
    if review_count >= len(EBBINGHAUS_INTERVALS):
        return ""
    
    interval_days = EBBINGHAUS_INTERVALS[review_count]
    next_date = base_date + timedelta(days=interval_days)
    return next_date.strftime("%Y-%m-%d")


@router.get("/tasks")
async def get_learning_tasks(status: Optional[str] = None, kb_name: Optional[str] = None):
    """获取学习任务列表"""
    tasks = load_tasks()
    
    # 筛选
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    if kb_name:
        tasks = [t for t in tasks if t["kb_name"] == kb_name]
    
    # 按下次复习日期排序
    tasks.sort(key=lambda x: x.get("next_review_date", "9999-99-99"))
    
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/today")
async def get_today_tasks():
    """获取今日学习任务（新学习 + 待复习）"""
    tasks = load_tasks()
    today = datetime.now().strftime("%Y-%m-%d")
    
    # 今日待复习任务
    review_tasks = [t for t in tasks if t["status"] == "learning" and t.get("next_review_date") == today]
    
    # 进行中的任务
    learning_tasks = [t for t in tasks if t["status"] == "learning" and t.get("next_review_date", "") > today][:5]
    
    return {
        "today_review": review_tasks,
        "learning": learning_tasks,
        "review_count": len(review_tasks),
        "total_learning": len([t for t in tasks if t["status"] == "learning"])
    }


@router.post("/task")
async def create_task(request: TaskCreateRequest):
    """创建新的学习任务"""
    task_id = str(uuid.uuid4())
    today = datetime.now().strftime("%Y-%m-%d")
    
    # 首次复习时间为明天
    next_review = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    task = {
        "task_id": task_id,
        "kb_name": request.kb_name,
        "source_file": request.source_file,
        "knowledge_point": request.knowledge_point,
        "detail": request.detail,
        "created_date": today,
        "next_review_date": next_review,
        "review_count": 0,
        "review_history": [],
        "status": "learning"
    }
    
    tasks = load_tasks()
    tasks.append(task)
    save_tasks(tasks)
    
    return {"message": "任务创建成功", "task": task}


@router.post("/task/{task_id}/complete")
async def complete_review(task_id: str, request: TaskCompleteRequest):
    """完成一次复习"""
    tasks = load_tasks()
    
    for task in tasks:
        if task["task_id"] == task_id:
            today = datetime.now().strftime("%Y-%m-%d")
            
            if request.completed:
                # 记录复习历史
                task["review_history"].append({
                    "date": today,
                    "completed": True
                })
                
                # 更新复习次数
                task["review_count"] += 1
                
                # 计算下次复习日期
                if task["review_count"] >= len(EBBINGHAUS_INTERVALS):
                    # 完成所有复习
                    task["status"] = "completed"
                    task["next_review_date"] = ""
                else:
                    task["next_review_date"] = get_next_review_date(task["review_count"])
            
            save_tasks(tasks)
            return {"message": "复习完成", "task": task}
    
    raise HTTPException(status_code=404, detail="任务不存在")


@router.delete("/task/{task_id}")
async def delete_task(task_id: str):
    """删除学习任务"""
    tasks = load_tasks()
    new_tasks = [t for t in tasks if t["task_id"] != task_id]
    
    if len(new_tasks) == len(tasks):
        raise HTTPException(status_code=404, detail="任务不存在")
    
    save_tasks(new_tasks)
    return {"message": "任务删除成功"}


@router.get("/stats")
async def get_learning_stats():
    """获取学习统计"""
    tasks = load_tasks()
    
    total = len(tasks)
    learning = len([t for t in tasks if t["status"] == "learning"])
    completed = len([t for t in tasks if t["status"] == "completed"])
    
    # 今日待复习
    today = datetime.now().strftime("%Y-%m-%d")
    today_review = len([t for t in tasks if t["status"] == "learning" and t.get("next_review_date") == today])
    
    # 按知识库统计
    kb_stats = {}
    for task in tasks:
        kb = task["kb_name"]
        if kb not in kb_stats:
            kb_stats[kb] = {"total": 0, "learning": 0, "completed": 0}
        kb_stats[kb]["total"] += 1
        if task["status"] == "learning":
            kb_stats[kb]["learning"] += 1
        else:
            kb_stats[kb]["completed"] += 1
    
    return {
        "total_tasks": total,
        "learning": learning,
        "completed": completed,
        "today_review": today_review,
        "kb_stats": kb_stats
    }


@router.get("/schedule")
async def get_review_schedule(days: int = 30):
    """获取未来N天的复习计划"""
    tasks = load_tasks()
    schedule = {}
    
    for i in range(days):
        date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
        schedule[date] = []
    
    for task in tasks:
        if task["status"] != "learning":
            continue
        next_review = task.get("next_review_date", "")
        if next_review in schedule:
            schedule[next_review].append({
                "task_id": task["task_id"],
                "knowledge_point": task["knowledge_point"],
                "kb_name": task["kb_name"]
            })
    
    return {"schedule": schedule}