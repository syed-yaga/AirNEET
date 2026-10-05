import { queryNcertContext, formatRetrievedContext } from "@/lib/rag";
import { RetrievedDoc } from "@/lib/types";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const LLM_MODEL = process.env.LLM_MODEL || "llama3.2";

export async function POST(req: Request) {
  try {
    const { messages, subject, chapter } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    const query = latestUserMessage ? latestUserMessage.content : "";

    // Retrieve top-3 closest NCERT chunks
    const retrievedDocs = await queryNcertContext(query, 3);
    const contextText = formatRetrievedContext(retrievedDocs);

    // Extract citation summary
    const sourcesSummary = retrievedDocs.map((doc) => ({
      id: doc.chunk.id,
      chapter: doc.chunk.metadata.chapter,
      page: doc.chunk.metadata.page,
      source: doc.chunk.metadata.source,
      score: Math.round(doc.score * 100) / 100,
      excerpt: doc.chunk.text.substring(0, 240) + "...",
    }));

    const primaryCitation = String(
      sourcesSummary[0]?.page ||
        sourcesSummary[0]?.chapter ||
        "NCERT Class 11 Biology Chapter 9: Biomolecules",
    );

    const systemPrompt = `You are a strict Socratic tutor for NEET (Indian National Eligibility cum Entrance Test). Your knowledge is strictly constrained to the official NCERT context provided below.
Rule 1: NEVER give the final answer or write long paragraphs.
Rule 2: Give only ONE concise conceptual hint based on the NCERT excerpt, then ask a targeted diagnostic question to test the student.
Rule 3: If the concept is not found in the NCERT context, state: "That concept is not in your current NCERT chapter scope."
Rule 4: Focus strictly on high-yield NEET facts (scientist names, years, exceptions, exact NCERT terminology).
Rule 5: Always end your response with a citation tag in brackets, e.g. [${primaryCitation}].

CRITICAL: Do NOT explain the answer directly. Never state the full definition.
Give ONE conceptual clue from the NCERT text, then ask a question that forces the student to deduce the reason.

Subject: ${subject || "Biology (Class 11)"}
Chapter Scope: ${chapter || "Ch 9: Biomolecules"}

NCERT Context Excerpt:
${contextText}`;

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    // Encode metadata in header (base64 encoded JSON)
    const encodedSources = Buffer.from(JSON.stringify(sourcesSummary)).toString(
      "base64",
    );

    // Create streaming connection with Ollama
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: formattedMessages,
          stream: true,
          options: {
            temperature: 0.3,
            top_p: 0.9,
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(
          `Ollama stream request failed with status: ${response.status}`,
        );
      }

      const reader = response.body.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                  const parsed = JSON.parse(trimmed);
                  if (parsed.message?.content) {
                    controller.enqueue(encoder.encode(parsed.message.content));
                  }
                } catch (e) {
                  // In case raw line chunk
                }
              }
            }

            if (buffer.trim()) {
              try {
                const parsed = JSON.parse(buffer.trim());
                if (parsed.message?.content) {
                  controller.enqueue(encoder.encode(parsed.message.content));
                }
              } catch (e) {}
            }

            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-NCERT-Sources": encodedSources,
          "X-NCERT-Primary-Citation": encodeURIComponent(primaryCitation),
        },
      });
    } catch (ollamaError) {
      console.warn(
        "[Chat] Ollama local stream error, generating local Socratic response:",
        ollamaError,
      );

      // Local Socratic synthesis fallback using retrieved context
      const fallbackHint = generateLocalSocraticFallback(
        query,
        retrievedDocs,
        primaryCitation,
      );
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(fallbackHint));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-NCERT-Sources": encodedSources,
          "X-NCERT-Primary-Citation": encodeURIComponent(primaryCitation),
        },
      });
    }
  } catch (error) {
    console.error("Error in chat API route:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Intelligent local fallback when Ollama model is downloading or initializing
 */
function generateLocalSocraticFallback(
  query: string,
  docs: RetrievedDoc[],
  citation: string,
): string {
  const q = query.toLowerCase();

  if (docs.length === 0) {
    return `That concept is not in your current NCERT chapter scope. Which section of Chapter 9 (Biomolecules) would you like to review? [${citation}]`;
  }

  if (q.includes("amino acid") || q.includes("zwitterion") || q.includes("glycine") || q.includes("alanine") || q.includes("serine")) {
    return `Consider the substituted methane structure of alpha-amino acids. At which specific pH does an amino acid simultaneously carry both positive and negative charges without a net charge? [${citation}]`;
  }

  if (q.includes("inhibit") || q.includes("malonate") || q.includes("succin") || q.includes("enzyme") || q.includes("km") || q.includes("vmax")) {
    return `Recall how malonate acts as a competitive inhibitor of succinic dehydrogenase by closely mimicking succinate. Does competitive inhibition alter the maximum velocity (Vmax), or does it solely increase the Michaelis constant (Km)? [${citation}]`;
  }

  if (q.includes("peptide") || q.includes("bond") || q.includes("dehydration") || q.includes("glycosidic") || q.includes("phosphodiester")) {
    return `Think about polymerisation in biological macromolecules. Which functional group of one monomer reacts with which group of the next with the elimination of a water molecule? [${citation}]`;
  }

  if (q.includes("starch") || q.includes("cellulose") || q.includes("iodine") || q.includes("chitin") || q.includes("glycogen") || q.includes("inulin")) {
    return `Consider the secondary helical structure of polysaccharides. Why can amylose in starch entrap iodine molecules to yield a blue colour, whereas cellulose cannot? [${citation}]`;
  }

  if (q.includes("dna") || q.includes("watson") || q.includes("crick") || q.includes("pitch") || q.includes("nucleotide") || q.includes("purine") || q.includes("pyrimidine")) {
    return `Recall the Watson-Crick B-DNA double helix model. What is the pitch of one full turn (10 base pairs), and how many hydrogen bonds link Guanine to Cytosine? [${citation}]`;
  }

  if (q.includes("co-factor") || q.includes("prosthetic") || q.includes("coenzyme") || q.includes("apoenzyme") || q.includes("haem") || q.includes("nad")) {
    return `Differentiate between tightly bound and transient enzyme components. What is the non-protein portion called, and which co-factor type does haem represent in catalase? [${citation}]`;
  }

  // General Socratic hint based on top chunk snippet
  const snippet = docs[0].chunk.text.split(".")[0] || "the official NCERT text";
  return `Consider what NCERT states regarding this biomolecule: "${snippet}". Based on this principle, how would you deduce the functional consequence during cellular processes? [${citation}]`;
}
