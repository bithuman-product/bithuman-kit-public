# bithuman Swift SDK — minimal example

An end-to-end demo of [`bithuman-product/bithuman-sdk-swift`](https://github.com/bithuman-product/bithuman-sdk-swift): load model weights, push synthetic audio, write the rendered avatar frames + paired audio to disk as a PNG sequence + WAV. Shows the exact lifecycle a real macOS app needs — construct, push, drain, flush, shutdown.

**What the example is NOT:** a real UI. Real apps feed frames into `CALayer` or `AVSampleBufferDisplayLayer` and audio into `AVAudioEngine`. This writes to disk so you can inspect the output in Finder.

For a fully-integrated reference app, see [**bitHuman Halo**](https://github.com/bithuman-product/halo) — the first app built on this SDK.

## Requirements

- macOS 14+
- **Apple Silicon, M3 or later**
- 16 GB RAM
- ~5 GB free disk (for weights cache)
- Xcode 16.3+ (Swift 6.1 tools)

## 1. Cache the weights (one-time, ~3.7 GB)

The SDK doesn't ship weights — they're hosted on Cloudflare R2. Drop these four files into `~/Library/Caches/com.bithuman.sdk/weights/`:

| File | Approx size |
|------|-------------|
| `dmd2_run9.safetensors`         | 2.8 GB |
| `wav2vec2.safetensors`          | 180 MB |
| `vae_encoder.safetensors`       | 340 MB |
| `turbo_vaed_ane_384.mlpackage`  | 40 MB (directory) |

Plus one reference latent file — `default_ref_latent.npy`. If you've installed [bitHuman Halo](https://github.com/bithuman-product/halo), it's bundled inside the app at `halo/Sources/bitHuman/Resources/default_ref_latent.npy`. Copy it into the same cache directory:

```bash
mkdir -p ~/Library/Caches/com.bithuman.sdk/weights
cp path/to/halo/Sources/bitHuman/Resources/default_ref_latent.npy \
   ~/Library/Caches/com.bithuman.sdk/weights/
```

The weight-download pipeline is automated in Halo but currently manual for SDK-only consumers. A future SDK release adds `Bithuman.downloadWeights(progress:)`.

## 2. Build + run

```bash
cd integrations/swift
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  swift run BithumanSwiftExample
```

Expected output:

```
BithumanSwiftExample — bitHuman Swift SDK demo

→ Loading weights from /Users/you/Library/Caches/com.bithuman.sdk/weights
✓ Loaded in 4.2s
✓ Frame size: 512×512
✓ Wrote static idle frame → output/frame_0000.png

→ Pushing 3.0s of synthetic audio
→ Draining frames…
  … 33 frames (total 33)
  … 24 frames (total 57)
  … 24 frames (total 81)

✓ 81 frames + 1 WAV written to ./output/
  Play audio + flip through PNGs at 25 FPS (40 ms each) to preview.
```

The `output/` directory ends up with:
- `frame_0000.png` — the static backdrop rendered from the reference latent during `Bithuman.create`
- `frame_0001.png` … `frame_NNNN.png` — the rendered avatar frames, 25 FPS
- `audio.wav` — the 24 kHz mono audio slice that pairs with those frames

Open them side-by-side to verify the lip-sync.

## What the code shows

1. **`ModelPaths.resolvingDefaults(refLatent:)`** — convenience initializer that validates the four weight files exist at their standard filenames inside the default cache directory and returns nil otherwise.
2. **`Bithuman.create(paths:)`** — one-call bootstrap that replaces the previous three-step `PipelineBox()` + `PipelineOps.load(box:paths:)` + `Bithuman(pipelineBox:)` dance.
3. **Audio push + chunk drain loop** — the core streaming pattern. In a real app a 25 FPS display timer drives the poll; here we just sleep 40 ms and try again.
4. **`bithuman.snapshot`** + **`chunkQueueCount`** — nonisolated status reads used to detect when all pushed audio has been rendered.
5. **Lifecycle signals** — `flush`, `shutdown`. `interrupt` is not exercised here (no mid-stream cutoff in a synthetic scenario).

## What the code deliberately skips

- **Real speech audio.** The synthetic tone complex is enough to drive visible mouth motion without needing a TTS dependency. For real speech, feed in the output of any TTS system that emits Float32 PCM.
- **Live display.** Writing to disk decouples the example from AppKit / UIKit / AVFoundation concerns. A real app replaces `writePNG` with `displayLayer.contents = frame as CFTypeRef` (CALayer) or a `CVPixelBuffer` conversion into `AVSampleBufferDisplayLayer`.
- **Identity swap.** `PipelineOps.swapIdentity(box:imageURL:)` is documented in the SDK DocC; this example uses the default reference latent to keep things simple.
- **Barge-in.** `bithuman.interrupt()` aborts in-flight rendering and clears the chunk queue. Exercise it by calling it from a second Task while audio is still being pushed.

## Extending the example

A few natural directions:

- **Pipe in real TTS.** Replace `synthSpeechAudio` with the float samples from OpenAI TTS, ElevenLabs, or an on-device Kokoro. Any Float32 PCM works — the SDK resamples internally.
- **Live preview.** Swap the `writePNG` loop for an `AVSampleBufferDisplayLayer` hosted in an NSView, and schedule the matching audio onto an `AVAudioEngine` player node.
- **Microphone in, avatar out.** Tap `AVAudioEngine.inputNode` at 16 kHz, forward buffers to `pushAudio`, and you've got a real-time mimic loop.
- **Bench harness.** Wrap the chunk-drain loop with `CFAbsoluteTimeGetCurrent()` calls to measure per-chunk latency. The SDK's performance contract is ≤ 40 ms p99 on M3 hardware.

## Troubleshooting

**`Weight files missing under …`**
Copy the four weight files + the reference latent into the cache directory as described above.

**`error: could not resolve package dependencies` / authentication prompt**
The `bithuman-sdk-swift` repo is currently private. You need a GitHub token with `Contents: Read` access to the repo. The simplest path: run `gh auth setup-git` once with an authenticated `gh` session. SPM will pick up the credential helper automatically.

**Tests hang for more than 30 s**
The synthesis function produces deliberately energetic audio. If the SDK appears to stall, check the Console for `[CoreML]` messages — a first-run `.mlpackage` compile can take 20+ seconds before the ANE decoder is ready.

**Frame rate below 25 FPS**
The SDK's performance contract assumes M3 hardware. M1 and M2 Macs are not supported in v0.x — the DiT model needs the GPU memory bandwidth of M3+ to sustain real-time generation.

## License

Apache 2.0 (matching the SDK). See [`../../LICENSE`](../../LICENSE).

Model weights are distributed under a separate license — see the SDK repo's `docs/WEIGHTS_LICENSE.md`.
