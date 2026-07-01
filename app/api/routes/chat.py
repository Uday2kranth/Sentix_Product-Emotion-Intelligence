from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.chatbot_agent import get_llm, build_system_message, HumanMessage, AIMessage, web_search
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage

router = APIRouter(prefix="/chat", tags=["chat"])

# In-memory session history
chat_histories: dict[str, list[HumanMessage | AIMessage]] = {}

class ChatRequest(BaseModel):
    session_id: str = Field(..., serialization_alias="session_id", validation_alias="session_id")
    message: str
    provider: str
    model: str
    api_key: str
    review_context: str | None = None

    class Config:
        populate_by_name = True

@tool
def search_web(query: str) -> str:
    """Search the web for up-to-date competitor benchmarking, product specifications, alternative choices, brand reliability, or retail market context."""
    return web_search(query)

@router.get("/keys-status")
async def get_keys_status() -> dict:
    import os
    return {
        "OpenRouter": bool(os.environ.get("OPENROUTER_API_KEY"))
    }

@router.post("", response_model=dict)
async def chat(request: ChatRequest) -> dict:
    # Validate API key for cloud providers
    if "openrouter" not in request.provider.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only OpenRouter provider is supported. Received: {request.provider}"
        )

    api_key = request.api_key
    if not api_key or not api_key.strip() or api_key == "dummy":
        import os
        api_key = os.environ.get("OPENROUTER_API_KEY")

    if not api_key or not api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key is required for OpenRouter. Please configure it in settings (gear icon) or set the environment variable on the server."
        )

    try:
        # 1. Instantiate the LLM using the factory
        llm = get_llm(request.provider, api_key, request.model)

        # Bind web search tool to model
        tools = [search_web]
        llm_with_tools = llm.bind_tools(tools)

        # 2. Retrieve session history
        history = chat_histories.get(request.session_id, [])

        # 3. Build the system message (with review context injected if provided)
        system_msg = build_system_message(request.review_context)

        # 4. Construct message flow: System prompt + History + New Message
        messages = [system_msg] + history + [HumanMessage(content=request.message)]

        # 5. Run the model with tools enabled
        response = await llm_with_tools.ainvoke(messages)

        # 6. Check for tool calls and execute search if request matches
        if response.tool_calls:
            tool_msg_list = []
            for tool_call in response.tool_calls:
                if tool_call["name"] == "search_web":
                    q = tool_call["args"].get("query")
                    print(f"[Sentix Copilot] Executing zero-API-key search for: '{q}'")
                    result_str = web_search(q)
                    
                    tool_msg = ToolMessage(content=result_str, tool_call_id=tool_call["id"])
                    tool_msg_list.append(tool_msg)
            
            if tool_msg_list:
                messages.append(response)  # Append AI tool call request message
                messages.extend(tool_msg_list)  # Append Tool response messages
                response = await llm.ainvoke(messages)  # Call LLM to synthesize final response

        # 7. Extract response content
        output_text = str(response.content)

        # 8. Append the conversation exchange to memory
        history.append(HumanMessage(content=request.message))
        history.append(AIMessage(content=output_text))
        chat_histories[request.session_id] = history

        return {"response": output_text}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{session_id}")
async def clear_chat(session_id: str) -> dict:
    if session_id in chat_histories:
        del chat_histories[session_id]
    return {"status": "cleared"}
