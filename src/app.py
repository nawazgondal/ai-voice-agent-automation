from urllib.parse import urlencode
from flask import Flask, request, jsonify
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from config import config
from ollama_client import generate_agent_reply
from google_sheets import append_lead

app = Flask(__name__)
client = Client(config["twilio_account_sid"], config["twilio_auth_token"])
call_contexts = {}


def detect_interest(text):
    if not text:
        return False
    text = text.lower()
    return any(keyword in text for keyword in config["allowed_keywords"])


def build_prompt(lead_name, company, transcript, history):
    base = (
        f"You are an outbound sales agent calling a prospective lead named {lead_name} "
        f"from {company}. The prospect just said: \"{transcript}\". "
        "Respond naturally, politely, and try to qualify whether the lead is interested in a marketing automation service. "
        "If they are not interested, politely suggest closing the call."
    )
    messages = [{"role": "system", "content": base}]
    messages.extend(history or [])
    messages.append({"role": "user", "content": transcript})
    return messages


@app.route("/", methods=["GET"])
def index():
    return "AI Voice Agent Automation (Python) is running."


@app.route("/api/call", methods=["POST"])
def api_call():
    data = request.get_json(force=True, silent=True) or {}
    phone = data.get("phone")
    lead_name = data.get("leadName")
    company = data.get("company")
    notes = data.get("notes", "")

    if not phone or not lead_name or not company:
        return jsonify({"error": "phone, leadName, and company are required"}), 400

    try:
        params = urlencode({
            "leadName": lead_name,
            "company": company,
            "phone": phone,
            "notes": notes,
        })
        webhook_url = f"{config['webhook_base_url']}/webhooks/voice?{params}"
        call = client.calls.create(
            to=phone,
            from_=config["twilio_from_number"],
            url=webhook_url,
        )

        call_contexts[call.sid] = {
            "lead_name": lead_name,
            "company": company,
            "phone": phone,
            "notes": notes,
            "history": [],
            "interested": False,
        }

        return jsonify({"message": "Call initiated", "callSid": call.sid})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/webhooks/voice", methods=["POST"])
def webhook_voice():
    lead_name = request.args.get("leadName", "there")
    company = request.args.get("company", "your company")
    phone = request.args.get("phone", "")
    notes = request.args.get("notes", "")

    params = urlencode({
        "leadName": lead_name,
        "company": company,
        "phone": phone,
        "notes": notes,
    })
    action_url = f"{config['webhook_base_url']}/webhooks/response?{params}"

    response = VoiceResponse()
    gather = response.gather(
        input="speech",
        action=action_url,
        method="POST",
        timeout=3,
        speech_timeout="auto",
    )
    gather.say(
        f"Hi {lead_name}, this is a quick call from {company}. "
        "I wanted to ask if you are available to discuss lead generation and automated outreach. "
        "Can I ask you one quick question?",
        voice="alice",
    )
    response.say("I did not hear a response, so I will follow up later. Goodbye.", voice="alice")
    response.hangup()

    return str(response), 200, {"Content-Type": "application/xml"}


@app.route("/webhooks/response", methods=["POST"])
def webhook_response():
    call_sid = request.form.get("CallSid")
    speech_result = request.form.get("SpeechResult", "")
    lead_name = request.args.get("leadName", "there")
    company = request.args.get("company", "your company")
    phone = request.args.get("phone", "")
    notes = request.args.get("notes", "")

    context = call_contexts.get(call_sid)
    if context is None:
        context = {
            "lead_name": lead_name,
            "company": company,
            "phone": phone,
            "notes": notes,
            "history": [],
            "interested": False,
        }
        call_contexts[call_sid] = context

    context["history"].append({"role": "user", "content": speech_result})

    response = VoiceResponse()
    if detect_interest(speech_result):
        context["interested"] = True
        append_lead({
            "created_at": __import__("datetime").datetime.utcnow().isoformat(),
            "lead_name": context["lead_name"],
            "company": context["company"],
            "phone": context["phone"],
            "status": "Interested",
            "transcript": speech_result,
            "notes": context["notes"] or "Interested prospect identified during call",
        })
        response.say(
            "Great news. Thank you for your time. I will pass your interest to our team and someone will follow up shortly. Goodbye.",
            voice="alice",
        )
        response.hangup()
        return str(response), 200, {"Content-Type": "application/xml"}

    if not speech_result:
        response.say("I did not hear your answer. Goodbye.", voice="alice")
        response.hangup()
        return str(response), 200, {"Content-Type": "application/xml"}

    try:
        prompt = build_prompt(
            context["lead_name"],
            context["company"],
            speech_result,
            context["history"],
        )
        reply = generate_agent_reply(prompt, max_tokens=180)
        context["history"].append({"role": "assistant", "content": reply})

        gather = response.gather(
            input="speech",
            action=request.url,
            method="POST",
            timeout=3,
            speech_timeout="auto",
        )
        gather.say(reply, voice="alice")
        response.say("Thanks for your time. Goodbye.", voice="alice")
    except Exception:
        response.say(
            "I am sorry, I am having trouble understanding right now. I will follow up later. Goodbye.",
            voice="alice",
        )
        response.hangup()

    return str(response), 200, {"Content-Type": "application/xml"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config["port"])
