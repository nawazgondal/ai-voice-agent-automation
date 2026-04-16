import requests
from config import config


def generate_agent_reply(messages, max_tokens=250):
    endpoint = f"{config['ollama_api_url'].rstrip('/')}/v1/generate"
    payload = {
        "model": config["ollama_model"],
        "prompt": messages,
        "max_tokens": max_tokens,
        "temperature": config["ollama_temperature"],
    }

    response = requests.post(endpoint, json=payload)
    if not response.ok:
        raise RuntimeError(f"Ollama API error {response.status_code}: {response.text}")

    data = response.json()
    if isinstance(data.get("response"), str):
        return data["response"].strip()

    if isinstance(data.get("output"), list):
        return "\n".join(item.get("content", "") for item in data["output"]).strip()

    raise RuntimeError("Unexpected Ollama response format.")
