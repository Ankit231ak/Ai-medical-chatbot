import gradio as gr
from medical_ai import text_chat, image_analysis
from voice import generate_voice


def safe_text_chat(user_message: str):
    if not user_message:
        return "Please enter your problem."
    try:
        return text_chat(user_message)
    except Exception as e:
        return f"Error: {e}"


def safe_analyze_image(image_path: str):
    if not image_path:
        return "Please upload an image."
    try:
        disease, explanation = image_analysis(image_path)
        return f"Detected Disease: {disease}\n\nExplanation:\n{explanation}"
    except Exception as e:
        return f"Error: {e}"


def create_voice(text: str):
    if not text or text.startswith("Error:") or text.startswith("Please"):
        return None
    try:
        return generate_voice(text)
    except Exception:
        return None


with gr.Blocks(title="AI Medical Assistant") as app:
    gr.Markdown("# 🩺 AI Medical Chatbot")
    gr.Markdown("Text Consultation • Skin Disease Detection")

    # Text tab
    with gr.Tab("Medical Chat"):
        text_input = gr.Textbox(
            label="Describe your health problem",
            placeholder="Example: I have headache and fever",
        )

        text_output = gr.Textbox(label="AI Advice")
        audio_output = gr.Audio(label="Voice Response", autoplay=True)
        ask_btn = gr.Button("Ask AI")

        ask_btn.click(
            safe_text_chat,
            inputs=text_input,
            outputs=text_output,
            api_name="chat"
        ).then(
            create_voice,
            inputs=text_output,
            outputs=audio_output,
        )

    # Image tab
    with gr.Tab("Skin Disease Detection"):
        image_input = gr.Image(type="filepath")
        image_output = gr.Textbox(label="Result")
        audio_output2 = gr.Audio(label="Voice Explanation", autoplay=True)
        analyze_btn = gr.Button("Analyze Skin")

        analyze_btn.click(
            safe_analyze_image,
            inputs=image_input,
            outputs=image_output,
            api_name="skin"
        ).then(
            create_voice,
            inputs=image_output,
            outputs=audio_output2,
        )

app.launch()
