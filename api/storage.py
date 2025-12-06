"""Postgres storage for Vercel deployment."""

import os
import uuid
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import asyncpg
from .config import DATA_DIR  # Keep for local fallback if needed


pool: asyncpg.Pool = None


async def init_pool():
    """Initialize the Postgres connection pool."""
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(os.getenv('POSTGRES_URL'))
    return pool


async def ensure_pool():
    """Ensure the Postgres connection pool is initialized."""
    await init_pool()
    return pool


def ensure_data_dir():
    """Ensure the data directory exists."""
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)


def get_conversation_path(conversation_id: str) -> str:
    """Get the file path for a conversation."""
    return os.path.join(DATA_DIR, f"{conversation_id}.json")


async def create_conversation(conversation_id: str) -> Dict[str, Any]:
    conn = await ensure_pool().acquire()
    try:
        await conn.execute(
            'INSERT INTO conversations (id, created_at, title) VALUES ($1, NOW(), $2)',
            uuid.UUID(conversation_id),
            'New Conversation'
        )
        return {
            'id': conversation_id,
            'created_at': datetime.utcnow().isoformat(),
            'title': 'New Conversation',
            'messages': []
        }
    finally:
        await conn.release()


async def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
  conn = await ensure_pool().acquire()
  try:
    row = await conn.fetchrow(
      'SELECT c.*, COALESCE(jsonb_agg(m ORDER BY m.timestamp) FILTER (WHERE m.id IS NOT NULL), \'[]\') as messages \
       FROM conversations c \
       LEFT JOIN messages m ON c.id = m.conversation_id \
       WHERE c.id = $1 GROUP BY c.id',
      uuid.UUID(conversation_id)
    )
    if row is None:
      return None

    messages = []
    for msg in row['messages']:
      msg_dict = dict(msg)
      if msg_dict['stage1']:
        msg_dict['stage1'] = msg_dict['stage1']
      if msg_dict['stage2']:
        msg_dict['stage2'] = msg_dict['stage2']
      if msg_dict['stage3']:
        msg_dict['stage3'] = msg_dict['stage3']
      messages.append(msg_dict)

    return {
      'id': str(row['id']),
      'created_at': row['created_at'].isoformat(),
      'title': row['title'],
      'messages': messages
    }
  finally:
    await conn.release()


async def list_conversations(include_archived: bool = False) -> List[Dict[str, Any]]:
  conn = await ensure_pool().acquire()
  try:
    rows = await conn.fetch(
      'SELECT id, created_at, title, COUNT(m.id) as message_count, archived \
       FROM conversations c LEFT JOIN messages m ON c.id = m.conversation_id \
       WHERE ($1 OR NOT archived) GROUP BY c.id ORDER BY created_at DESC',
      include_archived
    )
    return [
      {
        'id': str(row['id']),
        'created_at': row['created_at'].isoformat(),
        'title': row['title'],
        'message_count': row['message_count'],
        'archived': row['archived']
      } for row in rows
    ]
  finally:
    await conn.release()


def save_conversation(conversation: Dict[str, Any]):
    """
    Save a conversation to storage.

    Args:
        conversation: Conversation dict to save
    """
    ensure_data_dir()

    path = get_conversation_path(conversation['id'])
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)


async def save_conversation(conversation: Dict[str, Any]):
  conn = await ensure_pool().acquire()
  try:
    await conn.execute('DELETE FROM messages WHERE conversation_id = $1', uuid.UUID(conversation['id']))
    for msg in conversation['messages']:
      await conn.execute(
        'INSERT INTO messages (conversation_id, role, content, stage1, stage2, stage3, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        uuid.UUID(conversation['id']),
        msg['role'],
        msg.get('content'),
        msg.get('stage1'),
        msg.get('stage2'),
        msg.get('stage3'),
        datetime.fromisoformat(msg.get('timestamp', datetime.utcnow().isoformat()))
      )
  finally:
    await conn.release()


async def add_user_message(conversation_id: str, content: str):
  conn = await ensure_pool().acquire()
  try:
    await conn.execute(
      'INSERT INTO messages (conversation_id, role, content, timestamp) VALUES ($1, $2, $3, NOW())',
      uuid.UUID(conversation_id),
      'user',
      content
    )
    await conn.execute('UPDATE conversations SET message_count = message_count + 1 WHERE id = $1', uuid.UUID(conversation_id))
  finally:
    await conn.release()


