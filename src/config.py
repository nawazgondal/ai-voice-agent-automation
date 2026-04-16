from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

ROOT = Path(__file__).resolve().parent


def require_env(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def require_env_path(name):
    value = require_env(name)
    path = Path(value)
    return str(path if path.is_absolute() else ROOT.joinpath(path).resolve())

config = {
    "port": int(os.getenv("PORT", "3000")),
    "twilio_account_sid": require_env("TWILIO_ACCOUNT_SID"),
    "twilio_auth_token": require_env("TWILIO_AUTH_TOKEN"),
    "twilio_from_number": require_env("TWILIO_PHONE_NUMBER"),
    "webhook_base_url": require_env("WEBHOOK_BASE_URL").rstrip('/'),
    "google_spreadsheet_id": require_env("GOOGLE_SHEETS_SPREADSHEET_ID"),
    "google_service_account_key_path": require_env_path("GOOGLE_SERVICE_ACCOUNT_KEY_PATH"),
    "ollama_api_url": os.getenv("OLLAMA_API_URL", "http://127.0.0.1:11434"),
    "ollama_model": os.getenv("OLLAMA_MODEL", "mistral"),
    "ollama_temperature": float(os.getenv("OLLAMA_TEMPERATURE", "0.3")),
    "allowed_keywords": [
        "interested",
        "yes",
        "sure",
        "yeah",
        "yep",
        "demo",
        "schedule",
        "book",
        "call back",
        "talk",
        "buy",
        "ready",
        "let's",
        "lets",
        "get started",
        "sign up",
        "request",
    ],
}
