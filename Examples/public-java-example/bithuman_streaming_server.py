"""
BitHuman Streaming Server — WebSocket-based Audio-In / Video-Out

This server wraps the BitHuman Python SDK and exposes a bidirectional
WebSocket endpoint so that any language (Java, Go, C#, etc.) can:

  1. Send raw PCM audio chunks  ->  (binary WebSocket frames)
  2. Receive JPEG video frames  <-  (binary WebSocket frames)
  3. Receive PCM audio output   <-  (binary WebSocket frames)
  4. Send control messages       ->  (JSON text frames)

Binary protocol (server -> client):
  Video frame:
    Header (21 bytes):  type=0x01 (1B) | width (2B BE) | height (2B BE)
                        | fps (4B BE float) | jpeg_len (4B BE) | timestamp (8B BE double)
    Payload:            JPEG bytes

  Audio chunk:
    Header (18 bytes):  type=0x02 (1B) | sample_rate (4B BE) | channels (1B)
                        | pcm_len (4B BE) | timestamp (8B BE double)
    Payload:            int16 PCM bytes (little-endian, same as input)

  End-of-speech marker:
    Header (1 byte):    type=0x03

Text protocol (client -> server):
  {"type": "end"}         — signal end of current audio segment (flush)
  {"type": "interrupt"}   — interrupt current playback

Binary protocol (client -> server):
  Raw int16 PCM audio bytes (16 kHz, mono, little-endian)

Usage:
    python bithuman_streaming_server.py \
        --model /path/to/avatar.imx \
        --api-secret sk_bh_xxxxx \
        --port 8765

    Then connect from Java (or any WebSocket client) to ws://host:8765
"""

import argparse
import asyncio
import json
import os
import struct
import sys
import signal

import time

import cv2
import numpy as np
from loguru import logger

try:
    import websockets
except ImportError:
    logger.error("websockets is required: pip install websockets")
    sys.exit(1)

from bithuman import AsyncBithuman
from bithuman.utils import FPSController

logger.remove()
logger.add(sys.stdout, level="INFO")

# Binary message type tags
TAG_VIDEO = 0x01
TAG_AUDIO = 0x02
TAG_END_OF_SPEECH = 0x03

# JPEG encode quality
JPEG_QUALITY = 80