async def add_assistant_message(conversation_id: str, stage1: List[Dict], stage2: List[Dict], stage3: Dict):
  conn = await ensure_pool().acquire()
  try:
    await conn.execute(
      'INSERT INTO messages (conversation_id, role, stage1, stage2, stage3, timestamp) VALUES ($1, $2, $3, $4, $5, NOW())',
      uuid.UUID(conversation_id),
      'assistant',
      json.dumps(stage1),
      json.dumps(stage2),
      json.dumps(stage3)
    )
    await conn.execute('UPDATE conversations SET message_count = message_count + 1 WHERE id = $1', uuid.UUID(conversation_id))
  finally:
    await conn.release()


async def update_conversation_title(conversation_id: str, title: str):
  conn = await ensure_pool().acquire()
  try:
    await conn.execute('UPDATE conversations SET title = $1 WHERE id = $2', title, uuid.UUID(conversation_id))
  finally:
    await conn.release()


async def archive_conversation(conversation_id: str, archived: bool = True):
  conn = await ensure_pool().acquire()
  try:
    await conn.execute('UPDATE conversations SET archived = $1 WHERE id = $2', archived, uuid.UUID(conversation_id))
  finally:
    await conn.release()


async def delete_conversation(conversation_id: str):
  conn = await ensure_pool().acquire()
  try:
    await conn.execute('DELETE FROM conversations WHERE id = $1', uuid.UUID(conversation_id))
  finally:
    await conn.release()


def get_overall_scores() -> Dict[str, Any]:
    """
    Calculate overall scores across all conversations.

    Aggregates rankings from all stage2 results across all conversations
    to produce a global leaderboard.

    Returns:
        Dict containing model scores and metadata
    """
    ensure_data_dir()

    # Track scores per model
    model_scores: Dict[str, Dict[str, Any]] = {}
    total_conversations = 0
    total_rankings = 0

    for filename in os.listdir(DATA_DIR):
        if not filename.endswith('.json'):
            continue

        path = os.path.join(DATA_DIR, filename)
        with open(path, 'r') as f:
            data = json.load(f)

        # Skip archived conversations
        if data.get("archived", False):
            continue

        # Process each message in the conversation
        for message in data.get("messages", []):
            if message.get("role") != "assistant":
                continue

            stage2 = message.get("stage2", [])
            if not stage2:
                continue

            total_conversations += 1

            # Get the number of models being ranked
            num_models = len(stage2)

            # Process each model's rankings
            for ranking_result in stage2:
                ranker_model = ranking_result.get("model", "unknown")
                parsed_ranking = ranking_result.get("parsed_ranking", [])

                if not parsed_ranking:
                    continue

                total_rankings += 1

                # Award points based on position (inverse ranking)
                # 1st place = num_models points, last place = 1 point
                for position, ranked_label in enumerate(parsed_ranking):
                    points = num_models - position

                    # Initialize model entry if needed
                    if ranked_label not in model_scores:
                        model_scores[ranked_label] = {
                            "model": ranked_label,
                            "total_points": 0,
                            "rankings_received": 0,
                            "first_places": 0,
                            "second_places": 0,
                            "third_places": 0,
                            "position_history": []
                        }

                    model_scores[ranked_label]["total_points"] += points
                    model_scores[ranked_label]["rankings_received"] += 1
                    model_scores[ranked_label]["position_history"].append(position + 1)

                    if position == 0:
                        model_scores[ranked_label]["first_places"] += 1
                    elif position == 1:
                        model_scores[ranked_label]["second_places"] += 1
                    elif position == 2:
                        model_scores[ranked_label]["third_places"] += 1

    # Calculate averages and sort by total points
    leaderboard = []
    for model, scores in model_scores.items():
        if scores["rankings_received"] > 0:
            scores["average_position"] = sum(scores["position_history"]) / len(scores["position_history"])
            scores["average_points"] = scores["total_points"] / scores["rankings_received"]
            del scores["position_history"]  # Remove raw data from response
            leaderboard.append(scores)

    # Sort by total points descending
    leaderboard.sort(key=lambda x: x["total_points"], reverse=True)

    return {
        "leaderboard": leaderboard,
        "total_conversations_analyzed": total_conversations,
        "total_rankings_processed": total_rankings
    }
