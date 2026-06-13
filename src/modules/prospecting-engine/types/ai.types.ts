export type AiProviderId = 'openai' | 'gemini' | 'openrouter' | 'groq' | 'serpapi' | 'apify';

export interface AiProviderConfig {
  id: AiProviderId;
  label: string;
  description: string;
  credentialFields: Array<{
    key: string;
    label: string;
    secret?: boolean;
    required?: boolean;
    placeholder?: string;
  }>;
  defaultModel?: string;
  models: string[];
  category: 'llm' | 'search' | 'automation';
}

export interface AiIntegrationCredentials {
  api_key?: string;
  api_token?: string;
  base_url?: string;
  model?: string;
  organization_id?: string;
  project_id?: string;
  [key: string]: unknown;
}

export interface AiIntegrationStatus {
  provider: AiProviderId;
  label: string;
  configured: boolean;
  encrypted?: boolean;
  updated_at?: string;
  credentials: Record<string, { set: boolean; preview: string }>;
  defaultModel?: string;
  models: string[];
}

export interface AiIntegrationTestResult {
  ok: boolean;
  provider: AiProviderId;
  model?: string;
  latency_ms?: number;
  message: string;
  detail?: unknown;
}
