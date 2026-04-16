import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: process.env.PORT || 3000,
  twilio: {
    accountSid: requireEnv('TWILIO_ACCOUNT_SID'),
    authToken: requireEnv('TWILIO_AUTH_TOKEN'),
    fromNumber: requireEnv('TWILIO_PHONE_NUMBER'),
  },
  webhookBaseUrl: requireEnv('WEBHOOK_BASE_URL'),
  google: {
    spreadsheetId: requireEnv('GOOGLE_SHEETS_SPREADSHEET_ID'),
    serviceAccountKeyPath: requireEnv('GOOGLE_SERVICE_ACCOUNT_KEY_PATH'),
  },
  ollama: {
    apiUrl: process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434',
    model: process.env.OLLAMA_MODEL || 'mistral',
    temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.3'),
  },
  allowedKeywords: [
    'interested',
    'yes',
    'sure',
    'yeah',
    'yep',
    'demo',
    'schedule',
    'book',
    'call back',
    'talk',
    'buy',
    'ready',
    'let’s',
    'lets',
    'get started',
    'sign up',
    'request',
  ],
};
