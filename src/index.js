import express from 'express';
import { urlencoded, json } from 'express';
import { config } from './config.js';
import { generateAgentReply } from './ollamaClient.js';
import { appendLead } from './googleSheets.js';
import Twilio from 'twilio';

const app = express();
app.use(urlencoded({ extended: false }));
app.use(json());

const twilioClient = Twilio(config.twilio.accountSid, config.twilio.authToken);
const callContexts = new Map();

function detectInterest(text) {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return config.allowedKeywords.some((keyword) => normalized.includes(keyword));
}

function buildPrompt({ leadName, company, transcript, history }) {
  const base = `You are an outbound sales agent calling a prospective lead named ${leadName} from ${company}. The user just said: "${transcript}". Respond naturally, politely, and try to identify whether the lead is interested in a marketing automation service. If they are not interested, politely close the call.`;

  const messages = [
    { role: 'system', content: base },
  ];

  if (history && history.length > 0) {
    history.forEach((message) => {
      messages.push(message);
    });
  }

  messages.push({ role: 'user', content: transcript });
  return messages;
}

app.get('/', (req, res) => {
  res.send('AI Voice Agent Automation is running.');
});

app.post('/api/call', async (req, res) => {
  const { phone, leadName, company, notes } = req.body;
  if (!phone || !leadName || !company) {
    return res.status(400).json({ error: 'phone, leadName, and company are required' });
  }

  try {
    const twimlUrl = `${config.webhookBaseUrl}/webhooks/voice?leadName=${encodeURIComponent(leadName)}&company=${encodeURIComponent(company)}&phone=${encodeURIComponent(phone)}&notes=${encodeURIComponent(notes || '')}`;
    const call = await twilioClient.calls.create({
      to: phone,
      from: config.twilio.fromNumber,
      url: twimlUrl,
    });

    callContexts.set(call.sid, {
      leadName,
      company,
      phone,
      notes: notes || '',
      history: [],
      interested: false,
    });

    return res.json({ message: 'Call initiated', callSid: call.sid });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/webhooks/voice', async (req, res) => {
  const callSid = req.body.CallSid;
  const leadName = req.query.leadName || req.body.LeadName || 'there';
  const company = req.query.company || req.body.Company || 'your company';
  const phone = req.query.phone || req.body.Phone || '';
  const notes = req.query.notes || req.body.Notes || '';

  if (!callContexts.has(callSid)) {
    callContexts.set(callSid, { leadName, company, phone, notes, history: [], interested: false });
  }

  const twiml = new Twilio.twiml.VoiceResponse();
  const gather = twiml.gather({
    input: 'speech',
    action: '/webhooks/response',
    method: 'POST',
    timeout: 3,
    speechTimeout: 'auto',
  });

  gather.say({ voice: 'alice' },
    `Hi ${leadName}, this is a quick call from ${company}. I wanted to ask if you are available to discuss lead generation and automated outreach. Can I ask you one quick question?`);
  twiml.say({ voice: 'alice' }, 'I did not hear a response, so I will follow up later. Goodbye.');
  twiml.hangup();

  res.type('text/xml').send(twiml.toString());
});

app.post('/webhooks/response', async (req, res) => {
  const callSid = req.body.CallSid;
  const speechResult = req.body.SpeechResult || '';
  const context = callContexts.get(callSid);

  if (!context) {
    const twiml = new Twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'alice' }, 'I am having trouble tracking this call. Please try again later.');
    twiml.hangup();
    return res.type('text/xml').send(twiml.toString());
  }

  context.history.push({ role: 'user', content: speechResult });

  const isInterested = detectInterest(speechResult);
  let twiml = new Twilio.twiml.VoiceResponse();

  if (isInterested) {
    context.interested = true;
    await appendLead({
      createdAt: new Date().toISOString(),
      leadName: context.leadName,
      company: context.company,
      phone: context.phone,
      status: 'Interested',
      transcript: speechResult,
      notes: context.notes || 'Interested prospect identified during call',
    });

    twiml.say({ voice: 'alice' }, `Great news. Thank you for your time. I will pass your interest to our team and someone will follow up shortly. Goodbye.`);
    twiml.hangup();
    return res.type('text/xml').send(twiml.toString());
  }

  try {
    const messages = buildPrompt({
      leadName: context.leadName,
      company: context.company,
      transcript: speechResult,
      history: context.history,
    });

    const reply = await generateAgentReply(messages, 180);
    context.history.push({ role: 'assistant', content: reply });

    const gather = twiml.gather({
      input: 'speech',
      action: '/webhooks/response',
      method: 'POST',
      timeout: 3,
      speechTimeout: 'auto',
    });
    gather.say({ voice: 'alice' }, reply);
    twiml.say({ voice: 'alice' }, 'Thanks for your time. Goodbye.');
    twiml.hangup();
  } catch (error) {
    twiml.say({ voice: 'alice' }, 'I am sorry, I am having trouble understanding right now. I will follow up later. Goodbye.');
    twiml.hangup();
  }

  res.type('text/xml').send(twiml.toString());
});

app.listen(config.port, () => {
  console.log(`AI voice agent server running on http://localhost:${config.port}`);
});
