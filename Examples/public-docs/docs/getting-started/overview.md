# Quick Start

Get a bitHuman avatar running in 5 minutes.

---

## 1. Get Credentials

1. Sign up at [imaginex.bithuman.ai](https://imaginex.bithuman.ai)
2. Copy your **API Secret** from the Developer page

   ![API Secret](assets/images/example-api-secret.jpg)

3. Download an avatar model (`.imx` file) from [Community Models](https://imaginex.bithuman.ai/#community)

   ![Download Model](assets/images/example-download-button.jpg)

## 2. Install

```bash
pip install bithuman --upgrade
```

## 3. Run Your First Avatar

```python
import asyncio
from bithuman import AsyncBithuman
from bithuman.audio import load_audio, float32_to_int16

async def main():
    # Initialize
    runtime = await AsyncBithuman.create(
        model_path="avatar.imx",
        api_secret="sk_bh_..."
    )
    await runtime.start()

    # Load and push audio
    audio, sr = load_audio("speech.wav")
    await runtime.push_audio(
        float32_to_int16(audio).tobytes(), sr
    )
    await runtime.flush()

    # Display animated frames
    async for frame in runtime.run():
        if frame.has_image:
            show(frame.bgr_image)  # numpy (H, W, 3)

asyncio.run(main())
```

[Full working example →](https://github.com/bithuman-product/examples/tree/main/public-sdk-examples/01-quickstart)

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Runtime** | `AsyncBithuman` instance that processes audio → video |
| **push_audio** | Feed audio bytes — avatar lip-syncs in real-time |
| **flush** | Signals end of audio input |
| **run()** | Async generator that yields frames at 25 FPS |
| **Frame** | Contains `.bgr_image` (numpy), `.audio_chunk`, `.end_of_speech` |

---

## Next Steps

Progress through the examples by complexity:

1. **[Audio Clip](examples/avatar-with-audio-clip.md)** — Play audio file through avatar *(5 min)*
2. **[Live Microphone](examples/avatar-with-microphone.md)** — Real-time mic input *(10 min)*
3. **[AI Conversation](examples/livekit-openai-agent.md)** — OpenAI voice chat *(15 min)*

Or jump straight to the **[Docker App](https://github.com/bithuman-product/examples/tree/main/public-docker-example)** for a complete end-to-end setup.

### Guides

- **[Prompt Guide](getting-started/prompts.md)** — Master the CO-STAR framework for avatar personality
- **[Media Guide](getting-started/media-guide.md)** — Upload voice, image, and video assets
- **[Animal Mode](getting-started/animal-mode.md)** — Create animal avatars

### System Requirements

- Python 3.9+, 4+ CPU cores, 8GB RAM
- macOS (M2+), Linux (x64/ARM64), or Windows (WSL)
