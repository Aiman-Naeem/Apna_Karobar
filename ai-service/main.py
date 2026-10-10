from datetime import datetime, timezone
import logging
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from groq import APIConnectionError, APIStatusError, APITimeoutError, Groq
from pydantic import BaseModel, ConfigDict, Field


ENV_FILE = Path(__file__).resolve().with_name(".env")
load_dotenv(ENV_FILE)

app = FastAPI(title="Apna Karobar AI Service")
logger = logging.getLogger(__name__)


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class Payment(ContractModel):
    month: int = Field(ge=1)
    amount: float = Field(ge=0, allow_inf_nan=False)
    status: Literal["pending", "paid", "late"]
    dueDate: str
    paidDate: str | None = None


class TrustScoreRequest(ContractModel):
    userId: str = Field(min_length=1)
    paymentHistory: list[Payment]


class TrustScoreResponse(BaseModel):
    trustScore: float = Field(ge=0, le=100)


class ChatMessage(ContractModel):
    role: Literal["user", "assistant"]
    message: str = Field(min_length=1)


class ChatbotRequest(ContractModel):
    userId: str = Field(min_length=1)
    message: str = Field(min_length=1)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class ChatbotResponse(BaseModel):
    reply: str = Field(min_length=1)


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def _payment_points(payment: Payment) -> int:
    if payment.status == "pending":
        return 50
    if payment.status == "late":
        return 25

    due_date = _parse_iso_datetime(payment.dueDate)
    paid_date = _parse_iso_datetime(payment.paidDate)
    if due_date is None or paid_date is None:
        return 50
    return 100 if paid_date <= due_date else 25


@app.post("/trust-score", response_model=TrustScoreResponse)
def trust_score(request: TrustScoreRequest) -> TrustScoreResponse:
    # Score each payment as on-time=100, late=25, pending/undated=50; average them.
    # An empty history starts at 50, keeping the deterministic score neutral.
    if not request.paymentHistory:
        return TrustScoreResponse(trustScore=50)
    average = sum(_payment_points(item) for item in request.paymentHistory) / len(
        request.paymentHistory
    )
    return TrustScoreResponse(trustScore=round(average, 2))


CHATBOT_SYSTEM_PROMPT = """You are Apna Karobar's practical business advisor.
Help women entrepreneurs in Pakistan, including people running businesses from home.
Give simple, actionable advice about product pricing, basic profit calculations,
low-budget marketing, customer management, and home-based businesses.
Reply in Urdu when the user's message is in Urdu, and in English when it is in
English. Use simple language and clear steps. Explain calculations plainly.
Do not claim to have current local market data unless the user provides it."""


def generate_groq_reply(message: str, history: list[ChatMessage]) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL")
    if not api_key or not model:
        missing = [
            name
            for name, value in (("GROQ_API_KEY", api_key), ("GROQ_MODEL", model))
            if not value
        ]
        logger.error(
            "Groq chatbot unavailable category=configuration_missing "
            "missing=%s http_status=503",
            ",".join(missing),
        )
        raise HTTPException(
            status_code=503,
            detail="Chatbot service is not configured.",
        )

    recent_history = history[-20:]
    if (
        recent_history
        and recent_history[-1].role == "user"
        and recent_history[-1].message.strip() == message.strip()
    ):
        recent_history = recent_history[:-1]

    messages = [{"role": "system", "content": CHATBOT_SYSTEM_PROMPT}]
    messages.extend(
        {"role": item.role, "content": item.message[:2000]}
        for item in recent_history
    )
    messages.append({"role": "user", "content": message[:4000]})

    try:
        client = Groq(api_key=api_key, timeout=12.0, max_retries=0)
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.4,
            max_tokens=700,
        )
        choices = getattr(completion, "choices", None)
        reply = choices[0].message.content if choices else None
        if not isinstance(reply, str) or not reply.strip():
            raise HTTPException(
                status_code=502,
                detail="Chatbot provider returned an empty response.",
            )
        return reply.strip()
    except HTTPException:
        raise
    except Exception as error:
        status = getattr(error, "status_code", None)
        if isinstance(error, APITimeoutError):
            category = "timeout"
        elif isinstance(error, APIConnectionError):
            category = "connection_error"
        elif status == 401:
            category = "authentication_error"
        elif status == 403:
            category = "permission_error"
        elif status == 404:
            category = "model_or_endpoint_not_found"
        elif status == 400:
            category = "invalid_request_or_model_parameters"
        elif status == 429:
            category = "rate_limit"
        elif isinstance(error, APIStatusError):
            category = "provider_http_error"
        else:
            category = "provider_error"

        logger.warning(
            "Groq chatbot failed category=%s http_status=%s exception_type=%s",
            category,
            status,
            type(error).__name__,
        )
        raise HTTPException(
            status_code=502,
            detail="Chatbot provider is temporarily unavailable.",
        ) from None


@app.post("/chatbot", response_model=ChatbotResponse)
def chatbot(request: ChatbotRequest) -> ChatbotResponse:
    return ChatbotResponse(
        reply=generate_groq_reply(request.message, request.history)
    )


# These illustrative values are static samples, not live or independently verified market data.
SAMPLE_INSIGHTS = {
    "tailoring": {
        "averagePrice": {"min": 800, "max": 3500, "typical": 1500},
        "demandTrend": "rising",
        "topSellingItems": ["stitched kurta", "alterations", "embroidery work"],
        "note": "Sample data only. Custom stitching demand may rise before Eid.",
    },
    "food": {
        "averagePrice": {"min": 250, "max": 2500, "typical": 800},
        "demandTrend": "stable",
        "topSellingItems": ["lunch boxes", "snacks", "homemade desserts"],
        "note": "Sample data only. Prices vary by portion size and ingredients.",
    },
    "crafts": {
        "averagePrice": {"min": 300, "max": 5000, "typical": 1200},
        "demandTrend": "seasonal",
        "topSellingItems": ["embroidered accessories", "gift items", "home decor"],
        "note": "Sample data only. Demand may vary around holidays and local events.",
    },
    "tutoring": {
        "averagePrice": {"min": 500, "max": 3000, "typical": 1200},
        "demandTrend": "rising",
        "topSellingItems": ["primary tuition", "English lessons", "exam preparation"],
        "note": "Sample data only. Rates depend on subject, level, and lesson format.",
    },
    "other": {
        "averagePrice": {"min": 300, "max": 4000, "typical": 1200},
        "demandTrend": "stable",
        "topSellingItems": ["custom services", "repairs", "made-to-order items"],
        "note": "Sample data only. This broad category combines different businesses.",
    },
}


@app.get("/market-insights")
def market_insights(
    category: str = Query(min_length=1), region: str | None = Query(default=None)
) -> dict:
    normalized_category = category.strip().lower()
    sample = SAMPLE_INSIGHTS.get(normalized_category)
    if sample is None:
        raise HTTPException(
            status_code=503,
            detail=f"Sample market insights are unavailable for category '{normalized_category}'.",
        )

    return {
        "category": normalized_category,
        "region": region.strip() if region and region.strip() else "Pakistan",
        **sample,
    }