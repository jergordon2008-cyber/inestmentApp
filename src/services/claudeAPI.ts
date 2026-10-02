/**
 * Claude API Client
 * 
 * Calls our backend proxy (Firebase Cloud Function) which in turn calls
 * Anthropic's Claude API. We never expose the Claude API key to the mobile
 * app — it would let users abuse it.
 * 
 * Architecture:
 *   App → Firebase Cloud Function → Anthropic Claude API
 *                                ↓
 *                        Firestore cache
 * 
 * The backend caches responses by (term, tier) tuple so popular terms
 * cost the same to serve as one user — Claude is called once per unique
 * (term, tier), then cached for 30 days.
 * 
 * Cost math:
 * - Claude Haiku: ~$0.001 per explanation call
 * - With caching, we expect ~5% cache miss rate after first 1000 users
 * - At 10k MAU, ~100k explanation requests/month, 5k cache misses
 * - Expected Claude bill: $5-10/month at that scale
 */

import { Tier } from '../types';

// Backend proxy (set when publishing to production)
const CLAUDE_PROXY_URL = process.env.EXPO_PUBLIC_CLAUDE_PROXY_URL ?? '';

// Direct key for dev/personal use (never commit the .env file)
const ANTHROPIC_KEY   = process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '';
const ANTHROPIC_URL   = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-opus-4-5';

// ── Low-level helper: direct Anthropic call ───────────────────────────────────
async function callAnthropicDirect(
  system: string,
  userMessage: string,
  maxTokens = 512,
): Promise<string> {
  if (!ANTHROPIC_KEY || ANTHROPIC_KEY.startsWith('sk-ant-api03-REPLACE')) {
    return ''; // key not configured — callers fall through to placeholder
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a personalized trade thesis suggestion.
 * Used when user starts writing a buy reason — we offer a draft they can edit.
 */
export async function generateTradeThesisStarter(
  symbol: string,
  companyName: string,
  tier: Tier
): Promise<string> {
  if (!CLAUDE_PROXY_URL) {
    return ''; // No backend, no suggestion
  }
  
  try {
    const response = await fetch(`${CLAUDE_PROXY_URL}/thesis-starter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, companyName, tier }),
    });
    
    const data = await response.json();
    return data.starter ?? '';
  } catch {
    return '';
  }
}

/**
 * Conversational AI tutor — answers open-ended investing questions.
 * Used by AiTutorScreen.
 */
export async function callClaudeForTutor(
  question: string,
  context: {
    tier: 1 | 2 | 3;
    lessonsCompleted: number;
    topBias?: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
): Promise<string> {
  const system = `You are an expert investing tutor. The student is Tier ${context.tier} (1=Beginner, 3=Advanced) with ${context.lessonsCompleted} lessons completed.${context.topBias ? ` Watch for their ${context.topBias} bias.` : ''} Keep answers under 200 words. Be warm, direct, practical.`;

  // ── Direct call ───────────────────────────────────────────────────────────
  if (!CLAUDE_PROXY_URL) {
    try {
      const answer = await callAnthropicDirect(system, question, 600);
      if (answer) return answer;
    } catch (e: any) {
      return `⚠️ ${e?.message ?? 'Could not reach AI'}`;
    }
    return `Great question! Add your Anthropic API key to .env to get a real answer to: "${question}"`;
  }

  // ── Proxy call ────────────────────────────────────────────────────────────
  try {
    const response = await fetch(`${CLAUDE_PROXY_URL}/tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, ...context }),
    });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    const data = await response.json();
    return data.answer ?? data.explanation ?? 'No response from tutor.';
  } catch (error: any) {
    console.error('[claudeAPI] tutor error', error);
    return "I'm having trouble reaching the AI tutor right now. Please check your connection and try again.";
  }
}

/**
 * Generate a personalized news summary at the user's tier.
 * The same news article gets rephrased differently for Tier 1 vs Tier 3.
 */
export async function generateTierAwareNewsSummary(
  articleText: string,
  symbol: string,
  tier: Tier
): Promise<string | null> {
  const system = `Summarise this financial news article in 2-3 sentences at Tier ${tier} level (1=plain English beginner, 3=technical expert). Focus on what it means for ${symbol} investors. Be concise.`;

  if (!CLAUDE_PROXY_URL) {
    try {
      const summary = await callAnthropicDirect(system, articleText.slice(0, 1500), 200);
      return summary || null;
    } catch { return null; }
  }

  try {
    const response = await fetch(`${CLAUDE_PROXY_URL}/news-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleText, symbol, tier }),
    });
    const data = await response.json();
    return data.summary;
  } catch {
    return null;
  }
}
