import os
from groq import Groq
from gradio_client import Client, handle_file
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

hf_client = Client("Nine231/skin-disease-detector")


def analyze_skin(image_path):

    try:

        result = hf_client.predict(
            image=handle_file(image_path),
            api_name="/predict"
        )

        disease = result[0] if isinstance(result, list) else result

    except Exception:
        return "Detection failed", "Unable to analyze the image."

    explanation = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        max_tokens=160,
        temperature=0.3,
        messages=[
            {
                "role": "system",
                "content":
"""
You are a medical assistant explaining skin diseases.

Explain in simple language.

Structure the answer like this:

Possible condition:
Short explanation:

Common treatment:
• Suggest common medicines if appropriate
  (examples: antifungal cream, hydrocortisone, cetirizine for itching).

Home care:
• Basic care tips

Try to finished your answer in 160 words.
Keep the answer short and clear.
"""
            },
            {
                "role": "user",
                "content": f"The detected disease is {disease}"
            }
        ]
    )

    return disease, explanation.choices[0].message.content