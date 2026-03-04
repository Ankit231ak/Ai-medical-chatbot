import gradio as gr
from medical_ai import text_chat, image_analysis
from voice import generate_voice

# Text chat
def get_text(user_message):
    if not user_message:
        return "Please enter your problem.", None
    response = text_chat(user_message)
    return response, response

def create_voice(text):
    if text is None:
        return None
    
    return generate_voice(text)

# Image analysis
def analyze_image(image):

    if image is None:
        return "Please upload an image.", None

    disease, explanation = image_analysis(image)
    result = f"Detected Disease: {disease}\n\nExplanation:\n{explanation}"
    return result, explanation


with gr.Blocks(title="AI Medical Assistant") as app:
    gr.Markdown("# 🩺 AI Medical Chatbot")
    gr.Markdown("Text Consultation • Skin Disease Detection")

    #Text tab
    with gr.Tab("Medical Chat"):

        text_input = gr.Textbox(
            label="Describe your health problem",
            placeholder="Example: I have headache and fever"
        )

        text_output = gr.Textbox(label="AI Advice")
        audio_output = gr.Audio(label="Voice Response", autoplay=True, show_download_button=False)
        ask_btn = gr.Button("Ask AI")

        ask_btn.click(
            get_text,
            inputs=text_input,
            outputs=[text_output, text_output]
        ).then(
            create_voice,
            inputs=text_output,
            outputs=audio_output
        )

    # Image tab
    with gr.Tab("Skin Disease Detection"):

        image_input = gr.Image(type="filepath")
        image_output = gr.Textbox(label="Result")
        audio_output2 = gr.Audio(label="Voice Explanation", autoplay=True, show_download_button=False)
        analyze_btn = gr.Button("Analyze Skin")

        analyze_btn.click(
            analyze_image,
            inputs=image_input,
            outputs=[image_output, image_output]
        ).then(
            create_voice,
            inputs=image_output,
            outputs=audio_output2
        )

app.launch()