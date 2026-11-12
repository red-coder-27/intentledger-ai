/**
 * INTENTLEDGER AI — Groq Cloud LLM Client
 * Handles structured JSON model completions with configuration from environment.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  responseFormat?: "json_object" | "text";
  temperature?: number;
  maxTokens?: number;
}

export class GroqClient {
  public static getApiKey(): string | undefined {
    return process.env.GROQ_API_KEY;
  }

  public static getModel(): string {
    return process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  }

  public static isConfigured(): boolean {
    const key = this.getApiKey();
    return !!(key && key.trim().length > 10 && !key.startsWith("mock_"));
  }

  /**
   * Executes a chat completion against the Groq API.
   * Reads GROQ_MODEL from the environment by default.
   */
  public static async createChatCompletion(options: ChatCompletionOptions): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured in environment");
    }

    const model = this.getModel();
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        ...(options.responseFormat === "json_object"
          ? { response_format: { type: "json_object" } }
          : {}),
        temperature: options.temperature ?? 0.2,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq HTTP ${response.status} (${model}): ${errorText}`);
    }

    const json = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response choice returned by Groq API");
    }

    return content;
  }
}

