import os
from groq import Groq
from dotenv import load_dotenv
from gradio_client import Client, handle_file

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
hf_client = Client("Nine231/skin-disease-detector")


def text_chat(user_input):

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        max_tokens=120,
        temperature=0.3,
        messages=[
            {
                "role": "system",
                "content": 
                    """
                    You are a medical assistant.
                    Give short and clear health advice.
                    Suggest common medicines if needed.
                    Recommend visiting a doctor if symptoms continue.
                    """
            },
            {
                "role": "user",
                "content": user_input
            }
        ]
    )

    return response.choices[0].message.content

def image_analysis(image_path):
    result = hf_client.predict(
        image=handle_file(image_path),
        api_name="/predict"
    )

    disease = result[0] if isinstance(result, list) else result

    explanation = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        max_tokens=120,
        temperature=0.3,
        messages=[
            {
                "role": "system",
                "content":
                    """
                    Explain this skin disease in simple language.
                    Give precautions and basic care advice.
                    Suggest visiting a dermatologist if it does not improve.
                    """
            },
            {
                "role": "user",
                "content": f"The detected disease is: {disease}"
            }
        ]
    )

    return disease, explanation.choices[0].message.content