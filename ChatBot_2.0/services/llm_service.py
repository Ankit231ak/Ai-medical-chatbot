import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=_GROQ_API_KEY) if _GROQ_API_KEY else None


def medical_chat(message, history):
    if not _GROQ_API_KEY:
        return "Error: Missing GROQ_API_KEY in .env. Please add it to use the chatbot."

    if not message or message.strip() == "":
        return "Please describe your symptoms."

    messages = [
        {
            "role": "system",
            "content": 
"""
You are a helpful medical assistant.
Give simple and short answers.

If the user has common symptoms, you may suggest
common over-the-counter medicines.

Examples:
• Fever → Paracetamol (Dolo-650)
• Cold or allergy → Cetirizine
• Pain → Ibuprofen or Paracetamol

Use bullet points and simple language.
Try to finished your answer in 160 words.
Always remind the user to see a doctor if symptoms continue.
"""
        }
    ]

    if history:
        for m in history[-6:]:
            messages.append({
                "role": m["role"],
                "content": m["content"]
            })

    messages.append({
        "role": "user",
        "content": message
    })

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        temperature=0.3,
        max_tokens=160,
        messages=messages
    )

    return response.choices[0].message.content