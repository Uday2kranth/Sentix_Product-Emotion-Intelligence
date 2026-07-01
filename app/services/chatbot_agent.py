from __future__ import annotations

import re
import urllib.request
import urllib.parse
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

# ============================================================
# SYSTEM PROMPT (Optimized to keep base tokens low)
# ============================================================

SYSTEM_PROMPT = """You are Sentix AI — a product-review and NLP-domain assistant embedded in an Emotion Intelligence dashboard.

═══ MISSION & CAPABILITIES ═══
• Interpret review prediction outcomes (sentiment, emotions, summary, tags).
• Explain emotional signals (Joy, Anger, Sadness, etc.).
• Discuss product specs, pricing, alternatives, and brand reliability.
• Suggest actionable retail solutions (pricing, quality tweaks, keep/cut decisions).
* Refuse entirely unrelated queries (e.g. general programming, politics, sports).

═══ CORE STRATEGIC DIRECTIVES ═══
1. Predict/clarify the specific product category under review.
2. Provide concrete strategic business recommendations (product qa tweaks, pricing, or keep/cut choices).
3. Suggest incentives (e.g., bundle promotions, temporary discounts) for products with negative feedback.
4. Recommend competitor benchmarking to study how similar defects were resolved.

═══ STYLE & IDENTITY ═══
Keep responses concise, clear, and focused. Explain scores (-1.0 to 1.0) intuitively.
On the first response, include this disclaimer:
"⚠️ I am an AI interpreting NLP data and am not a direct representative of the manufacturer."
"""

# ============================================================
# ZERO-API-KEY DUCKDUCKGO WEB SEARCH TOOL
# ============================================================

def web_search(query: str) -> str:
    """Perform a zero-API-key search on DuckDuckGo HTML and extract titles, links, and snippets."""
    try:
        # Format the query and search DuckDuckGo HTML version
        encoded_query = urllib.parse.quote(query)
        url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        )
        # Fetch DDG search page
        with urllib.request.urlopen(req, timeout=6) as response:
            html = response.read().decode("utf-8", errors="ignore")

        # Extract elements using regex matching result classes
        snippets = re.findall(r'<a class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)
        links = re.findall(r'<a class="result__url"[^>]* href="([^"]+)"', html)
        titles = re.findall(r'<a class="result__a"[^>]*>(.*?)</a>', html, re.DOTALL)

        def clean_html(text: str) -> str:
            cleaned = re.sub(r'<[^>]+>', '', text)
            cleaned = (
                cleaned.replace("&amp;", "&")
                .replace("&quot;", '"')
                .replace("&#x27;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
            )
            return cleaned.strip()

        search_results = []
        for i in range(min(4, len(titles), len(snippets))):
            title = clean_html(titles[i])
            snippet = clean_html(snippets[i])
            raw_link = links[i] if i < len(links) else ""
            
            # Resolve DDG redirect URL if present
            if "uddg=" in raw_link:
                try:
                    resolved_link = urllib.parse.unquote(raw_link.split("uddg=")[1].split("&")[0])
                except Exception:
                    resolved_link = raw_link
            else:
                resolved_link = raw_link

            search_results.append(f"[{i+1}] Title: {title}\nURL: {resolved_link}\nSnippet: {snippet}\n")

        if not search_results:
            return "No search results found on the web."

        return "\n".join(search_results)
    except Exception as e:
        return f"Web search failed: {str(e)}"

# ============================================================
# PROVIDER HELPERS & CHATBOT FACTORY
# ============================================================

def _get_openrouter_llm(api_key: str, model: str):
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=model,
        openai_api_key=api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=0.3,
        default_headers={
            "HTTP-Referer": "https://sentix-ai.app",
            "X-Title": "Sentix Product Emotion Intelligence"
        }
    )

def get_llm(provider: str, api_key: str, model: str):
    """Factory: get the right LLM instance based on provider."""
    prov_lower = provider.lower()
    if "openrouter" in prov_lower:
        return _get_openrouter_llm(api_key, model)
    else:
        raise ValueError(f"Provider not supported. Sentix only supports OpenRouter. Received: {provider}")

def build_system_message(review_context: str | None = None) -> SystemMessage:
    content = SYSTEM_PROMPT
    if review_context:
        # Enforce strict token limits to keep context under 350-500 tokens
        # We truncate raw text to 1000 characters
        cleaned_context = review_context[:1000] if len(review_context) > 1000 else review_context
        content += (
            "\n\n=== USER ACTIVE SCREEN & REVIEW CONTEXT ===\n"
            f"{cleaned_context}\n"
            "=== END CONTEXT ===\n\n"
            "Use this context to understand what the user is currently viewing in the interface."
        )
    return SystemMessage(content=content)
