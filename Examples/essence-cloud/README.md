# Essence + Cloud

Run a bitHuman Essence (CPU) avatar using bitHuman's cloud infrastructure.
No local GPU, no `.imx` model files. Just an API secret and an agent ID.

## Prerequisites

- Python 3.9+ (or Docker)
- bitHuman API secret ([www.bithuman.ai](https://www.bithuman.ai) > Developer section)
- An agent ID (create one at [www.bithuman.ai](https://www.bithuman.ai) or via `../api/generation.py`)
- OpenAI API key (for `agent.py`)

## Terminal Quickstart (no Docker)

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API secret and agent ID
```

### Play an audio file through the avatar

```bash
python quickstart.py --avatar-id A78WKV4515 --audio-file speech.wav
```

Press `Q` to quit.

## Full App with Docker

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your API secret, agent ID, and OpenAI key

# 2. Start all services
docker compose up
```

Open [http://localhost:4202](http://localhost:4202) in your browser.

## How It Works

1. The SDK connects to bitHuman's cloud with your `avatar_id`
2. Audio is sent to the cloud, which renders the avatar
3. Video frames stream back to your machine for display
4. First frame arrives in 2-4 seconds

No model files to manage. The cloud handles all rendering.

## Files

| File | Description |
|------|-------------|
| `quickstart.py` | Play audio through cloud avatar (terminal) |
| `agent.py` | LiveKit agent for Docker-based web app |
