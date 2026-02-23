"""bitHuman Platform API -- Agent Context

Make a live agent speak or inject background context into its conversation.
Works with agents running on the bitHuman platform (www.bithuman.ai).

Usage:
    export BITHUMAN_API_SECRET=your_secret
    python context.py --agent-id A91XMB7113 --speak "Hello! How can I help you?"
    python context.py --agent-id A91XMB7113 --context "Customer is a VIP member."
"""

import argparse
import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://api.bithuman.ai"


def get_headers():
    api_secret = os.environ.get("BITHUMAN_API_SECRET")
    if not api_secret:
        print("Error: Set BITHUMAN_API_SECRET environment variable")
        sys.exit(1)
    return {"Content-Type": "application/json", "api-secret": api_secret}


def speak(agent_id: str, message: str, room_id: str | None = None):
    """POST /v1/agent/{code}/speak -- make the agent say something."""
    body: dict = {"message": message}
    if room_id:
        body["room_id"] = room_id

    resp = requests.post(f"{BASE_URL}/v1/agent/{agent_id}/speak", headers=get_headers(), json=body)
    data = resp.json()

    if data.get("success"):
        rooms = data.get("data", {}).get("delivered_to_rooms", 0)
        print(f"Speech delivered to {rooms} room(s)")
    else:
        error = data.get("error", "")
        if error == "NO_ACTIVE_ROOMS":
            print("No active rooms -- the agent must be in a live session first.")
        else:
            print(f"Error: {data.get('message', 'Unknown error')}")

    return data


def add_context(agent_id: str, context: str, room_id: str | None = None):
    """POST /v1/agent/{code}/add-context -- inject background context (silent)."""
    body: dict = {"context": context, "type": "add_context"}
    if room_id:
        body["room_id"] = room_id

    resp = requests.post(
        f"{BASE_URL}/v1/agent/{agent_id}/add-context",
        headers=get_headers(),
        json=body,
    )
    data = resp.json()

    if data.get("success"):
        rooms = data.get("data", {}).get("delivered_to_rooms", 0)
        print(f"Context added to {rooms} room(s)")
    else:
        print(f"Error: {data.get('message', 'Unknown error')}")

    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="bitHuman agent context control")
    parser.add_argument("--agent-id", required=True, help="Agent code")
    parser.add_argument("--speak", help="Text for the agent to say out loud")
    parser.add_argument("--context", help="Background context to inject (silent)")
    parser.add_argument("--room-id", help="Target a specific room (optional)")
    args = parser.parse_args()

    if not args.speak and not args.context:
        print("Provide --speak or --context (or both)")
        sys.exit(1)

    if args.context:
        print(f"--- Adding context ---")
        add_context(args.agent_id, args.context, args.room_id)

    if args.speak:
        print(f"--- Making agent speak ---")
        speak(args.agent_id, args.speak, args.room_id)
