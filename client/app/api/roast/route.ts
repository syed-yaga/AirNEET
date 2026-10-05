import { NextResponse } from 'next/server';
import ollama from 'ollama';
import { RoastResponse } from '@/lib/types';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const LLM_MODEL = process.env.LLM_MODEL || 'llama3.2';

export async function POST(req: Request) {
  try {
    const { messages, weakTopics, chapter } = await req.json();

    const transcriptSummary = (messages || [])
      .slice(-8)
      .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `You are Sifat's loving, slightly sarcastic older brother who already cracked his medical entrance exams and is reviewing her study session for NEET.
Subject/Chapter: ${chapter || 'NCERT Class 11 Biology Chapter 9: Biomolecules'}
Recent Q&A transcript:
${transcriptSummary || 'Student was practicing NCERT Biology Chapter 9 Biomolecules concepts.'}

Weak topics flagged: ${(weakTopics || ['Competitive Inhibition: Malonate vs Succinic Dehydrogenase', 'Amino acid zwitterion form']).join(', ')}

Respond ONLY in valid JSON format matching this schema:
{
  "roast": "A witty, affectionate 2-3 sentence sibling roast addressing Sifat directly, teasing her for hesitating or mixing up biology concepts. Keep it playful, sibling-like, and motivating.",
  "weakTopics": ["Topic 1", "Topic 2"],
  "mnemonics": [
    {
      "concept": "Concept name",
      "hack": "A super catchy NEET mnemonic or mental model"
    },
    {
      "concept": "Concept name",
      "hack": "Another memorable NEET hack"
    }
  ],
  "brotherVerdict": "A short, loving older brother closing pep-talk addressing Sifat."
}`;

    let parsedResponse: RoastResponse | null = null;

    try {
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [{ role: 'user', content: prompt }],
          format: 'json',
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.message?.content;
        if (content) {
          parsedResponse = JSON.parse(content);
        }
      }
    } catch (e) {
      console.warn('[Roast] Ollama local call error:', e);
    }

    if (!parsedResponse) {
      // Fallback sibling roast if local LLM is still loading or not yet pulled
      parsedResponse = {
        roast: `Sifat, I saw your chat log! Did you seriously hesitate when asked about competitive inhibition? Malonate literally mimics succinate like a counterfeit note—it increases Km while Vmax stays untouched! And what was that hesitation on amino acid zwitterions? An alpha-carbon isn't rocket science, it's just substituted methane! Get these high-yield NCERT lines locked down before NEET cuts negative marks!`,
        weakTopics: weakTopics && weakTopics.length > 0 ? weakTopics : [
          'Competitive Inhibition: Malonate vs Succinate (Km increases, Vmax constant)',
          'Amino Acids: Zwitterion dipolar structure at isoelectric point',
        ],
        mnemonics: [
          {
            concept: 'Competitive Inhibition Effects',
            hack: 'Remember "C-K-U" (Competitive: Km goes UP, Vmax is UNCHANGED). More substrate can always overcome the inhibitor!',
          },
          {
            concept: 'DNA Base Pairing Hydrogen Bonds',
            hack: 'Think "A=T (2 bonds)" and "G≡C (3 bonds)". G and C are tight like best friends with 3 bonds!',
          },
        ],
        brotherVerdict: `Jokes aside, your diagnostic recall is getting sharper, Sifat. Re-read NCERT Chapter 9 pages 143-157 before dinner, then I'll rapid-fire quiz you!`,
      };
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error generating roast:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate roast',
      },
      { status: 500 }
    );
  }
}
