from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from fastapi.testclient import TestClient

from ai_agent.api.routes import chat
from ai_agent.main import app
from ai_agent.services import chat as chat_service


def test_chat(monkeypatch) -> None:
    monkeypatch.setattr(chat, "answer_question", AsyncMock(return_value="확인해 볼게요."))

    response = TestClient(app).post("/chat", json={"question": "계약서를 확인해줘."})

    assert response.status_code == 200
    assert response.json() == {"answer": "확인해 볼게요."}


def test_chat_agent_uses_deepseek(monkeypatch) -> None:
    model = object()
    agent = object()
    model_factory = Mock(return_value=model)
    agent_factory = Mock(return_value=agent)
    monkeypatch.setattr(
        chat_service,
        "get_settings",
        lambda: SimpleNamespace(chat_model="deepseek-v4-flash", deepseek_api_key="key"),
    )
    monkeypatch.setattr(chat_service, "ChatDeepSeek", model_factory)
    monkeypatch.setattr(chat_service, "create_agent", agent_factory)
    chat_service.get_chat_agent.cache_clear()

    assert chat_service.get_chat_agent() is agent
    model_factory.assert_called_once_with(
        model="deepseek-v4-flash",
        api_key="key",
        extra_body={"thinking": {"type": "disabled"}},
    )
    agent_factory.assert_called_once_with(model, tools=[], system_prompt=chat_service.SYSTEM_PROMPT)
    chat_service.get_chat_agent.cache_clear()
