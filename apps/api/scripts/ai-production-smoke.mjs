const groqKey = process.env.GROQ_API_KEY?.trim();
const openAiKey = process.env.OPENAI_API_KEY?.trim();
const provider = groqKey ? 'Groq' : openAiKey ? 'OpenAI' : null;
const apiKey = groqKey || openAiKey;
const model = groqKey
  ? process.env.GROQ_MODEL?.trim() || 'qwen/qwen3.8-27b'
  : process.env.OPENAI_MODEL?.trim() || 'gpt-4o';
const endpoint = groqKey
  ? 'https://api.groq.com/openai/v1/chat/completions'
  : 'https://api.openai.com/v1/chat/completions';

if (!apiKey) {
  console.log('NEXUS_AI_SMOKE_RESULT=missing_provider_key');
  process.exit(1);
}

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with OK only.' }],
      max_tokens: 8,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const code = String(body?.error?.code || body?.error?.type || 'provider_error')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 48);
    console.log(`NEXUS_AI_SMOKE_RESULT=failed status=${response.status} code=${code} provider=${provider} model=${model}`);
    process.exit(1);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  console.log(typeof content === 'string' && content.trim()
    ? `NEXUS_AI_SMOKE_RESULT=passed provider=${provider} model=${model}`
    : `NEXUS_AI_SMOKE_RESULT=invalid_response provider=${provider} model=${model}`);
  if (typeof content !== 'string' || !content.trim()) process.exitCode = 1;
} catch (error) {
  const code = String(error?.cause?.code || error?.name || 'unknown')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  console.log(`NEXUS_AI_SMOKE_RESULT=network_error code=${code} provider=${provider} model=${model}`);
  process.exitCode = 1;
}
