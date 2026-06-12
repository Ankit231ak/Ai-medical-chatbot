import asyncio
import edge_tts
import tempfile
import re

VOICE = "en-IN-NeerjaNeural"


def _clean_text(text: str) -> str:
    # Basic cleanup to make TTS output better.
    text = re.sub(r"\s+", " ", text).strip()
    return text


async def _create_audio(text: str) -> str:
    text = _clean_text(text)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
        filename = f.name

    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(filename)
    return filename


def generate_voice(text: str):
    """Gradio Audio expects a filepath/URL.

    Returns a tuple because Gradio sometimes chains outputs.
    """
    if text is None:
        return None
    return asyncio.run(_create_audio(text))

