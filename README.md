# bitHumanKit (binary)

Public binary Swift Package for [bitHumanKit](https://docs.bithuman.ai/swift-sdk/overview) — bitHuman's on-device voice + lip-synced avatar SDK for Apple Silicon.

The source is private. This package consumes the pre-compiled `.xcframework` published to the source repo's GitHub Releases.

## Install

In Xcode: **File → Add Package Dependencies →**

```
https://github.com/bithuman-product/bithuman-kit-public.git
```

Or in `Package.swift`:

```swift
.package(url: "https://github.com/bithuman-product/bithuman-kit-public.git", from: "0.8.1")
```

Then:

```swift
import bitHumanKit
```

No transitive Swift Package dependencies — every third-party dep (MLX, HuggingFace, Tokenizers, …) is statically linked into the framework binary.

## Hardware floor

Runtime-gated via `HardwareCheck.evaluate()`:

| Platform | Minimum |
|---|---|
| macOS | M3+ Apple Silicon, macOS 26 (Tahoe) |
| iPad | iPad Pro M4+, 16 GB unified memory, iPadOS 26 |
| iPhone | iPhone 16 Pro+ (A18 Pro), iOS 26 |

## Documentation

- 10-min quickstart: <https://docs.bithuman.ai/swift-sdk/quickstart>
- Full guide: <https://docs.bithuman.ai/swift-sdk/overview>
- DocC API reference: <https://bithuman-product.github.io/bithuman-kit/>
- Reference apps: <https://github.com/bithuman-product/bithuman-apps>

## Get an API key

The avatar pipeline is metered (2 credits/min). Audio-only mode is unmetered.

Sign in at <https://www.bithuman.ai> → Developer → API Keys, then either set `VoiceChatConfig.apiKey` or export `BITHUMAN_API_KEY` before `chat.start()`.

## Versioning

Tags here mirror tags in the source repo. Each release of this package corresponds to a `v<X.Y.Z>-binary` release of the source repo.

## License

Binary distribution. Use of this SDK is governed by the [bitHuman Terms of Service](https://www.bithuman.ai/terms). Model weights are proprietary and downloaded at runtime from authenticated endpoints.
