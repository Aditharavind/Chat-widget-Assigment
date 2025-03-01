
# Intelligent Chat Widget

## Overview

The Intelligent Chat Widget is designed to provide an intelligent, context-aware chat experience that can be easily integrated into any website. In this project, I experimented with two implementation approaches:

1. **Streamlit Approach (app2.py):**  
   This version implements most of the required features, including:
   - Offline message queuing (messages are queued when offline and processed once online)
   - Auto-saving of chat history (stored as JSON files locally)
   - File upload support for images, PDFs, and documents
   - Integration with a knowledge base via a vector store (using LangChain's Chroma)
   - A robust chat interface using Streamlit's built-in components

   **Limitation:** Although feature-rich, the Streamlit version is built as a full-page application and is not easily embeddable as a widget.

2. **Pure JavaScript Approach (widget folder):**  
   This implementation is entirely in client-side JavaScript, making it fully embeddable. Key features include:
   - A responsive, embeddable chat widget with a tabbed interface (Chat and History)
   - Real-time integration with OpenAI’s Chat API to generate responses
   - Auto-saving of the active conversation in localStorage
   - Export/import functionality to manage conversation files
   - A "Clear Chat" button that saves the current conversation to history before clearing it

   **Limitation:** Some advanced features (e.g., dynamic knowledge base integration and offline queuing) could not be fully replicated in the pure JS version.

> **Note:**  
> For demonstration purposes, API keys (both OpenAI and, if applicable, Supabase) are included in client-side code. For production, these calls should be proxied through a secure backend.

---

## Architecture Overview

The project is structured into two separate implementations:

- **Streamlit Implementation:**  
  - **Language & Tools:** Python, Streamlit, OpenAI API, LangChain's Chroma, and PyPDF2.
  - **Features:** Implements offline message queuing, file uploads, auto-saving chat history (to JSON files), and dynamic context retrieval from a knowledge base.
  - **File:** `app2.py`

- **Pure JavaScript Implementation:**  
  - **Language & Tools:** Vanilla JavaScript (using Fetch API and localStorage).
  - **Features:** Provides a fully embeddable chat widget that auto-saves conversations, supports export/import, maintains conversation history, and calls the real OpenAI Chat API to generate responses.
  - **Files:** Located in the `widget/` folder (including `index.html` and `chat_widget.js`).

---

## Implementation Details

### User Interface
- **Streamlit Version:**  
  Uses Streamlit’s built-in widgets to build a full-page chat interface that supports file uploads, message queuing, and chat history management.
  
- **Pure JavaScript Version:**  
  Dynamically injects the chat widget into the webpage. The widget features:
  - A header with a minimize/maximize toggle.
  - A tabbed interface for "Chat" and "History."
  - A message area with auto-scrolling.
  - An input field with a send button and file upload control.
  - Buttons to export, import, and clear chat sessions.

### State Management
- **Streamlit Version:**  
  Uses Streamlit's session state and local JSON files to maintain conversation history.
  
- **Pure JavaScript Version:**  
  Uses the browser's localStorage to auto-save the active conversation under the key `current_chat` and store cleared sessions (history) under `chat_sessions`.

### API Integration
- **OpenAI Chat API:**  
  Both approaches use OpenAI’s Chat API to generate responses.  
  - **Endpoint:** `https://api.openai.com/v1/chat/completions`
  - **Method:** POST
  - **Headers:**  
    - `Content-Type: application/json`
    - `Authorization: Bearer YOUR_OPENAI_API_KEY`
  - **Payload:** A system message ("You are a helpful AI assistant.") and the user query.
  
  The response is parsed and the AI message is appended to the conversation.

---

## API Documentation

### OpenAI Chat API
- **Endpoint:** `https://api.openai.com/v1/chat/completions`
- **Method:** POST
- **Request Example:**
  ```json
  {
    "model": "gpt-3.5-turbo",
    "messages": [
      { "role": "system", "content": "You are a helpful AI assistant." },
      { "role": "user", "content": "What are your operating hours?" }
    ],
    "temperature": 0.7,
    "max_tokens": 150,
    "top_p": 1,
    "frequency_penalty": 0,
    "presence_penalty": 0
  }
  ```
- **Response:**  
  The widget extracts the AI reply from:
  ```js
  data.choices[0].message.content
  ```

---

## How to Run

### Streamlit Approach
1. **Requirements:**  
   Python, Streamlit, OpenAI, LangChain, PyPDF2, and necessary dependencies.
2. **Setup:**  
   - Ensure you have the required API keys and configure your environment.
   - Run the application with:
     ```bash
     streamlit run app2.py
     ```
   - The app will launch in your browser as a full-page application.

### Pure JavaScript Approach
1. **Files Location:**  
   - The pure JS solution is in the `widget/` folder.
2. **Setup:**  
   - Host the project on a web server (for local testing, use Live Server in VSCode or run `npx http-server .`).
   - Open `index.html` in your browser.
   - The chat widget will appear in the bottom-right corner.
3. **Configuration:**  
   - Update the OpenAI API key in `chat_widget.js`.
   - For production, secure API calls using a backend proxy.

---

## Integration Guide

To integrate the pure JavaScript widget into any website:

1. **Include the Widget Script:**  
   Copy the `chat_widget.js` file into your project (preferably in a `widget/` folder).
2. **Embed the Widget:**  
   Include the following script tag before the closing `</body>` tag in your webpage:
   ```html
   <script src="widget/chat_widget.js"></script>
   ```
3. **Ensure Requirements:**  
   - The widget uses localStorage, so ensure the user's browser supports it.
   - Update configuration details (like the OpenAI API key) in the JavaScript file as needed.
4. **Deployment:**  
   - Host the webpage and the widget files on your web server.
   - The widget will automatically inject itself into the page.

---

## Project Structure

```
project-root/
├── app2.py           # Streamlit-based chat widget implementation
├── widget/
│   ├── index.html    # Sample webpage for the pure JavaScript widget
│   └── chat_widget.js  # Pure JavaScript chat widget code
```

---

