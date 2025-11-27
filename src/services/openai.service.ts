import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getEmbedding(text: string): Promise<number[]> {
  const resp = await client.embeddings.create({
    model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
    input: text,
  });

  return resp.data[0].embedding as unknown as number[];
}

export async function answerWithContext(question: string, context: string) {
  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_RAG_MODEL ?? 'gpt-4.1-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Use the provided context to answer',
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    max_completion_tokens: 1000,
    frequency_penalty: 0,
  });

  return resp.choices?.[0]?.message?.content ?? '';
}
