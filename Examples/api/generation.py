"""bitHuman Platform API -- Agent Generation

Create a new AI avatar agent from a text prompt, then poll until it's ready.
Optionally provide an image, video, or audio URL to customize appearance/voice.

Usage:
    export BITHUMAN_API_SECRET=your_secret
    python generation.py
    python generation.py --prompt "You are a fitness coach" --image https://example.com/face.jpg
"""

import argparse
import os
import sys
import time

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


def generate_agent(
    prompt: str = "You are a friendly AI assistant.",
    image: str | None = None,
    video: str | None = None,
    audio: str | None = None,
    aspect_ratio: str = "16:9",
):
    """POST /v1/agent/generate -- start agent generation."""
    body = {"prompt": prompt, "aspect_ratio": aspect_ratio}
    if image:
        body["image"] = image
    if video:
        body["video"] = video
    if audio:
        body["audio"] = audio

    resp = requests.post(f"{BASE_URL}/v1/agent/generate", headers=get_headers(), json=body)
    data = resp.json()

    if not data.get("success"):
        print(f"Error: {data.get('message', 'Unknown error')}")
        sys.exit(1)

    print(f"Generation started: agent_id={data['agent_id']}")
    return data["agent_id"]


def poll_status(agent_id: str, interval: int = 5, timeout: int = 600):
    """GET /v1/agent/status/{agent_id} -- poll until ready or failed."""
    print(f"Polling status for {agent_id} (timeout: {timeout}s)...")
    start = time.time()

    while time.time() - start < timeout:
        resp = requests.get(
            f"{BASE_URL}/v1/agent/status/{agent_id}",
            headers=get_headers(),
        )
        data = resp.json()["data"]
        status = data["status"]
        elapsed = int(time.time() - start)
        print(f"  [{elapsed:3d}s] {agent_id} status={status}")

        if status == "ready":
            print(f"\nAgent ready!")
            print(f"  Model URL: {data.get('model_url', 'N/A')}")
            print(f"  Image URL: {data.get('image_url', 'N/A')}")
            print(f"  Video URL: {data.get('video_url', 'N/A')}")
            return data
        elif status == "failed":
            print(f"\nGeneration failed: {data.get('error_message', 'Unknown error')}")
            return data

        time.sleep(interval)

    print(f"\nTimeout after {timeout}s -- agent may still be generating.")
    print(f"Check manually: python management.py --agent-id {agent_id}")
    return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="bitHuman agent generation")
    parser.add_argument("--prompt", default="You are a friendly AI assistant.",
                        help="System prompt for the agent")
    parser.add_argument("--image", help="Image URL for agent appearance")
    parser.add_argument("--video", help="Video URL for agent appearance")
    parser.add_argument("--audio", help="Audio URL for agent voice")
    parser.add_argument("--aspect-ratio", default="16:9", choices=["16:9", "9:16", "1:1"])
    parser.add_argument("--timeout", type=int, default=600, help="Polling timeout in seconds")
    args = parser.parse_args()

    agent_id = generate_agent(
        prompt=args.prompt,
        image=args.image,
        video=args.video,
        audio=args.audio,
        aspect_ratio=args.aspect_ratio,
    )
    poll_status(agent_id, timeout=args.timeout)
