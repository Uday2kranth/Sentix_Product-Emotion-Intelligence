# AI Agent Replication Prompt - NLP Product Review Chatbot

**Copy and paste the text below into your chat with the new AI Agent working on your NLP Product Review project.**

---

**Prompt for the AI Agent:**

I need you to build and integrate an intelligent chatbot into this NLP Product Review application. We need to replicate the exact architecture, memory handling, and UI/UX from another successful project I built. Follow these instructions strictly:

### 1. Multi-Provider LLM Integration (Bring Your Own Key)
You must build a system where the user selects the AI provider and model directly from the frontend UI.
*   **Frontend UI:** Create a "ChatDrawer" or sidebar component in React. Inside this drawer, include a settings section with dropdowns for the Provider, the Model, and an input field for the API Key.
*   **OpenRouter Free Models List:** The backend and frontend MUST use this exact, API-verified list of Free OpenRouter models to prevent 400 validation errors:
    *   `openrouter/free` (Auto-router)
    *   `google/gemma-4-26b-a4b-it:free`
    *   `google/gemma-4-31b-it:free`
    *   `meta-llama/llama-3.2-3b-instruct:free`
    *   `meta-llama/llama-3.3-70b-instruct:free`
    *   `nvidia/nemotron-3-nano-30b-a3b:free`
    *   `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
    *   `nvidia/nemotron-3-super-120b-a12b:free`
    *   `nvidia/nemotron-3-ultra-550b-a55b:free`
    *   `nvidia/nemotron-3.5-content-safety:free`
    *   `nvidia/nemotron-nano-12b-v2-vl:free`
    *   `nvidia/nemotron-nano-9b-v2:free`
    *   `openai/gpt-oss-120b:free`
    *   `openai/gpt-oss-20b:free`
    *   `nex-agi/nex-n2-pro:free`
    *   `nousresearch/hermes-3-llama-3.1-405b:free`
    *   `cohere/north-mini-code:free`
    *   `liquid/lfm-2.5-1.2b-instruct:free`
    *   `liquid/lfm-2.5-1.2b-thinking:free`
    *   `poolside/laguna-m.1:free`
    *   `poolside/laguna-xs.2:free`
    *   `qwen/qwen3-coder:free`
    *   `qwen/qwen3-next-80b-a3b-instruct:free`
    *   `cognitivecomputations/dolphin-mistral-24b-venice-edition:free`
*   **Providers Required:** Google Gemini, OpenRouter, Mistral, Cerebras, and Ollama (Local).
*   **Backend Handling:** The frontend must send the `chat_provider`, `chat_model`, and `chat_api_key` along with the user's message to the FastAPI backend.
*   **LLM Factory:** In the backend, create a factory function (e.g., `get_llm(provider, api_key, model)`) using LangChain that instantiates the correct LLM based on the user's frontend selection. Do NOT hardcode API keys.

### 2. Context Injection (Connecting NLP Output to the Chatbot)
The chatbot must "know" what the main NLP model predicted so it doesn't get confused.
*   When the NLP model generates a product review prediction (e.g., Sentiment Analysis, Keywords, Summary, Score), the backend must format this into a string (e.g., a "Review Report Context").
*   Inject this report directly into the **System Prompt** of the LangChain Agent when the session starts.
*   The AI should proactively use this injected context to explain the NLP results to the user and understand what the user is referring to when they say "this review".

### 3. Memory Architecture
We must use in-memory state management for the chat history, grouped by a unique session ID, exactly like my previous project.
*   Use a global Python dictionary in the FastAPI backend: `chat_histories = {}`
*   When the frontend sends a chat request, it must include a `session_id`.
*   Retrieve the history: `history = chat_histories.get(session_id, [])`
*   Use standard LangChain message classes (`HumanMessage`, `AIMessage`, `SystemMessage`).
*   Append the new user message to the history, run the LangChain Agent, and append the Agent's response back to the dictionary. Do not use external databases for this memory.

### 4. Strict but Contextual System Prompting
The agent must be strictly locked to the domain of "Product Reviews and NLP analysis" but still allow relevant contextual conversation based on the specific product.
*   **Theme-Based Guardrails:** The system prompt MUST forbid the AI from answering questions outside the theme of product reviews, retail, e-commerce, or the NLP output. (e.g., Refuse to answer questions about medical advice, politics, or unrelated sports).
*   **Permitting Domain-Relevant Context:** If the user asks general questions about the *specific product* mentioned in the review (e.g., "What is the average price of this laptop model?", "What are the common alternatives to this product?", "Is this brand reliable?"), the AI MUST answer them. Do not refuse queries about the economics, specifications, or market context of the product currently being analyzed.
*   **Disclaimer:** Have the AI state that it is an AI interpreting NLP data and is not a direct representative of the product manufacturer or retail store.

### 5. Chat Rendering & Thread-Safe Typewriter (Fixing Spelling & Jumbled Layouts)
To prevent the chatbot from generating text with mutated/dropped letters (spelling mistakes) or collapsing structure (making answers hard to read), follow these layout rules:
*   **Thread-Safe Typewriter Component**: Do NOT use `setInterval` with a local mutable counter variable (`let index = 0`) inside `useEffect`. React Strict Mode executes effects twice concurrently in development, which leads to overlapping intervals writing characters out-of-order, mutating spelling. Instead, write a `setTimeout` typewriter that increments a state length index and renders using `text.slice(0, currentLength)`. Always clean up the timeout on component update and unmount.
*   **Preserving Text Structure**: All chat message bubble containers in the React UI must include the `whitespace-pre-wrap` Tailwind CSS class (or `white-space: pre-wrap` style). This ensures that line breaks (`\n`), lists, and bullet points returned by the LLM are rendered natively by the browser instead of being flattened into single, hard-to-read text blocks.

Please implement the React frontend components, the FastAPI endpoint, and the LangChain agent logic based exactly on these architectural requirements.

