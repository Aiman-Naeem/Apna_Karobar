from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import main


client = TestClient(main.app)


def configure_mock_groq(monkeypatch, content):
    captured = {}

    def create_completion(**kwargs):
        captured.update(kwargs)
        message = SimpleNamespace(content=content)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    mock_client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(create=create_completion)
        )
    )

    def create_client(**kwargs):
        captured["client_options"] = kwargs
        return mock_client

    monkeypatch.setattr(main, "Groq", create_client)
    monkeypatch.setenv("GROQ_API_KEY", "mock-key")
    monkeypatch.setenv("GROQ_MODEL", "mock-model")
    return captured


def test_chatbot_replies_in_urdu_when_model_returns_urdu(monkeypatch):
    expected_reply = "اپنی قیمت میں لاگت اور منافع شامل کریں۔"
    captured = configure_mock_groq(monkeypatch, expected_reply)

    response = client.post(
        "/chatbot",
        json={"userId": "user-1", "message": "میں قیمت کیسے طے کروں؟", "history": []},
    )

    assert response.status_code == 200
    assert response.json() == {"reply": expected_reply}
    system_prompt = captured["messages"][0]["content"]
    assert "Urdu" in system_prompt
    assert captured["client_options"]["timeout"] == 12.0
    assert captured["client_options"]["max_retries"] == 0


def test_chatbot_replies_in_english_when_model_returns_english(monkeypatch):
    expected_reply = "Add your material and labor costs, then include a profit margin."
    configure_mock_groq(monkeypatch, expected_reply)

    response = client.post(
        "/chatbot",
        json={"userId": "user-1", "message": "How should I price this?", "history": []},
    )

    assert response.status_code == 200
    assert response.json() == {"reply": expected_reply}


def test_chatbot_sends_conversation_history_in_chronological_order(monkeypatch):
    captured = configure_mock_groq(monkeypatch, "Consider your costs first.")
    history = [
        {"role": "user", "message": "I sell embroidered bags."},
        {"role": "assistant", "message": "What does each bag cost to make?"},
        {"role": "user", "message": "Materials cost 500 rupees."},
    ]

    response = client.post(
        "/chatbot",
        json={
            "userId": "user-1",
            "message": "What price should I charge?",
            "history": history,
        },
    )

    assert response.status_code == 200
    assert captured["messages"][1:] == [
        {"role": "user", "content": "I sell embroidered bags."},
        {"role": "assistant", "content": "What does each bag cost to make?"},
        {"role": "user", "content": "Materials cost 500 rupees."},
        {"role": "user", "content": "What price should I charge?"},
    ]


def test_chatbot_does_not_duplicate_current_message_from_history(monkeypatch):
    captured = configure_mock_groq(monkeypatch, "Start by calculating all costs.")

    response = client.post(
        "/chatbot",
        json={
            "userId": "user-1",
            "message": "How do I calculate my costs?",
            "history": [
                {"role": "user", "message": "Hello"},
                {"role": "assistant", "message": "How can I help?"},
                {"role": "user", "message": " How do I calculate my costs? "},
            ],
        },
    )

    sent_messages = captured["messages"][1:]
    assert response.status_code == 200
    assert sent_messages == [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "How can I help?"},
        {"role": "user", "content": "How do I calculate my costs?"},
    ]


@pytest.mark.parametrize("missing_variable", ["GROQ_API_KEY", "GROQ_MODEL"])
def test_chatbot_returns_service_error_when_configuration_is_missing(
    monkeypatch, missing_variable
):
    monkeypatch.setenv("GROQ_API_KEY", "mock-key")
    monkeypatch.setenv("GROQ_MODEL", "mock-model")
    monkeypatch.delenv(missing_variable)
    monkeypatch.setattr(
        main,
        "Groq",
        lambda **kwargs: pytest.fail("Groq must not be called without configuration"),
    )

    response = client.post(
        "/chatbot",
        json={"userId": "user-1", "message": "Help with pricing", "history": []},
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Chatbot service is not configured."}


def test_chatbot_returns_generic_error_on_provider_failure(monkeypatch):
    captured = configure_mock_groq(monkeypatch, None)

    def fail_provider(**kwargs):
        raise RuntimeError("private provider detail")

    captured_client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=fail_provider))
    )
    monkeypatch.setattr(main, "Groq", lambda **kwargs: captured_client)

    response = client.post(
        "/chatbot",
        json={"userId": "user-1", "message": "Help with pricing", "history": []},
    )

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Chatbot provider is temporarily unavailable."
    }
    assert "private provider detail" not in response.text


def test_chatbot_logs_provider_status_without_sensitive_details(monkeypatch, caplog):
    configure_mock_groq(monkeypatch, None)

    class MockNotFoundError(Exception):
        status_code = 404

    def fail_provider(**kwargs):
        raise MockNotFoundError("private response body and mock-key")

    mock_client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=fail_provider))
    )
    monkeypatch.setattr(main, "Groq", lambda **kwargs: mock_client)

    response = client.post(
        "/chatbot",
        json={"userId": "user-1", "message": "Help with pricing", "history": []},
    )

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Chatbot provider is temporarily unavailable."
    }
    assert "category=model_or_endpoint_not_found" in caplog.text
    assert "http_status=404" in caplog.text
    assert "private response body" not in caplog.text
    assert "mock-key" not in caplog.text


@pytest.mark.parametrize("content", [None, "", "   "])
def test_chatbot_returns_service_error_for_empty_model_response(monkeypatch, content):
    configure_mock_groq(monkeypatch, content)

    response = client.post(
        "/chatbot",
        json={"userId": "user-1", "message": "Help with pricing", "history": []},
    )

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Chatbot provider returned an empty response."
    }


def test_trust_score_and_market_insights_routes_are_unchanged():
    trust_response = client.post(
        "/trust-score", json={"userId": "user-1", "paymentHistory": []}
    )
    market_response = client.get("/market-insights?category=tailoring")

    assert trust_response.status_code == 200
    assert trust_response.json() == {"trustScore": 50}
    assert market_response.status_code == 200
    assert market_response.json()["note"].startswith("Sample data only.")


def test_dotenv_path_is_next_to_service_module():
    assert main.ENV_FILE == main.Path(main.__file__).resolve().with_name(".env")