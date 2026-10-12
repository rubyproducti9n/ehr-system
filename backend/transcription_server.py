"""
EHR Platform — Transcription WebSocket Server
Runs as a separate process on TRANSCRIPTION_PORT (default 8000).
Receives 16kHz mono 16-bit PCM binary frames over WebSocket.
Returns transcribed text per chunk with status messages.

Start: python backend/transcription_server.py
"""

import asyncio
import json
import logging
import time
from pathlib import Path

import websockets
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env.backend")

from config import TRANSCRIPTION_HOST, TRANSCRIPTION_PORT, TRANSCRIPTION_CHUNK_SECONDS
from transcription_engine import load_model, transcribe_chunk, get_model_info, is_model_loaded

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ehr-ws-transcription")

SAMPLE_RATE = 16000
MIN_CHUNK_BYTES = int(SAMPLE_RATE * TRANSCRIPTION_CHUNK_SECONDS * 2)


async def send_json(ws, data: dict):
    """Send JSON message to client safely."""
    try:
        await ws.send(json.dumps(data))
    except Exception:
        pass


async def handle_client(websocket):
    client_id = id(websocket)
    log.info(f"Client connected: {client_id}")
    audio_buffer = bytearray()
    chunk_count = 0
    session_start = time.time()

    try:
        # Send ready signal immediately
        await send_json(websocket, {
            "type": "ready",
            "message": "Transcription engine ready. Start speaking.",
            "model": get_model_info(),
        })

        async for message in websocket:

            if isinstance(message, bytes):
                # Accumulate PCM audio bytes
                audio_buffer.extend(message)

                # Process when we have enough audio for one chunk
                while len(audio_buffer) >= MIN_CHUNK_BYTES:
                    chunk = bytes(audio_buffer[:MIN_CHUNK_BYTES])
                    audio_buffer = audio_buffer[MIN_CHUNK_BYTES:]
                    chunk_count += 1

                    # Notify client processing is happening
                    await send_json(websocket, {
                        "type": "processing",
                        "chunk": chunk_count,
                        "message": "Processing...",
                    })

                    try:
                        result = transcribe_chunk(chunk, SAMPLE_RATE)
                        text = result["text"]

                        if text:
                            await send_json(websocket, {
                                "type": "transcript",
                                "text": text,
                                "confidence": result["confidence"],
                                "chunk": chunk_count,
                                "duration": result["duration_seconds"],
                                "is_final": False,
                            })
                        else:
                            # Empty chunk — silence detected
                            await send_json(websocket, {
                                "type": "silence",
                                "chunk": chunk_count,
                            })

                    except Exception as e:
                        log.error(f"Transcription error on chunk {chunk_count}: {e}")
                        await send_json(websocket, {
                            "type": "chunk_error",
                            "chunk": chunk_count,
                            "error": str(e),
                            "message": "Chunk processing failed — continuing",
                        })
                        # Do not crash — continue with next chunk

            elif isinstance(message, str):
                try:
                    cmd = json.loads(message)
                    cmd_type = cmd.get("type", "")

                    if cmd_type == "stop":
                        # Flush remaining buffer
                        if len(audio_buffer) > 512:
                            await send_json(websocket, {
                                "type": "processing",
                                "chunk": chunk_count + 1,
                                "message": "Finalising transcript...",
                            })
                            try:
                                result = transcribe_chunk(bytes(audio_buffer), SAMPLE_RATE)
                                if result["text"]:
                                    await send_json(websocket, {
                                        "type": "transcript",
                                        "text": result["text"],
                                        "confidence": result["confidence"],
                                        "chunk": chunk_count + 1,
                                        "duration": result["duration_seconds"],
                                        "is_final": True,
                                    })
                            except Exception as e:
                                log.error(f"Final flush error: {e}")

                        session_duration = round(time.time() - session_start, 1)
                        await send_json(websocket, {
                            "type": "stopped",
                            "total_chunks": chunk_count,
                            "session_duration_seconds": session_duration,
                            "message": "Transcription complete.",
                        })
                        await asyncio.sleep(0.05)
                        break

                    elif cmd_type == "ping":
                        await send_json(websocket, {"type": "pong"})

                except json.JSONDecodeError:
                    pass

    except websockets.exceptions.ConnectionClosedOK:
        log.info(f"Client {client_id} disconnected cleanly")
    except websockets.exceptions.ConnectionClosedError as e:
        log.warning(f"Client {client_id} connection lost: {e}")
    except Exception as e:
        log.error(f"Unexpected error for client {client_id}: {e}")
        try:
            await send_json(websocket, {
                "type": "fatal_error",
                "error": str(e),
                "message": "Transcription session ended due to an error.",
            })
        except Exception:
            pass
    finally:
        log.info(f"Session ended for client {client_id} — {chunk_count} chunks processed")


async def health_handler(websocket):
    await send_json(websocket, {
        "type": "health",
        "status": "ok",
        "model_loaded": is_model_loaded(),
        "model": get_model_info(),
    })
    await websocket.close()


async def router(websocket):
    path = getattr(websocket, "path", "/")
    try:
        path = websocket.request.path
    except AttributeError:
        pass
    if path == "/health":
        await health_handler(websocket)
    else:
        await handle_client(websocket)


async def main():
    log.info("=" * 50)
    log.info("EHR Transcription WebSocket Server")
    log.info(f"Port: {TRANSCRIPTION_PORT}")
    log.info("=" * 50)

    # Model already loaded at import time via preload below
    log.info(f"Listening on ws://{TRANSCRIPTION_HOST}:{TRANSCRIPTION_PORT}")

    async with websockets.serve(
        router,
        TRANSCRIPTION_HOST,
        TRANSCRIPTION_PORT,
        max_size=10 * 1024 * 1024,   # 10MB max message — covers large audio chunks
        ping_interval=20,
        ping_timeout=10,
    ):
        await asyncio.Future()


if __name__ == "__main__":
    # Preload model before accepting connections
    log.info("Preloading omi-med-stt model...")
    try:
        load_model()
    except FileNotFoundError as e:
        log.error(str(e))
        log.error("Cannot start transcription server without model.")
        exit(1)
    except Exception as e:
        log.error(f"Model load failed: {e}")
        exit(1)

    asyncio.run(main())
