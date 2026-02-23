# Expression + Cloud

Run a bitHuman Expression (GPU) avatar using bitHuman's cloud infrastructure.
No local GPU needed. Provide any face image and the cloud renders a high-fidelity talking avatar.

## Prerequisites

- Python 3.9+ (or Docker)
- bitHuman API secret ([www.bithuman.ai](https://www.bithuman.ai) > Developer section)
- A face image (JPEG/PNG -- any photo with a clear face)
- OpenAI API key (for `agent.py`)

## Terminal Quickstart (no Docker)

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API secret
```

### Animate any face from an image

```bash
# Using a local image
python quickstart.py --avatar-image face.jpg --audio-file speech.wav

# Using a URL
python quickstart.py --avatar-image https://example.com/face.jpg --audio-file speech.wav
```

Press `Q` to quit.

## Full App with Docker

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env: set API secret, face image URL, and OpenAI key

# 2. (Optional) Place avatar images in ./avatars/ for local files
mkdir -p avatars
cp face.jpg avatars/
# Then set BITHUMAN_AVATAR_IMAGE=/app/avatars/face.jpg in .env

# 3. Start all services
docker compose up
```

Open [http://localhost:4202](http://localhost:4202) in your browser.

## Essence vs Expression

| | Essence (CPU) | Expression (GPU) |
|---|---|---|
| **Model** | Pre-built `.imx` avatars | Any face image |
| **Quality** | Good, full-body | High-fidelity face |
| **First frame** | 2-4s | 4-6s |
| **GPU** | Not needed | Cloud handles it |

## How It Works

1. The SDK sends your face image to bitHuman's cloud GPU
2. The Expression model (1.3B parameter DiT) generates real-time lip-sync video
3. Video frames stream back to your machine
4. First frame arrives in 4-6 seconds, then runs at 25+ FPS

## Files

| File | Description |
|------|-------------|
| `quickstart.py` | Animate any face image with audio (terminal) |
| `agent.py` | LiveKit agent for Docker-based web app |
