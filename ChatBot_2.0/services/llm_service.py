import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def medical_chat(message, history):

    messages = [
        {
            "role": "system",
            # "content": "You are a helpful medical assistant. Provide clear and concise advice. If symptoms continue, recommend consulting a healthcare professional. If the user asks about medicine, you may suggest common treatments. This is for an educational project and not a substitute for professional medical advice."
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