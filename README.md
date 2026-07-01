---
title: Sentix Product Emotion Intelligence
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# Sentix - Product Emotion Intelligence Platform

Sentix is a sophisticated, cyberpunk/lab-themed web application designed for deep emotional and sentiment analysis of product reviews. It supports single-text analysis, bulk dataset processing (CSV/JSON/Excel), AI-powered column mapping, data visualization, and an integrated contextual GenAI chatbot.

---

## 1. How NLP Results Connect to the GenAI Chatbot

The platform seamlessly bridges the quantitative NLP outputs (charts, metrics, emotion breakdowns) with the qualitative chatbot assistant.

### Context Injection Workflow:
1. **NLP Processing**: When a product review is analyzed (either singly or via batch processing), the system computes sentiment scores, primary emotions, emotion breakdowns, custom keyword flags, tags, and a summary.
2. **Context Formatting**: The frontend formats the active review result into a structured **Review Report Context** string:
   ```text
   Selected Review ID: row-1
   Review Text: "The battery life is amazing, but the screen is a bit dim."
   Primary Emotion Detected: JOY
   Sentiment Score: 0.35 (Confidence: 85%)
   Tags: battery, screen, battery life, dim
   Summary: Positive review with a joy signal, centered on battery, screen.
   ```
3. **API Dispatch**: When the user opens the chatbot drawer and sends a message, the frontend includes this `review_context` along with the `session_id`, provider, model, and API key.
4. **System Prompt Injection**:
   - The FastAPI backend receives the request.
   - It instantiates the LangChain LLM using the `get_llm(provider, api_key, model)` factory.
   - It appends the `review_context` directly into the chatbot's **System Prompt**:
     ```text
     You are Sentix AI...
     === REVIEW REPORT CONTEXT (from the NLP model) ===
     [Review details here]
     === END CONTEXT ===
     Use this context to explain the review analysis results to the user.
     ```
5. **Contextual & Guardrailed Reasoning**: The AI is strictly guardrailed to refuse queries outside of e-commerce, product reviews, or retail. However, because of the injected context, the chatbot knows exactly which product, brand, and review findings are being discussed. It can answer general domain-relevant questions (e.g., "What are alternatives to this product?", "Is this brand reliable?", "Why did it detect Sadness?") while refusing unrelated topics (medical, political, etc.).

---

## Repository Directory Structure

```text
├── app/                                        # FastAPI Backend Source Code
│   ├── api/                                    # Route definitions
│   ├── core/                                   # App configuration & settings
│   ├── models/                                 # Pydantic and data models
│   ├── resources/                              # Saved ML models (.joblib)
│   └── services/                               # NLP classifiers & chatbot services
├── frontend/                                   # React + TypeScript + Vite Frontend
├── Rogramming for eda and data cleaning/       # Academic R programming deliverables
│   ├── academic_pipeline.R                     # Standalone R script: cleaning, stats, tests, and ML
│   └── README.md                               # Guide to running the R pipeline locally without RStudio
├── app_fastapi.py                              # Backend startup script (for local/PM2 run)
├── requirements.txt                            # Python dependencies list
└── run_project.py                              # Unified runner script
```

---

## 2. Setup & Installation

### Prerequisites
* **Python** 3.10 or higher
* **Node.js & npm** (LTS version)
* **uv** (Recommended Python package manager)

---

## 3. Running the Services

### 3.1 Backend Setup (FastAPI)
The backend runs on port `8000` from the root directory.

