import fetch from 'node-fetch';
import { config } from './config.js';

export async function generateAgentReply(messages, maxTokens = 250) {
  const endpoint = `${config.ollama.apiUrl}/v1/generate`;
  const body = {
    model: config.ollama.model,
    prompt: messages.map((message) => ({ role: message.role, content: message.content })),
    max_tokens: maxTokens,
    temperature: config.ollama.temperature,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (typeof data.response === 'string') {
    return data.response.trim();
  }

  if (Array.isArray(data.output) && data.output.length > 0) {
    return data.output.map((item) => item.content).join('\n').trim();
  }

  throw new Error('Unexpected Ollama response format.');
}
