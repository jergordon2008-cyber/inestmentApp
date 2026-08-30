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
// PROMPT TEMPLATES
// ============================================================================

const PROMPT_TEMPLATES = {
  1: `You're a friendly tutor explaining finance to a complete beginner who's never invested before. Rules:
- Use plain English, no jargon
- Use concrete numerical examples
- Use analogies to everyday objects when helpful
- Keep it under 120 words
- Don't condescend
- End by tying it to a practical action they can take`,
  
  2: `You're explaining finance to someone with basic investing experience (a few months of paper trading). Rules:
- Use proper financial terms but define them
- Show how the concept applies in real decision-making
- Reference one or two related concepts they should explore
- Keep it under 150 words
- Be technically accurate without overwhelming`,
  
  3: `You're explaining finance to an experienced investor who wants nuance. Rules:
- Use full technical vocabulary
- Cover edge cases and common misconceptions
- Reference quantitative frameworks where relevant
- Acknowledge debates and conflicting evidence
- Keep it under 200 words
- No oversimplification`,
};

// ============================================================================
// PUBLIC API
// ============================================================================

export interface ClaudeResponse {
  explanation: string;
  tokensUsed?: number;
  cached: boolean;
  error?: string;
}

/**
 * Get an AI-generated explanation for a financial term.
 * Uses backend proxy if configured; falls back to direct Anthropic call for dev.
 */
export async function callClaudeForExplanation(
  term: string,
  tier: Tier,
  userContext?: { ownedSymbols?: string[]; currentLessonId?: string }
): Promise<ClaudeResponse> {
  // ── Direct call (dev / personal use) ──────────────────────────────────────
  if (!CLAUDE_PROXY_URL) {
    try {
      const explanation = await callAnthropicDirect(
        PROMPT_TEMPLATES[tier as 1 | 2 | 3] ?? PROMPT_TEMPLATES[1],
        `Explain this financial term concisely: "${term}"`,
        400,
      );
      if (explanation) return { explanation, cached: false };
    } catch (e: any) {
      console.error('[claudeAPI direct]', e);
      return {
        explanation: `⚠️ AI explanation unavailable: ${e?.message ?? 'unknown error'}`,
        cached: false,
        error: e?.message,
      };
    }
    // Key not configured — show setup hint
    return {
      explanation:
        `Tap here to learn what "${term}" means! To activate AI explanations, add your ` +
        `Anthropic API key to .env (see .env.example) and restart Expo.`,
      cached: false,
      error: 'KEY_NOT_CONFIGURED',
    };
  }

  // ── Proxy call (production) ────────────────────────────────────────────────
  try {
    const response = await fetch(CLAUDE_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        term,
        tier,
        systemPrompt: PROMPT_TEMPLATES[tier as 1 | 2 | 3],
        userContext,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    return {
      explanation: data.explanation,
      tokensUsed: data.tokensUsed,
      cached: data.cached ?? false,
    };
  } catch (error: any) {
    console.error('[claudeAPI]', error);
    return {
      explanation: 
        `Sorry, I couldn't reach the AI tutor right now. ` +
        `\n\nThis usually clears up quickly — try again in a few seconds. ` +
        `If you're offline, the AI tutor needs an internet connection.`,
      cached: false,
      error: error.message,
    };
  }
}

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
 * Used by aiTutorService. TutorChatScreen calls Anthropic directly.
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
