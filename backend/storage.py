"""JSON-based storage for conversations."""

import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from .config import DATA_DIR


def ensure_data_dir():
    """Ensure the data directory exists."""
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)


def get_conversation_path(conversation_id: str) -> str:
    """Get the file path for a conversation."""
    return os.path.join(DATA_DIR, f"{conversation_id}.json")


def create_conversation(conversation_id: str) -> Dict[str, Any]:
    """
    Create a new conversation.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        New conversation dict
    """
    ensure_data_dir()

    conversation = {
        "id": conversation_id,
        "created_at": datetime.utcnow().isoformat(),
        "title": "New Conversation",
        "messages": []
    }

    # Save to file
    path = get_conversation_path(conversation_id)
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)

    return conversation


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a conversation from storage.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        Conversation dict or None if not found
    """
    path = get_conversation_path(conversation_id)

    if not os.path.exists(path):
        return None

    with open(path, 'r') as f:
        return json.load(f)


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


def list_conversations(include_archived: bool = False) -> List[Dict[str, Any]]:
    """
    List all conversations (metadata only).

    Args:
        include_archived: If True, include archived conversations

    Returns:
        List of conversation metadata dicts
    """
    ensure_data_dir()

    conversations = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json'):
            path = os.path.join(DATA_DIR, filename)
            with open(path, 'r') as f:
                data = json.load(f)
                # Skip archived unless requested
                if not include_archived and data.get("archived", False):
                    continue
                # Return metadata only
                conversations.append({
                    "id": data["id"],
                    "created_at": data["created_at"],
                    "title": data.get("title", "New Conversation"),
                    "message_count": len(data["messages"]),
                    "archived": data.get("archived", False)
                })

    # Sort by creation time, newest first
    conversations.sort(key=lambda x: x["created_at"], reverse=True)

    return conversations


def add_user_message(conversation_id: str, content: str):
    """
    Add a user message to a conversation.

    Args:
        conversation_id: Conversation identifier
        content: User message content
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["messages"].append({
        "role": "user",
        "content": content
    })

    save_conversation(conversation)


def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any]
):
    """
    Add an assistant message with all 3 stages to a conversation.

    Args:
        conversation_id: Conversation identifier
        stage1: List of individual model responses
        stage2: List of model rankings
        stage3: Final synthesized response
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["messages"].append({
        "role": "assistant",
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3
    })

    save_conversation(conversation)


def update_conversation_title(conversation_id: str, title: str):
    """
    Update the title of a conversation.

    Args:
        conversation_id: Conversation identifier
        title: New title for the conversation
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["title"] = title
    save_conversation(conversation)


def archive_conversation(conversation_id: str, archived: bool = True):
    """
    Archive or unarchive a conversation.

    Args:
        conversation_id: Conversation identifier
        archived: True to archive, False to unarchive
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["archived"] = archived
    save_conversation(conversation)


def delete_conversation(conversation_id: str):
    """
    Permanently delete a conversation.

    Args:
        conversation_id: Conversation identifier
    """
    path = get_conversation_path(conversation_id)
    if os.path.exists(path):
        os.remove(path)


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