class BithumanStreamingServer:
    """Wraps AsyncBithuman and serves audio-in / video-out over WebSocket."""

    def __init__(
        self,
        runtime: AsyncBithuman,
        host: str = "0.0.0.0",
        port: int = 8765,
    ):
        self.runtime = runtime
        self.host = host
        self.port = port

        self._audio_queue: asyncio.Queue[bytes] = asyncio.Queue()
        self._clients: dict[str, websockets.WebSocketServerProtocol] = {}
        self._running = False
        self._fps = FPSController(target_fps=25)

    # ── lifecycle ────────────────────────────────────────────────────

    async def start(self) -> None:
        self._running = True
        await self.runtime.start()

        self._ws_server = await websockets.serve(
            self._on_client_connect,
            self.host,
            self.port,
            ping_interval=30,
            ping_timeout=10,
            max_size=2**20,  # 1 MB max message
        )
        logger.info(f"WebSocket server listening on ws://{self.host}:{self.port}")

        # background tasks
        self._audio_task = asyncio.create_task(self._pump_audio())
        self._video_task = asyncio.create_task(self._pump_video())

    async def stop(self) -> None:
        self._running = False
        for task in (self._audio_task, self._video_task):
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        self._ws_server.close()
        await self._ws_server.wait_closed()
        for ws in list(self._clients.values()):
            await ws.close()
        await self.runtime.stop()
        logger.info("Server stopped")

    # ── WebSocket handler ────────────────────────────────────────────

    async def _on_client_connect(self, websocket, path=None):
        cid = str(id(websocket))
        self._clients[cid] = websocket
        remote = websocket.remote_address
        logger.info(f"Client {cid} connected from {remote}")

        # send welcome
        await websocket.send(json.dumps({
            "type": "connected",
            "message": "BitHuman streaming server ready",
            "audio_format": {
                "sample_rate": 16000,
                "channels": 1,
                "encoding": "int16_le",
                "chunk_ms": 100,
            },
            "video_format": {
                "codec": "jpeg",
                "fps": 25,
            },
        }))

        try:
            async for message in websocket:
                if isinstance(message, bytes):
                    # raw PCM audio
                    await self._audio_queue.put(message)
                elif isinstance(message, str):
                    await self._handle_json(message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self._clients.pop(cid, None)
            logger.info(f"Client {cid} disconnected")

    async def _handle_json(self, raw: str) -> None:
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Bad JSON from client")
            return

        msg_type = msg.get("type", "")
        if msg_type == "end":
            logger.info("Client signalled end-of-speech")
            await self.runtime.flush()
        elif msg_type == "interrupt":
            logger.info("Client requested interrupt")
            self.runtime.interrupt()
        else:
            logger.warning(f"Unknown message type: {msg_type}")

    # ── audio pump (client -> runtime) ───────────────────────────────

    async def _pump_audio(self) -> None:
        while self._running:
            try:
                audio_bytes = await self._audio_queue.get()
                await self.runtime.push_audio(audio_bytes, 16000, last_chunk=False)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Audio pump error: {e}")

    # ── video pump (runtime -> clients) ──────────────────────────────

    async def _pump_video(self) -> None:
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]

        try:
            async for frame in self.runtime.run():
                sleep_time = self._fps.wait_next_frame(sleep=False)
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)

                if not self._clients:
                    self._fps.update()
                    continue

                # encode video
                if frame.has_image:
                    _, jpeg = cv2.imencode(".jpg", frame.bgr_image, encode_params)
                    jpeg_bytes = jpeg.tobytes()
                    h, w = frame.bgr_image.shape[:2]
                    fps_val = self._fps.average_fps

                    ts = time.time()

                    # header: type(1) + width(2) + height(2) + fps(4) + jpeg_len(4) + timestamp(8) = 21
                    header = struct.pack("!BHHfI", TAG_VIDEO, w, h, fps_val, len(jpeg_bytes))
                    header += struct.pack("!d", ts)
                    video_msg = header + jpeg_bytes

                    await self._broadcast(video_msg)

                # encode audio
                if frame.audio_chunk is not None:
                    pcm = frame.audio_chunk.array  # int16 numpy
                    pcm_bytes = pcm.tobytes()
                    sr = frame.audio_chunk.sample_rate

                    ts = time.time()

                    # header: type(1) + sample_rate(4) + channels(1) + pcm_len(4) + timestamp(8) = 18
                    header = struct.pack("!BIBI", TAG_AUDIO, sr, 1, len(pcm_bytes))
                    header += struct.pack("!d", ts)
                    audio_msg = header + pcm_bytes

                    await self._broadcast(audio_msg)

                # end-of-speech
                if frame.end_of_speech:
                    await self._broadcast(struct.pack("!B", TAG_END_OF_SPEECH))

                self._fps.update()

        except asyncio.CancelledError:
            pass

    async def _broadcast(self, data: bytes) -> None:
        dead = []
        for cid, ws in self._clients.items():
            try:
                await ws.send(data)
            except Exception:
                dead.append(cid)
        for cid in dead:
            self._clients.pop(cid, None)


# ── main ─────────────────────────────────────────────────────────────

async def main(args: argparse.Namespace) -> None:
    runtime = await AsyncBithuman.create(
        model_path=args.model,
        api_secret=args.api_secret,
        token=args.token,
        insecure=args.insecure,
    )

    frame_size = runtime.get_frame_size()
    logger.info(f"Model loaded — frame size {frame_size[0]}x{frame_size[1]}")

    server = BithumanStreamingServer(runtime, host=args.host, port=args.port)
    await server.start()

    # graceful shutdown
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _signal_handler():
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _signal_handler)

    await stop_event.wait()
    await server.stop()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BitHuman WebSocket Streaming Server")
    parser.add_argument("--model", type=str, default=os.environ.get("BITHUMAN_MODEL_PATH"),
                        help="Path to .imx avatar model")
    parser.add_argument("--api-secret", type=str, default=os.environ.get("BITHUMAN_API_SECRET"),
                        help="BitHuman API secret (sk_bh_...)")
    parser.add_argument("--token", type=str, default=os.environ.get("BITHUMAN_RUNTIME_TOKEN"),
                        help="BitHuman runtime token (optional)")
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--insecure", action="store_true")

    args = parser.parse_args()
    assert args.model, "Model path required (--model or BITHUMAN_MODEL_PATH env)"
    assert args.api_secret or args.token, "API secret or token required"

    asyncio.run(main(args))
