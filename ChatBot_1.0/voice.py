import asyncio
import edge_tts
import tempfile
import re

VOICE = "en-IN-NeerjaNeural"


def clean_text(text):
    text = re.sub(r"[*_`#\-]", "", text)
    text = re.sub(r"[(),]", "", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()

async def create_audio(text):
    text = clean_text(text)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
        filename = f.name

    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(filename)
    return filename


def generate_voice(text):
    return asyncio.run(create_audio(text))