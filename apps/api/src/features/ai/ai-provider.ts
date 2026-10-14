import OpenAI from 'openai';

interface ConfigReader {
  get(key: string): unknown;
}

export interface AiProvider {
  client: OpenAI;
  model: string;
  visionModel: string;
  name: 'Groq' | 'OpenAI';
}

function configuredValue(config: ConfigReader, key: string): string {
  const configured = config?.get(key);
  const value = (typeof configured === 'string' ? configured : '') || process.env[key];
  if (!value?.trim() || /^(sk_placeholder|your[_-]|changeme|replace[_-])/i.test(value.trim())) return '';
  return value.trim();
}

export function createAiProvider(config?: ConfigReader): AiProvider | null {
  const groqKey = configuredValue(config, 'GROQ_API_KEY');
  if (groqKey) {
    return {
      client: new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' }),
      model: configuredValue(config, 'GROQ_MODEL') || 'qwen/qwen3.8-27b',
      visionModel: configuredValue(config, 'GROQ_VISION_MODEL') || 'qwen/qwen3.8-27b',
      name: 'Groq',
    };
  }

  const openAiKey = configuredValue(config, 'OPENAI_API_KEY');
  if (!openAiKey) return null;
  return {
    client: new OpenAI({ apiKey: openAiKey }),
    model: configuredValue(config, 'OPENAI_MODEL') || 'gpt-4o',
    visionModel: configuredValue(config, 'OPENAI_MODEL') || 'gpt-4o',
    name: 'OpenAI',
  };
}

export function createOpenAiImageClient(config?: ConfigReader): OpenAI | null {
  const apiKey = configuredValue(config, 'OPENAI_API_KEY');
  return apiKey ? new OpenAI({ apiKey }) : null;
}

