# ai-voice-agent-automation

## Overview

This project implements an outbound AI voice agent using Python.
It places calls with Twilio, uses local Ollama Mistral for natural replies, detects interested leads, and logs qualified prospects to Google Sheets.

## What is included

- `src/app.py` - Flask API and Twilio webhook endpoints
- `src/config.py` - environment and config loader
- `src/ollama_client.py` - local Ollama integration
- `src/google_sheets.py` - Google Sheets append helper
- `requirements.txt` - Python dependencies
- `.env.example` - environment template
- `frontend/` - optional Angular front end for lead submission

## Prerequisites

- Python 3.11+ installed
- A Twilio account with a voice-enabled phone number
- A Google Cloud service account key JSON file
- A Google Sheet shared with the service account email
- Ollama running locally with the `mistral` model
- (Optional) Angular CLI if you want to run the front-end app

## Setup

1. Create and activate a Python environment:

```bash
python -m venv .venv
.venv\Scripts\activate
```

2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

3. Copy the example env file:

```bash
copy .env.example .env
```

4. Create the Google service account key JSON file and point `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` to it.

5. Fill in your `.env` values:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `WEBHOOK_BASE_URL`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`
- `OLLAMA_API_URL` (default `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (default `mistral`)
- `OLLAMA_TEMPERATURE` (default `0.3`)

6. Start the server:

```bash
python src\app.py
```

## Expose local server

Twilio needs a public webhook endpoint. Use ngrok or a similar tunnel:

```bash
ngrok http 3000
```

Then set `WEBHOOK_BASE_URL` to the ngrok URL, for example `https://abcd1234.ngrok.io`.

## Start a call

Send a POST to `/api/call` with lead details.

Example:

```bash
curl -X POST http://localhost:3000/api/call \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15551234567","leadName":"Alice","company":"Acme","notes":"E-commerce lead"}'
```

## How it works

- `POST /api/call` starts a Twilio outbound call.
- `/webhooks/voice` returns TwiML to ask the lead the first question.
- `/webhooks/response` receives Twilio speech transcription and uses Ollama to generate the next reply.
- If an interested answer is detected, the lead is appended to Google Sheets.

## Optional Angular front end

A lightweight Angular app is available in `frontend/` for submitting call targets from a browser.

## Notes

- This is a starter implementation.
- For production, add persistent call state storage, Twilio request validation, improved speech error handling, and stronger qualification logic.
# AI Voice Agent Frontend

This is an optional Angular front end for submitting outbound call requests to the Python backend.

## Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the frontend:

```bash
npm start
```

3. Open `http://localhost:4200`.

## Notes

- The app sends POST requests to `http://localhost:3000/api/call` by default.
- Update `src/environments/environment.ts` if your backend is running on a different host or port.
