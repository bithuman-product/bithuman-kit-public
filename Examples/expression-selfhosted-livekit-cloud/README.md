# Expression + Self-Hosted + LiveKit Cloud

Run a bitHuman Expression (GPU) avatar on your own hardware with **LiveKit Cloud** handling WebRTC.

No SSH tunnels, no port forwarding, no local LiveKit server. The browser connects directly to LiveKit Cloud's HTTPS endpoint -- works from any machine with a browser.

## Why LiveKit Cloud?

The [expression-selfhosted](../expression-selfhosted/) example runs everything locally (5 services, SSH tunnels for remote access). This variant replaces the local LiveKit + Redis with a free LiveKit Cloud project, reducing the stack to **3 services**:

```
expression-selfhosted (5 services):
  Browser --WebRTC--> LiveKit(local) --dispatch--> Agent --HTTP--> GPU
                        |
                     + Redis
                     + ports 17880, 17881, 50700-50720

expression-selfhosted-livekit-cloud (3 services):
  Browser --WebRTC--> LiveKit Cloud --dispatch--> Agent --HTTP--> GPU
                      (no local infra)
```

## Prerequisites

- NVIDIA GPU with 8 GB+ VRAM (any CUDA GPU -- tested on H100, A100, RTX 4090, RTX 3090)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
- Docker 24+ with Compose v2
- ~30 GB free disk space (19 GB image + 8 GB model weights)
- bitHuman API secret ([www.bithuman.ai](https://www.bithuman.ai/#developer) → Developer → API Keys)
- OpenAI API key (for the AI conversation agent)
- **LiveKit Cloud account** (free tier at [cloud.livekit.io](https://cloud.livekit.io))
- A face image (any JPEG/PNG, or use the default provided in `.env.example`)

## Verify GPU Access

```bash
docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu22.04 nvidia-smi
```

If this fails, install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) first.

## Quick Start

```bash
# 1. Clone and enter the directory
git clone https://github.com/bithuman-product/bithuman-examples.git
cd examples/expression-selfhosted-livekit-cloud

# 2. Create your .env file
cp .env.example .env
# Edit .env: set BITHUMAN_API_SECRET, OPENAI_API_KEY, and LiveKit Cloud credentials

# 3. Get LiveKit Cloud credentials
#    - Sign up at https://cloud.livekit.io
#    - Create a project
#    - Copy the WebSocket URL, API Key, and API Secret into .env

# 4. (Optional) Use your own face image
mkdir -p avatars
cp /path/to/face.jpg avatars/
# Then in .env set: BITHUMAN_AVATAR_IMAGE=/app/avatars/face.jpg

# 5. Start everything (only 3 containers)
docker compose up
```

Only 3 containers start (no LiveKit server, no Redis).

First run pulls the container image (~10 GB download), then downloads model weights (~5 GB) and compiles the GPU kernels. Total: **5-20 minutes** depending on internet speed. Subsequent starts take ~80 seconds.

## Accessing the UI

### From the same machine (localhost)

Open **http://localhost:4202** -- microphone works on localhost without HTTPS.

### From a remote VPS

The browser still needs HTTPS (or localhost) for microphone access. Since LiveKit Cloud handles WebRTC, you only need to tunnel **one port** (the frontend):

```bash
ssh -L 4202:localhost:4202 user@VPS_IP
```

Open **http://localhost:4202** on your laptop. That's it -- no extra ports needed.

> **Tip:** For a permanent setup, add nginx + certbot for HTTPS on port 443 and skip the SSH tunnel entirely.

## Quick Start (GPU Container Only)

If you just want the GPU container (no agent, no frontend):

```bash
docker run --gpus all -p 8089:8089 \
    -e BITHUMAN_API_SECRET=your_secret \
    -v bithuman-models:/data/models \
    sgubithuman/expression-avatar:latest
```

Verify it works (once you see `Avatar Worker Ready` in the logs):

```bash
curl http://localhost:8089/health
curl http://localhost:8089/test-frame -o test.jpg   # check the output image
curl -X POST http://localhost:8089/benchmark         # check FPS
```

## Configuration

All configuration is via `.env`. See `.env.example` for all options.

| Variable | Required | Description |
|----------|----------|-------------|
| `BITHUMAN_API_SECRET` | Yes | API secret from bithuman.ai |
| `OPENAI_API_KEY` | Yes | For AI conversation |
| `LIVEKIT_URL` | Yes | LiveKit Cloud WebSocket URL (`wss://...livekit.cloud`) |
| `LIVEKIT_API_KEY` | Yes | LiveKit Cloud API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit Cloud API secret |
| `BITHUMAN_AVATAR_IMAGE` | Yes | Face image URL or container path |
| `CUDA_VISIBLE_DEVICES` | No | GPU index, default `0` |
| `OPENAI_VOICE` | No | TTS voice, default `coral` |
| `AGENT_PROMPT` | No | AI persona / system prompt (see [Customization](#customization)) |
| `GPU_PORT` | No | External port for GPU container, default `8089` |
| `CUSTOM_GPU_TOKEN` | No | Optional auth token for GPU container |

## Customization

Edit `.env` to change the avatar's personality, voice, or face:

```bash
# AI persona -- controls how the avatar responds
AGENT_PROMPT="You are a friendly tech support agent. Help users troubleshoot issues step by step."

# Voice -- OpenAI TTS voice (options: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse)
OPENAI_VOICE=sage

# Face -- any JPEG/PNG with a clear face
BITHUMAN_AVATAR_IMAGE=https://example.com/your-face.jpg
# Or use a local file:
# BITHUMAN_AVATAR_IMAGE=/app/avatars/face.jpg
```

After changing `.env`, restart the agent:
```bash
docker compose restart agent
```

## Architecture

```
Browser --WebRTC--> LiveKit Cloud --dispatch--> Agent --HTTP--> Expression Avatar (GPU)
                    (cloud.livekit.io)            |                    |
                                              AI conversation      renders video
                                              (OpenAI)            port 8089
```

| Service | Description | Port |
|---------|-------------|------|
| **expression-avatar** | GPU rendering (1.3B parameter model) | 8089 |
| **agent** | AI conversation + avatar orchestration | (internal) |
| **frontend** | Web UI | 4202 |

LiveKit Cloud replaces the local LiveKit server and Redis -- no ports 17880, 17881, or 50700-50720 needed.

## Multi-GPU Machines

`CUDA_VISIBLE_DEVICES` in `.env` selects which physical GPU to use:

```bash
CUDA_VISIBLE_DEVICES=0   # First GPU (default)
CUDA_VISIBLE_DEVICES=1   # Second GPU
```

## Performance

| Metric | Value |
|--------|-------|
| First run | 5-20 min (10 GB image pull + 5 GB model download + compilation) |
| Cold start | ~80s (decrypt + torch.compile, cached after first run) |
| Warm start | 4-6s |
| Inference | 90+ FPS on H100 (3.5x+ real-time) |
| VRAM | ~4 GB shared + ~50 MB per session |
| Sessions per GPU | Up to 8 concurrent |
| Image size | ~19 GB (PyTorch-only, no TensorRT) |

## Troubleshooting

**GPU not detected?**
```bash
docker info | grep -i runtime    # Should show: nvidia
nvidia-smi                       # Should show your GPU
```

**Container won't start?**
```bash
docker compose logs expression-avatar
```

Common errors:
- `No CUDA GPUs are available` -- NVIDIA Container Toolkit not installed, or wrong CUDA_VISIBLE_DEVICES
- `BITHUMAN_API_SECRET is required` -- Set your API secret in `.env`
- `API key validation failed` -- Your API secret is invalid. Check at [bithuman.ai/dashboard](https://bithuman.ai/dashboard)
- `Missing required model files` -- Weight download may have failed. Remove volume and retry:
  ```bash
  docker compose down -v
  docker compose up
  ```

**Agent can't connect to LiveKit Cloud?**
```bash
docker compose logs agent
```
- Check `LIVEKIT_URL` starts with `wss://` (not `ws://`)
- Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` match your LiveKit Cloud project
- Ensure the VPS has outbound internet access on port 443

**UI loads but avatar doesn't appear?**
```bash
docker compose logs agent
```
- Check that `OPENAI_API_KEY` is set in `.env`
- Check that `BITHUMAN_AVATAR_IMAGE` is a valid URL or container path
- Wait for `Avatar Worker Ready` in the expression-avatar logs before opening the browser
- Open browser DevTools > Console and check for WebSocket connection errors

**Microphone not working?**
- Browsers require HTTPS or localhost for microphone access
- Use the SSH tunnel (`ssh -L 4202:localhost:4202`) so the browser sees `localhost`
- Or set up nginx + certbot for HTTPS

**Port conflict?**
Change exposed ports in `.env`:
```bash
GPU_PORT=9089            # Expression avatar (default: 8089)
```

## Files

| File | Description |
|------|-------------|
| `docker-compose.yml` | Stack: GPU + agent + frontend (3 services, no local LiveKit) |
| `quickstart.py` | Animate a face image with audio (standalone, no LiveKit) |
| `agent.py` | LiveKit agent connecting to local GPU container |
| `.env.example` | Environment variable template |
| `speech.wav` | Sample audio file for quickstart (13s, 16kHz) |

## API Reference

The expression-avatar container exposes these HTTP endpoints on port 8089:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness + capacity |
| `/launch` | POST | Start avatar session (JSON or multipart form) |
| `/tasks` | GET | List active sessions |
| `/tasks/{id}` | GET | Session status |
| `/tasks/{id}/stop` | POST | Stop a session |
| `/test-frame` | GET | Generate test frame (JPEG) |
| `/benchmark` | POST | Run inference benchmark |