1. Create and configure a virtual environment:
   ```bash
   # Using uv (Recommended)
   uv venv --python 3.10 --clear
   uv pip install -r requirements.txt

   # Using standard python
   python -m venv .venv
   source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
2. Run the backend development server:
   ```bash
   # Using uv / virtualenv Python
   .\.venv\Scripts\python app_fastapi.py
   ```

Verify the backend health check by visiting: [http://127.0.0.1:8000/healthz](http://127.0.0.1:8000/healthz)

### 3.2 Frontend Setup (React + Vite)
The frontend runs on port `5173`.

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

Open the application at: [http://localhost:5173/](http://localhost:5173/)

---

## 4. Running Services in the Background (PM2)

For continuous, persistent background execution without keeping terminal windows open, use **PM2** (Process Manager 2).

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. **Start Backend with PM2**:
   From the root folder, run:
   ```bash
   pm2 start ".\.venv\Scripts\python.exe app_fastapi.py" --name "sentix-backend"
   ```

3. **Start Frontend with PM2**:
   Navigate to the `frontend` directory and run:
   * **For Production Build (Recommended)**:
     ```bash
     npm run build
     pm2 start "npm run preview" --name "sentix-frontend"
     ```
   * **For Development Server**:
     ```bash
     pm2 start "npm run dev" --name "sentix-frontend"
     ```

4. **Monitor and Manage**:
   * View running services: `pm2 status`
   * Check live log streams: `pm2 logs`
   * Restart a service: `pm2 restart [name]`
   * Stop a service: `pm2 stop [name]`
   * Save running configurations for automatic machine restarts: `pm2 save`

---

## 5. Production Deployment Guide

### Backend Deployment (Render / Koyeb)

The Python backend can be deployed as a Web Service:

1. **Root Directory**: `.` (leave as repository root)
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables**:
   * `GOOGLE_API_KEY`: *(Optional)* Your Google Gemini API Key for chatbot fallback.
   * `OPENROUTER_API_KEY`: *(Optional)* Your OpenRouter API Key for chatbot fallback.
   * `PYTHONPATH`: `.` (Crucial — ensures Python finds the `app` module files)

### Frontend Deployment (Vercel)

The React frontend can be hosted as a static site:

1. **Build Settings**:
   * **Root Directory**: `frontend`
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
2. **Environment Variables**:
   * `VITE_API_URL`: Your backend URL with the `/api` prefix (e.g. `https://sentix-backend.onrender.com/api`).
   
> [!IMPORTANT]
> The `/api` suffix is mandatory. Make sure to redeploy the Vercel project after adding this environment variable.

---

## 6. R Data Analysis Pipeline (Academic Deliverable)

An academic R programming pipeline is provided in the `Rogramming for eda and data cleaning/` directory. It implements 5+ advanced analysis techniques:
1. **Descriptive Statistics**: Custom functions using raw moment equations (for skewness and excess kurtosis).
2. **Chi-Square Test**: Association between review style (`Opinion_Type` - Comparative vs Non-Comparative) and `Sentiment`.
3. **Welch's Independent t-test**: Compare mean polarity score across review styles.
4. **One-Way ANOVA with Post-Hoc Tukey HSD**: Compare review lengths across sentiment classes.
5. **Supervised ML Classification**: Logistic Regression model (`glm`) predicting positive reviews based on rating, age, helpfulness, and polarity.

> [!TIP]
> Refer to the R folder's [README.md](file:///d:/sem3/excel/numpy/Sentix_Product%20Emotion%20Intelligence/Rogramming%20for%20eda%20and%20data%20cleaning/README.md) for detailed instructions on running the R pipeline without RStudio from CMD, PowerShell, or VS Code.

---

## 7. Advanced Python EDA Visualizations

The platform has been enhanced with server-side Python data visualization generators integrated directly into the batch stats workflow.

### Key Visualization Features:
* **Feature Distributions**: Histogram grid showing the distribution of rating stars and sentiment polarity scores.
* **Correlation Heatmap**: Visual matrix showing Pearson correlation coefficients between key numeric attributes (`Rating`, `True Polarity`, `Day Diff`, `Helpful Yes`, `Pred Sentiment`).
* **ML Confusion Matrix**: Confusion matrix comparing true sentiment labels vs predicted sentiment classifications.

These charts are generated dynamically via Matplotlib in the FastAPI backend, returned as Base64-encoded PNG strings, and rendered in the dashboard.

