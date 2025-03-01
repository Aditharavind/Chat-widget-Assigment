import streamlit as st
import openai
import os
import json
import requests
from langchain.vectorstores import Chroma
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.chat_models import ChatOpenAI
from PyPDF2 import PdfReader

# ✅ API & Storage Paths
OPENAI_API_KEY = ""
VECTOR_DB_PATH = "./chroma_db"
CHAT_HISTORY_DIR = "./chat_history"
MEDIA_DIR = "./media"

# ✅ Ensure directories exist
os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)
os.makedirs(MEDIA_DIR, exist_ok=True)

# ✅ Initialize Vector Store
embedding_function = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
vector_db = Chroma(persist_directory=VECTOR_DB_PATH, embedding_function=embedding_function)

# ✅ Functions to Save/Load Chat History
def save_chat_history(session_id, messages):
    filename = os.path.join(CHAT_HISTORY_DIR, f"{session_id}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(messages, f, indent=4)

def load_chat_histories():
    chat_sessions = {}
    for file in os.listdir(CHAT_HISTORY_DIR):
        if file.endswith(".json"):
            with open(os.path.join(CHAT_HISTORY_DIR, file), "r", encoding="utf-8") as f:
                chat_sessions[file.replace(".json", "")] = json.load(f)
    return chat_sessions

# ✅ Load Existing Chat Histories
chat_sessions = load_chat_histories()

# ✅ Initialize Chat Model
llm = ChatOpenAI(model_name="gpt-3.5-turbo", openai_api_key=OPENAI_API_KEY)

# ✅ Streamlit UI Setup
st.set_page_config(page_title="AI Chatbot with Media & Offline Support", layout="wide")
st.title("💬 AI Chatbot")

# ✅ Session Management
if "current_session" not in st.session_state:
    st.session_state.current_session = None
if "messages" not in st.session_state:
    st.session_state.messages = []
if "message_queue" not in st.session_state:
    st.session_state.message_queue = []

# ✅ Sidebar Tabs
tab1, tab2 = st.sidebar.tabs(["💬 Chat", "📜 Chat History"])

with tab2:
    st.subheader("Saved Conversations")
    if chat_sessions:
        selected_chat = st.selectbox("Select a conversation", list(chat_sessions.keys()))
        if st.button("Load Conversation"):
            st.session_state.messages = chat_sessions[selected_chat]
            st.session_state.current_session = selected_chat
    if st.button("➕ Start New Conversation"):
        st.session_state.messages = []
        st.session_state.current_session = None

# ✅ Display Chat History (ensuring "type" defaults to "text")
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        message_type = msg.get("type", "text")
        if message_type == "text":
            st.write(msg["content"])
        elif message_type == "image":
            st.image(msg["content"], caption="Sent Image")
        elif message_type == "file":
            st.markdown(f"[📂 Download File]({msg['content']})")

# ✅ File Upload for Media Messages
uploaded_file = st.file_uploader("📁 Upload a File (Images, PDFs, Docs)", type=["png", "jpg", "jpeg", "pdf", "txt", "docx"])
if uploaded_file:
    file_path = os.path.join(MEDIA_DIR, uploaded_file.name)
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    file_type = "image" if uploaded_file.type.startswith("image") else "file"
    st.session_state.messages.append({
        "role": "user", 
        "type": file_type, 
        "content": file_path
    })

# ✅ Helper function to get AI response for a given message
def get_ai_response(message):
    # Retrieve context from the knowledge base
    search_results = vector_db.similarity_search(message, k=3)
    context = "\n".join([doc.page_content for doc in search_results])
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are an AI assistant. Answer questions using provided knowledge base context."},
            {"role": "user", "content": f"Context:\n{context}\n\nUser Query: {message}"}
        ],
        api_key=OPENAI_API_KEY
    )
    return response["choices"][0]["message"]["content"]

# ✅ User Input
user_input = st.chat_input("Type your message...")
if user_input:
    # Set a session name if starting a new conversation
    if not st.session_state.messages:
        st.session_state.current_session = user_input[:30].replace(" ", "_")
    
    # ✅ Check internet connection
    try:
        requests.get("https://www.google.com", timeout=3)
        internet_available = True
    except requests.ConnectionError:
        internet_available = False
    
    if not internet_available:
        st.session_state.message_queue.append(user_input)
        st.warning("⚠️ No internet. Message saved & will be sent when online.")
    else:
        # Process any queued messages and generate responses for each
        while st.session_state.message_queue:
            queued_message = st.session_state.message_queue.pop(0)
            st.session_state.messages.append({
                "role": "user", 
                "type": "text", 
                "content": queued_message
            })
            with st.chat_message("user"):
                st.write(queued_message)
            with st.spinner("Processing queued message..."):
                queued_response = get_ai_response(queued_message)
            st.session_state.messages.append({
                "role": "assistant", 
                "type": "text", 
                "content": queued_response
            })
            with st.chat_message("assistant"):
                st.write(queued_response)
        
        # Now process the current message
        st.session_state.messages.append({
            "role": "user", 
            "type": "text", 
            "content": user_input
        })
        with st.chat_message("user"):
            st.write(user_input)
        with st.spinner("Processing message..."):
            bot_response = get_ai_response(user_input)
        st.session_state.messages.append({
            "role": "assistant", 
            "type": "text", 
            "content": bot_response
        })
        with st.chat_message("assistant"):
            st.write(bot_response)
    
    # ✅ Save Chat History after processing input
    save_chat_history(st.session_state.current_session, st.session_state.messages)

