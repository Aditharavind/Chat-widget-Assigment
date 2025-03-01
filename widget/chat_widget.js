(function() {
    /***********************
     * Configuration
     ***********************/
    // Real OpenAI API key (WARNING: Exposing your key in client-side JS is insecure for production)
    const OPENAI_API_KEY = ""
    // LocalStorage keys
    const CURRENT_CHAT_KEY = 'current_chat';
    const SESSION_KEY = 'chat_sessions';
  
    /***********************
     * CSS and HTML Setup
     ***********************/
    const style = document.createElement('style');
    style.innerHTML = `
      /* Main widget container */
      #chat-widget-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        font-family: Arial, sans-serif;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        flex-direction: column;
      }
      /* Header with title and minimize button */
      #chat-widget-header {
        background: #007bff;
        color: #fff;
        padding: 10px;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #chat-widget-header h3 {
        margin: 0;
        font-size: 16px;
      }
      #chat-widget-header button {
        background: transparent;
        border: none;
        color: #fff;
        font-size: 18px;
        cursor: pointer;
      }
      /* Chat body (tabs and panels) */
      .chat-body {
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      /* Tab header */
      #chat-widget-tabs {
        display: flex;
        background: #f1f1f1;
        border-bottom: 1px solid #ccc;
      }
      #chat-widget-tabs div {
        flex: 1;
        padding: 10px;
        text-align: center;
        cursor: pointer;
        font-weight: bold;
      }
      #chat-widget-tabs .active {
        background: #fff;
        border-bottom: 2px solid #007bff;
      }
      /* Tab panels */
      .chat-tab-panel {
        display: none;
        padding: 10px;
        overflow-y: auto;
        flex: 1;
      }
      .chat-tab-panel.active {
        display: block;
      }
      /* Chat messages area */
      #chat-messages {
        border: 1px solid #eee;
        padding: 10px;
        height: 200px;
        overflow-y: auto;
        background: #f9f9f9;
        margin-bottom: 10px;
      }
      .message {
        margin-bottom: 8px;
        padding: 6px;
        border-radius: 4px;
        word-wrap: break-word;
      }
      .message.user {
        background: #e2e2e2;
        text-align: right;
      }
      .message.ai {
        background: #d1e7dd;
        text-align: left;
      }
      /* Input area */
      #chat-input-area {
        display: flex;
        margin-top: 10px;
      }
      #chat-input {
        flex: 1;
        padding: 8px;
        font-size: 14px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      #chat-send {
        padding: 8px 12px;
        margin-left: 5px;
        background: #007bff;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      /* File upload style */
      #chat-file {
        margin-top: 10px;
      }
      /* Export/Import and Clear Chat buttons */
      #export-convo, #import-convo-btn, #clear-chat {
        margin-top: 10px;
        padding: 6px 10px;
        background: #28a745;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      #import-convo {
        display: none;
      }
      /* History list */
      #history-list {
        list-style: none;
        padding: 0;
      }
      #history-list li {
        border-bottom: 1px solid #eee;
        padding: 5px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #history-list button {
        padding: 4px 8px;
        font-size: 12px;
        background: #007bff;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      #history-actions {
        margin-top: 10px;
        text-align: right;
      }
      #history-actions button {
        padding: 5px 10px;
        font-size: 12px;
        background: #dc3545;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      /* Minimized state: hide chat body */
      #chat-widget-container.minimized .chat-body {
        display: none;
      }
    `;
    document.head.appendChild(style);
  
    // Create the widget container HTML
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'chat-widget-container';
    widgetContainer.innerHTML = `
      <div id="chat-widget-header">
        <h3>Chat with AI</h3>
        <button id="minimize-btn">–</button>
      </div>
      <div class="chat-body">
        <div id="chat-widget-tabs">
          <div id="tab-chat" class="active">Chat</div>
          <div id="tab-history">History</div>
        </div>
        <div id="panel-chat" class="chat-tab-panel active">
          <div id="chat-messages"></div>
          <div id="chat-input-area">
            <input type="text" id="chat-input" placeholder="Type your message..." />
            <button id="chat-send">Send</button>
          </div>
          <input type="file" id="chat-file" />
          <button id="clear-chat">Clear Chat</button>
          <button id="export-convo">Export Conversation</button>
          <button id="import-convo-btn">Import Conversation</button>
          <input type="file" id="import-convo" accept="application/json" />
        </div>
        <div id="panel-history" class="chat-tab-panel">
          <ul id="history-list"></ul>
          <div id="history-actions">
            <button id="clear-history">Clear History</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(widgetContainer);
  
    /***********************
     * Widget Functionality
     ***********************/
    // Global variable for the current chat conversation
    let currentChat = [];
  
    // On load, restore the auto-saved conversation (if any) from localStorage
    const storedChat = localStorage.getItem(CURRENT_CHAT_KEY);
    if (storedChat) {
      try {
        currentChat = JSON.parse(storedChat);
      } catch (e) {
        currentChat = [];
      }
    }
  
    // Auto-save the current chat to localStorage
    function autoSaveCurrentChat() {
      localStorage.setItem(CURRENT_CHAT_KEY, JSON.stringify(currentChat));
    }
  
    // Utility functions for session (history) storage
    function getSavedSessions() {
      const sessions = localStorage.getItem(SESSION_KEY);
      return sessions ? JSON.parse(sessions) : [];
    }
    function saveSession(sessionObj) {
      const sessions = getSavedSessions();
      sessions.push(sessionObj);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
    }
    function clearSessions() {
      localStorage.removeItem(SESSION_KEY);
    }
  
    // Render chat messages in the Chat panel and auto-save
    function renderChatMessages() {
      const messagesContainer = document.getElementById('chat-messages');
      messagesContainer.innerHTML = '';
      currentChat.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ' + msg.role;
        msgDiv.textContent = msg.content;
        messagesContainer.appendChild(msgDiv);
      });
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      autoSaveCurrentChat();
    }
  
    // Render saved sessions in the History panel
    function renderHistory() {
      const historyList = document.getElementById('history-list');
      historyList.innerHTML = '';
      const sessions = getSavedSessions();
      sessions.forEach((session, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${session.timestamp}</span> <button data-index="${index}">Load</button>`;
        historyList.appendChild(li);
      });
    }
  
    // Real AI response function using OpenAI's Chat API and local knowledge base file
    async function getAIResponse(message) {
      let kbContext = "";
      try {
        // Fetch local knowledge base from a file (ensure this file is served by your web server)
        const kbResponse = await fetch("/knowledge/knowledge.json");
        if (kbResponse.ok) {
          const kbData = await kbResponse.json();
          kbContext = kbData.context || "";
        } else {
          console.error("Local knowledge base request failed:", kbResponse.statusText);
        }
      } catch (err) {
        console.error("Error retrieving local knowledge base:", err);
      }
  
      // Now call OpenAI's Chat API with the retrieved context
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + OPENAI_API_KEY
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a helpful AI assistant. Use the following knowledge base context to answer the user's query: " + kbContext },
              { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 150,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
          })
        });
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message);
        }
        return data.choices[0].message.content.trim();
      } catch (error) {
        console.error("Error fetching AI response:", error);
        return "AI: [Error fetching response]";
      }
    }
  
    // Event: Send message
    document.getElementById('chat-send').addEventListener('click', async () => {
      const input = document.getElementById('chat-input');
      const text = input.value.trim();
      if (!text) return;
      // Append user's message and update chat display
      currentChat.push({ role: 'user', content: text });
      renderChatMessages();
      input.value = '';
      // Get AI response (with knowledge base context)
      const aiResponse = await getAIResponse(text);
      currentChat.push({ role: 'ai', content: aiResponse });
      renderChatMessages();
    });
  
    // Send message on Enter key press
    document.getElementById('chat-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('chat-send').click();
      }
    });
  
    // Event: File upload for attachments
    document.getElementById('chat-file').addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        currentChat.push({ role: 'user', content: "Uploaded file: " + file.name });
        renderChatMessages();
        event.target.value = '';
      }
    });
  
    // Event: Export conversation to JSON file
    document.getElementById('export-convo').addEventListener('click', () => {
      const dataStr = JSON.stringify(currentChat, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "conversation_" + new Date().toISOString() + ".json";
      a.click();
      URL.revokeObjectURL(url);
    });
  
    // Event: Import conversation from JSON file
    const importInput = document.getElementById('import-convo');
    document.getElementById('import-convo-btn').addEventListener('click', () => {
      importInput.click();
    });
    importInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedChat = JSON.parse(e.target.result);
          if (Array.isArray(importedChat)) {
            currentChat = importedChat;
            renderChatMessages();
            alert("Conversation imported successfully!");
          } else {
            alert("Invalid conversation file.");
          }
        } catch (err) {
          alert("Error reading file: " + err.message);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    });
  
    // Event: Clear Chat button – save current conversation to history then clear it
    document.getElementById('clear-chat').addEventListener('click', () => {
      if (currentChat.length === 0) {
        alert("No conversation to clear!");
        return;
      }
      const sessionObj = {
        timestamp: new Date().toLocaleString(),
        messages: currentChat.slice()
      };
      saveSession(sessionObj);
      currentChat = [];
      renderChatMessages();
      renderHistory();
      alert("Conversation saved to history and cleared!");
    });
  
    // History: Load a saved session from the History tab
    document.getElementById('history-list').addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'button') {
        const index = e.target.getAttribute('data-index');
        const sessions = getSavedSessions();
        if (sessions[index]) {
          currentChat = sessions[index].messages;
          renderChatMessages();
          setActiveTab('chat');
        }
      }
    });
  
    // History: Clear all saved sessions
    document.getElementById('clear-history').addEventListener('click', () => {
      if (confirm("Are you sure you want to clear all chat history?")) {
        clearSessions();
        renderHistory();
      }
    });
  
    // Tab switching logic
    document.getElementById('tab-chat').addEventListener('click', () => {
      setActiveTab('chat');
    });
    document.getElementById('tab-history').addEventListener('click', () => {
      setActiveTab('history');
      renderHistory();
    });
    function setActiveTab(tab) {
      const tabChat = document.getElementById('tab-chat');
      const tabHistory = document.getElementById('tab-history');
      const panelChat = document.getElementById('panel-chat');
      const panelHistory = document.getElementById('panel-history');
      if (tab === 'chat') {
        tabChat.classList.add('active');
        tabHistory.classList.remove('active');
        panelChat.classList.add('active');
        panelHistory.classList.remove('active');
      } else {
        tabChat.classList.remove('active');
        tabHistory.classList.add('active');
        panelChat.classList.remove('active');
        panelHistory.classList.add('active');
      }
    }
  
    // Minimize/Maximize toggle for the widget
    document.getElementById('minimize-btn').addEventListener('click', () => {
      widgetContainer.classList.toggle('minimized');
      const btn = document.getElementById('minimize-btn');
      btn.textContent = widgetContainer.classList.contains('minimized') ? '+' : '–';
    });
  
    // Initial rendering
    renderChatMessages();
    renderHistory();
  })();
  