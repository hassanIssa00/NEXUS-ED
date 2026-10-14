import { createAiProvider } from './ai-provider';

describe('createAiProvider', () => {
  const originalGroqKey = process.env.GROQ_API_KEY;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqKey;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  });

  it('prefers Groq and uses configurable text and vision models', () => {
    const values: Record<string, string> = {
      GROQ_API_KEY: 'gsk-test-only',
      OPENAI_API_KEY: 'sk-test-only',
      GROQ_VISION_MODEL: 'qwen/qwen3.8-27b',
    };
    const provider = createAiProvider({ get: (key) => values[key] });

    expect(provider?.name).toBe('Groq');
    expect(provider?.model).toBe('qwen/qwen3.8-27b');
    expect(provider?.visionModel).toBe(values.GROQ_VISION_MODEL);
    expect(provider?.client.baseURL).toBe('https://api.groq.com/openai/v1');
  });

  it('falls back to OpenAI when Groq is not configured', () => {
    const provider = createAiProvider({ get: (key) => key === 'OPENAI_API_KEY' ? 'sk-test-only' : undefined });

    expect(provider?.name).toBe('OpenAI');
    expect(provider?.model).toBe('gpt-4o');
    expect(provider?.visionModel).toBe('gpt-4o');
    expect(provider?.client.baseURL).toContain('api.openai.com');
  });

  it('ignores placeholder credentials and returns no provider', () => {
    const provider = createAiProvider({ get: () => 'sk_placeholder' });
    expect(provider).toBeNull();
  });
});
