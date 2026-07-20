"""
Wiki 知识库服务
使用LLM提取知识点，构建知识图谱
"""
import json
from typing import List, Dict, Optional
from pathlib import Path
import httpx
import yaml
from datetime import datetime

# 知识库根目录
KB_ROOT = Path(__file__).parent.parent / "knowledge_bases"


class WikiService:
    """Wiki 知识库服务"""
    
    def __init__(self, kb_name: str):
        self.kb_name = kb_name
        self.wiki_path = KB_ROOT / kb_name / "wiki"
        self.wiki_path.mkdir(parents=True, exist_ok=True)
        
        self.knowledge_file = self.wiki_path / "knowledge_points.json"
        self.relations_file = self.wiki_path / "relations.json"
    
    def load_knowledge_points(self) -> List[Dict]:
        """加载知识点"""
        if self.knowledge_file.exists():
            with open(self.knowledge_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return []
    
    def save_knowledge_points(self, points: List[Dict]):
        """保存知识点"""
        with open(self.knowledge_file, "w", encoding="utf-8") as f:
            json.dump(points, f, ensure_ascii=False, indent=2)
    
    def load_relations(self) -> List[Dict]:
        """加载知识关联"""
        if self.relations_file.exists():
            with open(self.relations_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return []
    
    def save_relations(self, relations: List[Dict]):
        """保存知识关联"""
        with open(self.relations_file, "w", encoding="utf-8") as f:
            json.dump(relations, f, ensure_ascii=False, indent=2)
    
    def add_knowledge_point(self, point: Dict) -> str:
        """
        添加知识点
        
        Args:
            point: {"title": str, "content": str, "source": str, "tags": []}
            
        Returns:
            知识点ID
        """
        points = self.load_knowledge_points()
        
        # 生成ID
        point_id = f"kp_{len(points) + 1}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        point["id"] = point_id
        point["created_at"] = datetime.now().isoformat()
        
        points.append(point)
        self.save_knowledge_points(points)
        
        return point_id
    
    def update_knowledge_point(self, point_id: str, updates: Dict) -> bool:
        """更新知识点"""
        points = self.load_knowledge_points()
        
        for point in points:
            if point.get("id") == point_id:
                point.update(updates)
                point["updated_at"] = datetime.now().isoformat()
                self.save_knowledge_points(points)
                return True
        
        return False
    
    def delete_knowledge_point(self, point_id: str) -> bool:
        """删除知识点"""
        points = self.load_knowledge_points()
        new_points = [p for p in points if p.get("id") != point_id]
        
        if len(new_points) < len(points):
            self.save_knowledge_points(new_points)
            return True
        
        return False
    
    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        关键词检索知识点
        
        Args:
            query: 查询文本
            top_k: 返回结果数量
            
        Returns:
            匹配的知识点列表
        """
        points = self.load_knowledge_points()
        
        # 简单的关键词匹配
        query_lower = query.lower()
        scored_points = []
        
        for point in points:
            score = 0
            title = point.get("title", "").lower()
            content = point.get("content", "").lower()
            tags = [t.lower() for t in point.get("tags", [])]
            
            # 标题完全匹配
            if query_lower == title:
                score += 100
            # 标题包含
            elif query_lower in title:
                score += 50
            
            # 内容包含
            if query_lower in content:
                score += 10 + content.count(query_lower)
            
            # 标签匹配
            for tag in tags:
                if query_lower in tag:
                    score += 30
            
            if score > 0:
                scored_points.append({"point": point, "score": score})
        
        # 按分数排序
        scored_points.sort(key=lambda x: x["score"], reverse=True)
        
        return [sp["point"] for sp in scored_points[:top_k]]
    
    def add_relation(self, source_id: str, target_id: str, relation_type: str) -> str:
        """
        添加知识关联
        
        Args:
            source_id: 源知识点ID
            target_id: 目标知识点ID
            relation_type: 关系类型（相关、前置、后续等）
            
        Returns:
            关联ID
        """
        relations = self.load_relations()
        
        # 检查是否已存在
        for r in relations:
            if (r.get("source") == source_id and 
                r.get("target") == target_id and 
                r.get("type") == relation_type):
                return r["id"]
        
        relation_id = f"rel_{len(relations) + 1}"
        relations.append({
            "id": relation_id,
            "source": source_id,
            "target": target_id,
            "type": relation_type,
            "created_at": datetime.now().isoformat()
        })
        
        self.save_relations(relations)
        return relation_id
    
    def get_related_points(self, point_id: str) -> List[Dict]:
        """获取相关知识点的关联信息"""
        points = self.load_knowledge_points()
        relations = self.load_relations()
        
        related = []
        for r in relations:
            if r.get("source") == point_id:
                target_id = r.get("target")
                for p in points:
                    if p.get("id") == target_id:
                        related.append({
                            "point": p,
                            "relation": r.get("type")
                        })
            elif r.get("target") == point_id:
                source_id = r.get("source")
                for p in points:
                    if p.get("id") == source_id:
                        related.append({
                            "point": p,
                            "relation": f"被{r.get('type')}"
                        })
        
        return related
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        points = self.load_knowledge_points()
        relations = self.load_relations()
        
        return {
            "knowledge_point_count": len(points),
            "relation_count": len(relations),
            "kb_name": self.kb_name
        }
    
    def clear_all(self):
        """清空所有知识点和关联"""
        self.save_knowledge_points([])
        self.save_relations([])


def get_llm_config(kb_name: str) -> dict:
    """获取知识库LLM配置"""
    config_path = KB_ROOT / kb_name / "config.yaml"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
            return config.get("llm", {})
    return {}


async def extract_knowledge_with_llm(content: str, kb_name: str) -> Dict:
    """
    使用LLM提取知识点
    
    Args:
        content: 文档内容
        kb_name: 知识库名称
        
    Returns:
        {"knowledge_points": [...], "relations": [...]}
    """
    config = get_llm_config(kb_name)
    
    if not config.get("api_key"):
        return {"knowledge_points": [], "relations": []}
    
    api_key = config.get("api_key", "")
    model = config.get("model", "gpt-4o-mini")
    base_url = config.get("base_url", "https://api.openai.com/v1")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""请分析以下文档内容，提取知识点和它们之间的关系。

文档内容：
{content[:3000]}

请以JSON格式返回，格式如下：
{{
    "knowledge_points": [
        {{
            "title": "知识点标题",
            "content": "知识点详细描述",
            "tags": ["标签1", "标签2"]
        }}
    ],
    "relations": [
        {{
            "source": "知识点标题1",
            "target": "知识点标题2", 
            "type": "前置知识/后续知识/相关知识"
        }}
    ]
}}

注意：
1. 知识点标题要简洁明了
2. 知识点内容要准确概括
3. 只提取核心知识点，不要过于细碎
4. 只返回JSON，不要有其他内容"""

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 2000
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                result_text = data["choices"][0]["message"]["content"]
                
                # 解析JSON
                import re
                json_match = re.search(r'\{[\s\S]*\}', result_text)
                if json_match:
                    return json.loads(json_match.group())
    except Exception as e:
        print(f"LLM提取知识点失败: {e}")
    
    return {"knowledge_points": [], "relations": []}


async def process_document_for_wiki(kb_name: str, filename: str, content: str) -> Dict:
    """
    处理文档并提取知识点
    
    Args:
        kb_name: 知识库名称
        filename: 文件名
        content: 文档内容
        
    Returns:
        处理结果统计
    """
    wiki = WikiService(kb_name)
    
    # 使用LLM提取知识点
    result = await extract_knowledge_with_llm(content, kb_name)
    
    knowledge_points = result.get("knowledge_points", [])
    relations = result.get("relations", [])
    
    # 保存知识点
    point_ids = {}
    added_points = 0
    
    for kp in knowledge_points:
        point_id = wiki.add_knowledge_point({
            "title": kp.get("title", ""),
            "content": kp.get("content", ""),
            "source": filename,
            "tags": kp.get("tags", [])
        })
        point_ids[kp.get("title", "")] = point_id
        added_points += 1
    
    # 保存关联
    added_relations = 0
    for rel in relations:
        source_title = rel.get("source", "")
        target_title = rel.get("target", "")
        
        if source_title in point_ids and target_title in point_ids:
            wiki.add_relation(
                point_ids[source_title],
                point_ids[target_title],
                rel.get("type", "相关")
            )
            added_relations += 1
    
    return {
        "knowledge_points_added": added_points,
        "relations_added": added_relations
    }