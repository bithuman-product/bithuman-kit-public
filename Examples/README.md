# bitHuman Examples

Build and deploy AI avatars with real-time lip sync. Pick the approach that fits your use case.

Full documentation at **[docs.bithuman.ai](https://docs.bithuman.ai)**.

## Platform API

Programmatic agent management -- no SDK or local runtime needed.

| Example | Description |
|---------|-------------|
| [api/](api/) | Create agents, poll status, update prompts, generate dynamics, upload files |

## Avatar Integration

Four combinations of model type and deployment mode.

| Example | Model | Deployment | GPU Required | What You Need |
|---------|-------|------------|:------------:|---------------|
| [essence-cloud/](essence-cloud/) | Essence (CPU) | bitHuman Cloud | No | API secret + agent ID |
| [essence-selfhosted/](essence-selfhosted/) | Essence (CPU) | Your machine | No | API secret + `.imx` model file |
| [expression-cloud/](expression-cloud/) | Expression (GPU) | bitHuman Cloud | No | API secret + face image |
| [expression-selfhosted/](expression-selfhosted/) | Expression (GPU) | Your machine | Yes (8GB+) | API secret + NVIDIA GPU |
| [expression-selfhosted-livekit-cloud/](expression-selfhosted-livekit-cloud/) | Expression (GPU) | Your machine + LiveKit Cloud | Yes (8GB+) | API secret + NVIDIA GPU + LiveKit Cloud |

**Essence** avatars use pre-built `.imx` model files. **Expression** avatars accept any face image and render with a GPU-powered 1.3B parameter model.

## Language & Framework Integrations

| Example | Description |
|---------|-------------|
| [integrations/java/](integrations/java/) | Java WebSocket client for streaming avatar frames |
| [integrations/nextjs-ui/](integrations/nextjs-ui/) | Drop-in Next.js web interface for LiveKit rooms |
| [integrations/web-ui/](integrations/web-ui/) | Gradio browser UI with FastRTC |
| [integrations/macos-offline/](integrations/macos-offline/) | 100% offline macOS with Ollama + Apple Speech |

## Quick Start

```bash
git clone https://github.com/bithuman-product/bithuman-examples.git
cd examples

# Pick an example directory and follow its README
cd api/                        # REST API scripts
cd essence-cloud/              # Easiest -- cloud avatar, no models needed
cd essence-selfhosted/         # Local .imx model
cd expression-cloud/           # GPU avatar via cloud
cd expression-selfhosted/      # GPU avatar on your hardware
```

## Resources

- [bitHuman Documentation](https://docs.bithuman.ai)
- [bitHuman Platform](https://www.bithuman.ai)
- [bitHuman Runtime (PyPI)](https://pypi.org/project/bithuman/)
- [API Keys](https://www.bithuman.ai/#developer)

## License

MIT
