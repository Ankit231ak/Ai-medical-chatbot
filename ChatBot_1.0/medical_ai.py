import os
from groq import Groq
from dotenv import load_dotenv
from gradio_client import Client, handle_file

load_dotenv()

_GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Initialize clients lazily so the app can still start without keys.
_client = Groq(api_key=_GROQ_API_KEY) if _GROQ_API_KEY else None
_hf_client = Client("Nine231/skin-disease-detector")


def _require_groq():
    if not _GROQ_API_KEY:
        raise RuntimeError(
            "Missing GROQ_API_KEY in .env. Please add your key to use this feature."
        )


def text_chat(user_input: str) -> str:
    if not user_input or user_input.strip() == "":
        return "Please provide a valid query."
    
    _require_groq()
    
    try:
        response = _client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=150,
            temperature=0.3,
            messages=[
                {
                    "role": "system",
                    "content": """
                    You are a medical assistant.
                    Give short and clear health advice.
                    Suggest common medicines if needed.
                    Recommend visiting a doctor if symptoms continue.
                    """,
                },
                {"role": "user", "content": user_input},
            ],
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error connecting to Groq: {str(e)}"


def image_analysis(image_path: str):
    """Returns: (disease, explanation_text)"""
    if not image_path:
        return "No image", "Please upload a clear image of the skin condition."

    try:
        # HuggingFace inference
        result = _hf_client.predict(
            image=handle_file(image_path),
            api_name="/predict",
        )
        disease = result[0] if isinstance(result, list) else result
    except Exception as e:
        return "Analysis Failed", f"Error during skin analysis: {str(e)}"

    # Explanation via Groq
    if not _GROQ_API_KEY:
        return disease, "Note: Detailed explanation unavailable (Missing GROQ_API_KEY)."

    try:
        explanation = _client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=150,
            temperature=0.3,
            messages=[
                {
                    "role": "system",
                    "content": """
                    Explain this skin disease in simple language.
                    Give precautions and basic care advice.
                    Suggest visiting a dermatologist if it does not improve.
                    """,
                },
                {
                    "role": "user",
                    "content": f"The detected disease is: {disease}",
                },
            ],
        )
        return disease, explanation.choices[0].message.content
    except Exception as e:
        return disease, f"Error generating explanation: {str(e)}"

