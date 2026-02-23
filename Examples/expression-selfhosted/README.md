# Expression + Self-Hosted

Run a bitHuman Expression (GPU) avatar on your own GPU hardware.
Full local control -- audio and video stay on your machine.

## Prerequisites

- NVIDIA GPU with 8GB+ VRAM (tested on H100, A100, RTX 4090)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
- Docker with GPU support
- bitHuman API secret ([www.bithuman.ai](https://www.bithuman.ai) > Developer section)
- A face image (JPEG/PNG)

## Verify GPU Access

```bash
docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu22.04 nvidia-smi
```

## Terminal Quickstart

Start the GPU container first:

```bash
docker run --gpus all -p 8089:8089 \
    -e BITHUMAN_API_SECRET=your_secret \
    -v bithuman-models:/data/models \
    sgubithuman/expression-avatar:latest
```

First run downloads ~5 GB of model weights (cached for subsequent runs).
Cold start takes ~48 seconds for GPU compilation.

Then in another terminal:

```bash
pip install -r requirements.txt
python quickstart.py --avatar-image face.jpg --audio-file speech.wav
```

## Full App with Docker

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env: set API secret and face image

# 2. (Optional) Place avatar images in ./avatars/
mkdir -p avatars
cp face.jpg avatars/
# Then set BITHUMAN_AVATAR_IMAGE=/app/avatars/face.jpg in .env

# 3. Start all services (including GPU container)
docker compose up
```

Open [http://localhost:4202](http://localhost:4202) in your browser.

The Docker stack runs 5 services:
- **expression-avatar**: GPU rendering container (port 8089 internal)
- **LiveKit**: WebRTC server (ports 17880-17881)
- **Agent**: AI conversation handler
- **Frontend**: Web interface (port 4202)
- **Redis**: State management

## Performance

| Metric | Value |
|--------|-------|
| Cold start | ~48s (GPU compilation, one-time) |
| Warm start | 4-6s |
| FPS | 305 (theoretical), 25+ (real-time) |
| VRAM | ~6 GB per session |
| Sessions per GPU | Up to 8 concurrent |

## Troubleshooting

**GPU not detected?**
```bash
# Check NVIDIA runtime
docker info | grep -i runtime
# Should show: nvidia
```

**Container won't start?**
```bash
# Check GPU container logs
docker compose logs expression-avatar
```

**Slow first start?**
Model weights download on first run (~5 GB). The `bithuman-models` Docker volume caches them for subsequent starts.

## Files

| File | Description |
|------|-------------|
| `quickstart.py` | Animate face image with audio via local GPU (terminal) |
| `agent.py` | LiveKit agent connecting to local GPU container |
| `docker-compose.yml` | Full stack including expression-avatar GPU container |
