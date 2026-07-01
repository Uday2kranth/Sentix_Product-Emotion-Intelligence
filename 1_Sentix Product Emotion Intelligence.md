Here is the nicely structured Markdown version of your project specification. I've formatted the headers, cleaned up the lists, and properly formatted the directory tree and Python code blocks so it is ready to be pasted directly into your `file.md`.

***

# PROJECT SPECIFICATION: SENTIX - AI Emotion Analysis Platform

**Target Architecture:** React (Frontend) + Python/FastAPI (Backend)

---

## 1. PROJECT OVERVIEW & ARCHITECTURE

Sentix is a sophisticated, cyberpunk/lab-themed web application designed for deep emotional and sentiment analysis of product reviews. It supports single-text analysis and bulk dataset processing (CSV/JSON/Excel) with AI-powered column mapping, data visualization, and PDF reporting.

### 1.1 Directory Tree Structure (Target State)

```text
sentix_project/
├── frontend/                 # React + Vite Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/           # Buttons, Inputs, Tooltips, Modals
│   │   │   ├── charts/       # Recharts wrappers (Radar, Bar, Line)
│   │   │   └── layout/       # Sidebar, Topbar, SparkleEffect
│   │   ├── lib/
│   │   │   └── utils.ts      # Tailwind merge (cn) utilities
│   │   ├── services/
│   │   │   └── api.ts        # Axios/Fetch calls to Python backend
│   │   ├── types/
│   │   │   └── index.ts      # TypeScript interfaces (AnalysisResult, Emotion)
│   │   ├── App.tsx           # Main application state and routing/tabs
│   │   ├── index.css         # Global styles, Tailwind directives, custom CSS vars
│   │   └── main.tsx          # React entry point
│   ├── package.json
│   └── tailwind.config.js
│
└── backend/                  # Python Backend (FastAPI recommended)
    ├── app/
    │   ├── api/
    │   │   ├── routes/       # API Endpoints (analyze, dataset, config)
    │   │   └── dependencies.py # Auth, Rate limiting, DB sessions
    │   ├── core/
    │   │   ├── config.py     # Environment variables, settings
    │   │   └── security.py   # API key validation, CORS
    │   ├── services/
    │   │   ├── llm_service.py # Integration with Gemini/OpenAI/Anthropic APIs
    │   │   └── data_parser.py # Pandas logic for CSV/Excel processing
    │   ├── models/
    │   │   └── schemas.py    # Pydantic models (matching Frontend TS types)
    │   └── main.py           # FastAPI application instance
    ├── requirements.txt
    └── .env                  # Backend secrets
```

### 1.2 How Structure and Design Connect

The application uses a highly modular design. The `App.tsx` acts as the central orchestrator (Controller), holding the global state. The UI is broken down into semantic sections (Sidebar, Config, Single Analysis, Batch Analysis, Results, History).

The design system is strictly enforced via Tailwind CSS in `index.css` and inline classes, utilizing a specific color palette (dark background, neon green accents) and typography (monospace) to maintain the "Lab/Terminal" aesthetic.

---

## 2. FRONTEND DETAILS (React + Tailwind)

### 2.1 Design Choices & Aesthetics

* **Theme:** Cyberpunk / Data Lab / Terminal.
* **Colors:**
    * **Background:** `#0a0a0a` (Deep black/gray)
    * **Card/Surface:** `#14161a`
    * **Primary Accent (Sentix Green):** `#00FF88` (Neon green)
    * **Text (Ink):** `#e2e8f0` (Off-white)
    * **Muted Text:** `#64748b`
    * **Borders:** `#2a2d33`
* **Typography:** Strict use of `font-mono` (monospace fonts like JetBrains Mono or Fira Code) for all UI elements to simulate a terminal environment. Heavy use of uppercase and `tracking-widest` for labels.
* **Effects:** Glassmorphism (`backdrop-blur`), glowing drop shadows on active elements (`shadow-[0_0_20px_rgba(0,255,136,0.2)]`), and a custom animated background (`SparkleEffect`).

### 2.2 Core Components Used

* **Layout:** `Sidebar` (collapsible), `MainContent` area.
* **UI Elements:** `Tooltip`, `StatCard` (displays metrics with icons), `EmotionBadge` (progress bar for emotion scores).
* **Charts (via recharts):**
    * **EmotionRadar:** A `RadarChart` mapping the 7 core emotions.
    * **Primary Emotion Distribution:** A `BarChart` showing the count of each primary emotion in a batch.
    * **Sentiment Timeline:** A `LineChart` plotting sentiment scores across a batch of reviews.
* **Icons:** `lucide-react` (Activity, Database, History, Settings, Sparkles, Download, etc.).
* **Animations:** `framer-motion` (`motion.div`, `AnimatePresence`) used for page transitions, hover effects, and loading states.

### 2.3 Frontend State Management (React `useState`)

The frontend relies on the following critical state variables in `App.tsx`:

