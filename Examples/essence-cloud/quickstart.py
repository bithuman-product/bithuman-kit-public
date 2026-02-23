"""Play an audio file through a cloud-hosted bitHuman Essence avatar.

No GPU, no .imx file needed. The avatar runs on bitHuman's cloud.

Usage:
    python quickstart.py --avatar-id A78WKV4515 --audio-file speech.wav
"""

import argparse
import asyncio
import os
import threading

import cv2
import numpy as np
import sounddevice as sd
from dotenv import load_dotenv

from bithuman import AsyncBithuman
from bithuman.audio import float32_to_int16, load_audio

load_dotenv()

audio_buf = bytearray()
audio_lock = threading.Lock()


def audio_callback(outdata, frames, _time, _status):
    n_bytes = frames * 2
    with audio_lock:
        available = min(len(audio_buf), n_bytes)
        outdata[:available // 2, 0] = np.frombuffer(audio_buf[:available], dtype=np.int16)
        outdata[available // 2:, 0] = 0
        del audio_buf[:available]


async def push_audio(runtime: AsyncBithuman, audio_file: str):
    audio_np, sr = load_audio(audio_file)
    audio_np = float32_to_int16(audio_np)

    chunk_size = sr // 100
    for i in range(0, len(audio_np), chunk_size):
        await runtime.push_audio(audio_np[i : i + chunk_size].tobytes(), sr, last_chunk=False)

    await runtime.flush()


async def main():
    parser = argparse.ArgumentParser(description="bitHuman Essence Cloud -- play audio through avatar")
    parser.add_argument("--avatar-id", default=os.getenv("BITHUMAN_AGENT_ID"),
                        help="Agent ID from www.bithuman.ai (e.g. A78WKV4515)")
    parser.add_argument("--audio-file", required=True, help="Path to audio file")
    parser.add_argument("--api-secret", default=os.getenv("BITHUMAN_API_SECRET"))
    args = parser.parse_args()

    if not args.avatar_id:
        print("Error: Provide --avatar-id or set BITHUMAN_AGENT_ID")
        print("Create an agent at https://www.bithuman.ai or via api/generation.py")
        return
    if not args.api_secret:
        print("Error: Set BITHUMAN_API_SECRET")
        return

    # Cloud mode: avatar_id instead of model_path
    runtime = await AsyncBithuman.create(
        avatar_id=args.avatar_id,
        api_secret=args.api_secret,
    )

    width, height = runtime.get_frame_size()
    cv2.namedWindow("bitHuman", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("bitHuman", width, height)

    speaker = sd.OutputStream(samplerate=16000, channels=1, dtype="int16",
                              blocksize=640, callback=audio_callback)
    speaker.start()

    await runtime.start()
    audio_task = asyncio.create_task(push_audio(runtime, args.audio_file))

    try:
        async for frame in runtime.run():
            if frame.has_image:
                cv2.imshow("bitHuman", frame.bgr_image)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            if frame.audio_chunk:
                with audio_lock:
                    audio_buf.extend(frame.audio_chunk.array.tobytes())
    finally:
        audio_task.cancel()
        speaker.stop()
        cv2.destroyAllWindows()
        await runtime.stop()


if __name__ == "__main__":
    asyncio.run(main())
