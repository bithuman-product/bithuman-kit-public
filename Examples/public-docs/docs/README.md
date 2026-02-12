# bitHuman SDK

> Create lifelike digital avatars that respond to audio in real-time.

---

## Quick Start

### Option 1: Docker (Recommended)

Full app with web UI, voice conversation, and LiveKit integration.

```bash
git clone https://github.com/bithuman-product/examples.git
cd examples/public-docker-example

# Add your API keys to .env
echo "BITHUMAN_API_SECRET=your_secret" > .env
echo "OPENAI_API_KEY=your_openai_key" >> .env

# Add your .imx model to models/
mkdir -p models && cp ~/Downloads/avatar.imx models/

docker compose up
# Open http://localhost:4202
```

[Full Docker Example →](https://github.com/bithuman-product/examples/tree/main/public-docker-example)

### Option 2: Python SDK

Integrate directly into your Python application.

```bash
pip install bithuman --upgrade
```

```python
from bithuman import AsyncBithuman

# Create runtime
runtime = await AsyncBithuman.create(
    model_path="avatar.imx",
    api_secret="sk_bh_..."
)
await runtime.start()

# Push audio and get animated frames
await runtime.push_audio(audio_bytes, sample_rate=16000)
await runtime.flush()

async for frame in runtime.run():
    frame.bgr_image       # numpy array (H, W, 3)
    frame.audio_chunk     # synchronized audio output
    frame.end_of_speech   # True when utterance ends
```

[SDK Quickstart Example →](https://github.com/bithuman-product/examples/tree/main/public-sdk-examples/01-quickstart)

---

## Core API

| Method | Description |
|--------|-------------|
| `AsyncBithuman.create(model_path, api_secret)` | Initialize the avatar runtime |
| `runtime.start()` | Begin processing |
| `runtime.push_audio(data, sample_rate)` | Send audio for lip-sync |
| `runtime.flush()` | Signal end of audio input |
| `runtime.run()` | Async generator yielding video + audio frames |
| `runtime.get_frame_size()` | Returns `(width, height)` of output |

---

## Examples

| Example | Description | Link |
|---------|-------------|------|
| **Audio Clip** | Play audio file through avatar | [01-quickstart](https://github.com/bithuman-product/examples/tree/main/public-sdk-examples/01-quickstart) |
| **Live Microphone** | Real-time mic input to avatar | [02-microphone](https://github.com/bithuman-product/examples/tree/main/public-sdk-examples/02-microphone) |
| **AI Conversation** | OpenAI voice chat with avatar | [03-ai-conversation](https://github.com/bithuman-product/examples/tree/main/public-sdk-examples/03-ai-conversation) |
| **Streaming Server** | WebSocket server with LiveKit | [04-streaming-server](https://github.com/bithuman-product/examples/tree/main/public-sdk-examples/04-streaming-server) |
| **Web UI** | Browser-based Gradio interface | [05-web-ui](https://github.com/bithuman-product/examples/tree/main/public-sdk-examples/05-web-ui) |
| **Docker App** | Full stack: LiveKit + OpenAI + Web UI | [public-docker-example](https://github.com/bithuman-product/examples/tree/main/public-docker-example) |
| **Apple Offline** | 100% local on macOS (Siri + Ollama) | [public-macos-offline-example](https://github.com/bithuman-product/examples/tree/main/public-macos-offline-example) |
| **Java Client** | WebSocket streaming from Java | [public-java-example](https://github.com/bithuman-product/examples/tree/main/public-java-example) |

---

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Linux (x86_64)** | Full Support | Production ready |
| **Linux (ARM64)** | Full Support | Edge deployments |
| **macOS (Apple Silicon)** | Full Support | M2+, M4 ideal |
| **Windows** | Full Support | Via WSL |
