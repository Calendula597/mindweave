from fastapi import APIRouter
from pydantic import BaseModel
from config import load_config, save_config

router = APIRouter()


class LLMConfig(BaseModel):
    api_key: str
    model: str
    base_url: str
    temperature: float
    max_tokens: int


@router.get("/config")
def get_config():
    config = load_config()
    llm_config = config.get("llm", {})
    return {
        "api_key": llm_config.get("api_key", ""),
        "model": llm_config.get("model", "gpt-4o-mini"),
        "base_url": llm_config.get("base_url", "https://api.openai.com/v1"),
        "temperature": llm_config.get("temperature", 0.7),
        "max_tokens": llm_config.get("max_tokens", 4096),
    }


@router.post("/config")
def update_config(config: LLMConfig):
    config_dict = load_config()
    config_dict["llm"] = {
        "api_key": config.api_key,
        "model": config.model,
        "base_url": config.base_url,
        "temperature": config.temperature,
        "max_tokens": config.max_tokens,
    }
    save_config(config_dict)
    return {"message": "配置更新成功", "config": config.dict()}