* **`activeTab`:** string ("single", "batch", "history", "config").
* **`inputText`:** string (Raw text input for single or raw batch).
* **`results`:** `AnalysisResult[]` (The array of processed data from the backend).
* **`isAnalyzing`:** boolean (Loading state for API calls).
* **`modelConfig`:** Object (Stores selected provider, model name, API key, custom keywords).
* **`uploadedData`:** Array of Objects (Raw parsed JSON/CSV data before mapping).
* **`columnMapping`:** Object `{ reviewColumn, productName, brand, modelNumber }` (User's selected columns).
* **`mappedBatch`:** Array of Objects (Data ready to be sent to the backend).
* **`isMapping`:** boolean (Loading state while AI suggests columns).
* **`filterEmotion` / `filterSentiment`:** State for filtering the results view.

### 2.4 Function Connectivity (Frontend Flow)

1.  **Data Ingestion:** User types text OR uploads a file. If file -> PapaParse/XLSX parses it -> sets `uploadedData`.
2.  **AI Column Mapping:** Frontend sends headers to Backend -> Backend LLM suggests mappings -> Frontend updates `columnMapping` state.
3.  **Confirmation:** User confirms mapping -> Frontend formats data into `mappedBatch`.
4.  **Analysis Execution:** User clicks "Start Analysis" -> Frontend calls Backend API (`/api/analyze/batch`) with `mappedBatch` and `modelConfig`.
5.  **Result Rendering:** Backend returns JSON -> Frontend sets `results` state -> React re-renders, passing data to `EmotionRadar`, `BarChart`, and `StatCards`.
6.  **Export:** User clicks "PDF Report" -> `html2pdf.js` targets the `#analysis-report` DOM ID and generates a PDF.

---

## 3. BACKEND DETAILS (Python Target)

The previous version handled LLM calls directly in the browser. For this Python architecture, the backend MUST handle all LLM interactions, data processing, and rate limiting.

### 3.1 Core Backend Functionalities Required

* **LLM Orchestration:** Connect to Google Gemini (primary), OpenAI, and Anthropic APIs using their official Python SDKs or a wrapper like LangChain / LiteLLM.
* **Structured Output Enforcement:** The backend MUST force the LLM to return data matching the exact TypeScript interface expected by the frontend. (Use Pydantic models and Instructor/function calling).
* **Batch Processing Engine:** Handle arrays of 100+ reviews. Implement asynchronous processing (`asyncio`) to analyze multiple reviews concurrently to save time.
* **AI Column Guesser:** An endpoint that takes a list of CSV headers and uses a lightweight LLM prompt to return the best guess for "review text", "brand", etc.
* **Rate Limiting:** Implement IP-based or API-key-based rate limiting (e.g., using `slowapi` or Redis) to prevent abuse.

### 3.2 Required API Endpoints (RESTful)

* **`POST /api/analyze/single`**
    * **Payload:** `{ "text": "...", "config": { "provider": "gemini", "apiKey": "...", "customKeywords": [] } }`
    * **Response:** `AnalysisResult` JSON object.
* **`POST /api/analyze/batch`**
    * **Payload:** `{ "items": [ {"text": "...", "metadata": {...}} ], "config": {...} }`
    * **Response:** Array of `AnalysisResult` objects. *(Note: For large batches, consider implementing Server-Sent Events (SSE) or WebSockets so the frontend can display a live progress bar).*
* **`POST /api/dataset/suggest-columns`**
    * **Payload:** `{ "headers": ["Date", "Review Content", "Stars", "Brand Name"] }`
    * **Response:** `{ "reviewColumn": "Review Content", "brand": "Brand Name", "productName": null, "modelNumber": null }`

### 3.3 Data Schema (Pydantic / TypeScript Interface Match)

The Python backend MUST return data matching this exact structure:

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class EmotionEnum(str, Enum):
    JOY = "JOY"
    ANGER = "ANGER"
    SADNESS = "SADNESS"
    FEAR = "FEAR"
    SURPRISE = "SURPRISE"
    DISGUST = "DISGUST"
    NEUTRAL = "NEUTRAL"

class EmotionScore(BaseModel):
    emotion: EmotionEnum
    score: float = Field(..., ge=0, le=1)

class AnalysisResult(BaseModel):
    id: str
    text: str
    sentiment: float = Field(..., ge=-1, le=1)
    primaryEmotion: EmotionEnum
    emotions: List[EmotionScore]
    tags: List[str]
    summary: str
    confidenceScore: float = Field(..., ge=0, le=1)
    timestamp: int
    metadata: Optional[dict] = None
```

---

## 4. FRONTEND-BACKEND INTEGRATION GUIDE

### 4.1 Connection Mechanism

* **CORS:** The Python backend must have CORS configured to accept requests from the React frontend's development port (usually `http://localhost:3000` or `http://localhost:5173`).
* **API Client:** The frontend will use `fetch` or `axios` to communicate with the Python backend.
* **Security:** If the user provides their own API keys via the frontend UI (`modelConfig.apiKey`), the frontend passes these keys in the request payload or headers to the Python backend. The Python backend uses these keys *in memory* to make the LLM call, ensuring the backend doesn't need to store user keys persistently unless a database is added later.

### 4.2 Error Handling Contract

The Python backend must return standard HTTP status codes that the frontend expects:

* **`401 Unauthorized`:** If the provided API key is invalid.
* **`429 Too Many Requests`:** If the rate limit is hit.
* **`400 Bad Request`:** If the text payload is empty or malformed.
* **`500 Internal Server Error`:** If the LLM fails to process the prompt.

The frontend is already programmed to read these status codes and display specific toast notifications to the user (e.g., "Rate limit exceeded. Please try again later.").

### 4.3 Next Steps for the Python AI Agent

1.  Initialize a FastAPI project.
2.  Implement the Pydantic schemas listed in section 3.3.
3.  Create the `/api/analyze/single` endpoint using the `google-genai` or `google-generativeai` Python SDK. Use `response_schema` to enforce the JSON output.
4.  Create the `/api/dataset/suggest-columns` endpoint.
5.  Implement CORS middleware.
6.  *(Optional but recommended)* Implement WebSockets for `/api/analyze/batch` so the frontend can receive real-time updates as a 500-row CSV is processed row-by-row.