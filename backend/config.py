import yaml
import os
from pathlib import Path

CONFIG_FILE_PATH = Path(__file__).parent / "config.yaml"

def load_config():
    if CONFIG_FILE_PATH.exists():
        with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return get_default_config()

def get_default_config():
    return {
        "llm": {
            "api_key": "",
            "model": "gpt-4o-mini",
            "base_url": "https://api.openai.com/v1",
            "temperature": 0.7,
            "max_tokens": 4096,
        }
    }

def save_config(config: dict):
    with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True)

def init_config():
    if not CONFIG_FILE_PATH.exists():
        save_config(get_default_config())

init_config()

settings = load_config()