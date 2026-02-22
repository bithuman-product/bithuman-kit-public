"""AI voice agent with a bitHuman avatar — runs locally with OpenAI Realtime.

Speak into your mic, hear the AI respond, and watch the avatar lip-sync in real time.
No LiveKit server needed — everything runs on your machine.

Usage:
    python local_agent.py
"""

import asyncio
import base64
import logging
import os
import sys
import threading

import cv2
import numpy as np
import sounddevice as sd
from dotenv import load_dotenv
from loguru import logger
from openai import AsyncOpenAI

from bithuman import AsyncBithuman

load_dotenv()
logger.remove()
logger.add(sys.stdout, level="INFO")
logging.getLogger("numba").setLevel(logging.WARNING)

OPENAI_SAMPLE_RATE = 24000  # OpenAI Realtime requires 24kHz PCM16
AVATAR_SAMPLE_RATE = 16000  # bitHuman outputs at 16kHz
MIC_CHUNK = 240             # 10ms at 24kHz


async def main():
    model_path = os.getenv("BITHUMAN_MODEL_PATH")
    api_secret = os.getenv("BITHUMAN_API_SECRET")
    openai_key = os.getenv("OPENAI_API_KEY")

    if not model_path or not api_secret:
        raise ValueError("Set BITHUMAN_MODEL_PATH and BITHUMAN_API_SECRET in your .env")
    if not openai_key:
        raise ValueError("Set OPENAI_API_KEY in your .env")

    runtime = await AsyncBithuman.create(model_path=model_path, api_secret=api_secret)
    width, height = runtime.get_frame_size()

    cv2.namedWindow("bitHuman", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("bitHuman", width, height)

    loop = asyncio.get_running_loop()
    mic_queue: asyncio.Queue[bytes] = asyncio.Queue()
    ai_audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue()
    speaker_buf = bytearray()
    speaker_lock = threading.Lock()

    def mic_callback(indata, frames, time_info, status):
        """Convert float32 mic input to int16 PCM and enqueue."""
        samples = (indata[:, 0] * 32767).astype(np.int16)
        asyncio.run_coroutine_threadsafe(mic_queue.put(samples.tobytes()), loop)

    def speaker_callback(outdata, frames, time_info, status):
        """Drain buffered avatar audio to speakers."""
        n_bytes = frames * 2
        with speaker_lock:
            avail = min(len(speaker_buf), n_bytes)
            outdata[:avail // 2, 0] = np.frombuffer(speaker_buf[:avail], dtype=np.int16)
            outdata[avail // 2:, 0] = 0
            del speaker_buf[:avail]

    mic_stream = sd.InputStream(
        samplerate=OPENAI_SAMPLE_RATE, channels=1, dtype="float32",
        blocksize=MIC_CHUNK, callback=mic_callback,
    )
    speaker_stream = sd.OutputStream(
        samplerate=AVATAR_SAMPLE_RATE, channels=1, dtype="int16",
        blocksize=640, callback=speaker_callback,
    )
    mic_stream.start()
    speaker_stream.start()
    await runtime.start()

    async def run_openai():
        """Connect to OpenAI Realtime, stream mic in, collect AI audio out."""
        client = AsyncOpenAI(api_key=openai_key)
        async with client.beta.realtime.connect(model="gpt-4o-mini-realtime-preview") as conn:
            await conn.session.update(session={
                "instructions": "You are a friendly AI assistant. Keep responses concise.",
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "turn_detection": {"type": "server_vad"},
                "voice": "alloy",
            })
            logger.info("Connected to OpenAI Realtime — speak now (press Q in video window to quit)")

            async def send_mic():
                while True:
                    data = await mic_queue.get()
                    await conn.input_audio_buffer.append(audio=base64.b64encode(data).decode())

            send_task = asyncio.create_task(send_mic())
            try:
                async for event in conn:
                    if event.type == "response.audio.delta":
                        await ai_audio_queue.put(base64.b64decode(event.delta))
                    elif event.type == "response.audio.done":
                        await ai_audio_queue.put(None)  # signal flush
            finally:
                send_task.cancel()

    async def push_to_bithuman():
        """Feed OpenAI audio responses into the bitHuman runtime."""
        while True:
            data = await ai_audio_queue.get()
            if data is None:
                await runtime.flush()
            else:
                await runtime.push_audio(data, OPENAI_SAMPLE_RATE, last_chunk=False)

    openai_task = asyncio.create_task(run_openai())
    bithuman_task = asyncio.create_task(push_to_bithuman())

    try:
        async for frame in runtime.run(idle_timeout=0.5):
            if frame.has_image:
                cv2.imshow("bitHuman", frame.bgr_image)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            if frame.audio_chunk:
                with speaker_lock:
                    speaker_buf.extend(frame.audio_chunk.array.tobytes())
    finally:
        openai_task.cancel()
        bithuman_task.cancel()
        mic_stream.stop()
        speaker_stream.stop()
        cv2.destroyAllWindows()
        await runtime.stop()


if __name__ == "__main__":
    asyncio.run(main())
