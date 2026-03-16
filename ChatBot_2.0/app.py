import gradio as gr
from services.llm_service import medical_chat
from services.skin_service import analyze_skin


def chat(message, history):

    if history is None:
        history = []

    if message.strip() == "":
        yield "", history
        return

    history = history + [{"role": "user", "content": message}]
    response = medical_chat(message, history)

    partial = ""
    for char in response:
        partial += char
        yield "", history + [{"role": "assistant", "content": partial}]

    history = history + [{"role": "assistant", "content": response}]


# Skin detection
def detect(image):

    if image is None:
        return "Please upload an image."

    disease, explanation = analyze_skin(image)

    return f"""
### Detected Disease
**{disease}**

### Explanation
{explanation}
"""


css = """
body {
    background: linear-gradient(135deg, #141e30, #243b55);
    background: black;
}

.gradio-container {
    max-width: 1200px !important;
    width: 800px;

    margin: auto;
}

.chat-container {
    background: white;
    border-radius: 10px;
    padding: 20px;
}

.skin-container {
    background: #111827;
    border-radius: 12px;
    padding: 20px;
}

textarea {
    font-size: 14px !important;
}

button {
    font-size: 14px !important;
}

.prose {
    font-size: 15px !important;
}

h1 {
    text-align:center;
    font-size:42px !important;
}
"""


with gr.Blocks(css=css) as app:

    gr.Markdown("# AI Medical Assistant")

    with gr.Tabs():

        # Chat
        with gr.Tab("Medical Chat"):

            with gr.Column(elem_classes="chat-container"):

                chatbot = gr.Chatbot(height=450)

                msg = gr.Textbox(
                    placeholder="Describe your symptoms...",
                    label=None
                )

                with gr.Row():
                    send = gr.Button("Send", variant="primary")
                    clear = gr.Button("Clear Chat")

                send.click(
                    chat,
                    inputs=[msg, chatbot],
                    outputs=[msg, chatbot]
                )

                msg.submit(
                    chat,
                    inputs=[msg, chatbot],
                    outputs=[msg, chatbot]
                )

                clear.click(lambda: [], None, chatbot, queue=False)

        # Skin Detection
        with gr.Tab("Skin Disease Detection"):

            with gr.Column(elem_classes="skin-container"):

                image = gr.Image(type="filepath", label="Upload Skin Image")

                analyze_btn = gr.Button("Analyze Skin", variant="primary")

                result = gr.Markdown()

                analyze_btn.click(
                    detect,
                    inputs=image,
                    outputs=result
                )


app.queue()
app.launch()