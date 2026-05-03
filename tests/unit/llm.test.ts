import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isLlmConfigured } from '@/lib/llm';

const ORIGINAL_ENV = { ...process.env };

describe('llm', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('isLlmConfigured returns false without any API key', () => {
    expect(isLlmConfigured()).toBe(false);
  });

  it('isLlmConfigured returns true when OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(isLlmConfigured()).toBe(true);
  });

  it('isLlmConfigured returns true when ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    expect(isLlmConfigured()).toBe(true);
  });
});
