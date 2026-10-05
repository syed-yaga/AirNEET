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

    const systemPrompt = `You are AirNEET, a strict Socratic tutor for NEET medical aspirants.
Under NO circumstances should you give the complete direct answer.

You must structure your response EXACTLY using the following format:

### Conceptual Clue:
<Provide ONE concise conceptual hint based on the retrieved NCERT context. Do not solve the question or give the full answer; trigger memory.>

### Diagnostic Question:
<Ask ONE targeted diagnostic question that forces active recall of the missing component or mechanism.>

Grounded in NCERT: ${primaryCitation}

Rules:
1. NEVER output a single unformatted paragraph. You MUST prepend the exact labels "### Conceptual Clue:" and "### Diagnostic Question:" before each respective section.
2. If the concept is not found in the NCERT context, respond strictly with:
### Conceptual Clue:
That concept is not in your current NCERT chapter scope.

### Diagnostic Question:
Which topic from Chapter 9 (Biomolecules) would you like to review instead?

Grounded in NCERT: ${primaryCitation}
3. Focus strictly on high-yield NEET facts (scientist names, years, exceptions, exact NCERT terminology).
4. Keep each section concise (1-2 sentences maximum). Never spoon-feed.

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

  let clue = "";
  let question = "";

  if (docs.length === 0) {
    clue = "That concept is not in your current NCERT chapter scope.";
    question = "Which specific section of Chapter 9 (Biomolecules) would you like to review instead?";
  } else if (q.includes("nucleoside") || q.includes("nucleotide") || q.includes("phosphate") || q.includes("nitrogenous base")) {
    clue = "A nucleotide consists of a nitrogenous base, a pentose sugar, and a phosphate group. When the phosphate is absent, the compound is called a nucleoside.";
    question = "Which specific bond links the phosphate group to the 5'-hydroxyl group of the nucleoside sugar to form a nucleotide?";
  } else if (q.includes("amino acid") || q.includes("zwitterion") || q.includes("glycine") || q.includes("alanine") || q.includes("serine")) {
    clue = "Amino acids are substituted methanes possessing four substituent groups: hydrogen, carboxyl group, amino group, and a variable R group.";
    question = "At which specific pH does an amino acid simultaneously carry both positive and negative ionic charges to form a zwitterion?";
  } else if (q.includes("inhibit") || q.includes("malonate") || q.includes("succin") || q.includes("enzyme") || q.includes("km") || q.includes("vmax")) {
    clue = "Malonate closely resembles the substrate succinate in its molecular structure and competitively inhibits succinic dehydrogenase.";
    question = "In competitive enzyme inhibition, does the inhibitor change the maximum velocity (Vmax), or does it solely increase the Michaelis constant (Km)?";
  } else if (q.includes("peptide") || q.includes("bond") || q.includes("dehydration") || q.includes("glycosidic") || q.includes("phosphodiester")) {
    clue = "A peptide bond forms when the carboxyl group (-COOH) of one amino acid reacts with the amino group (-NH2) of the next via elimination of a water molecule.";
    question = "Which specific chemical reaction mechanism accounts for the formation of peptide, glycosidic, and phosphodiester bonds?";
  } else if (q.includes("starch") || q.includes("cellulose") || q.includes("iodine") || q.includes("chitin") || q.includes("glycogen") || q.includes("inulin")) {
    clue = "Starch forms helical secondary structures that can hold iodine molecules (I2) in its interior, whereas cellulose lacks complex helices.";
    question = "What structural difference prevents cellulose from trapping iodine molecules to produce a blue coloration?";
  } else if (q.includes("dna") || q.includes("watson") || q.includes("crick") || q.includes("pitch") || q.includes("purine") || q.includes("pyrimidine")) {
    clue = "In the Watson-Crick B-DNA double helix model, the pitch of each full turn is 3.4 nm and contains approximately 10 base pairs.";
    question = "How many hydrogen bonds form specifically between Guanine and Cytosine compared to Adenine and Thymine?";
  } else if (q.includes("co-factor") || q.includes("prosthetic") || q.includes("coenzyme") || q.includes("apoenzyme") || q.includes("haem") || q.includes("nad")) {
    clue = "Co-factors are non-protein constituents bound to an enzyme (apoenzyme) to make it catalytically active. They are categorized as prosthetic groups, co-enzymes, or metal ions.";
    question = "Which type of co-factor is tightly and permanently bound to the apoenzyme, such as haem in peroxidase and catalase?";
  } else {
    const snippet = docs[0]?.chunk.text.split(".")[0] || "NCERT Class 11 Chapter 9 details cellular biomolecules";
    clue = `NCERT states regarding this concept: "${snippet}".`;
    question = "Based on this principle, how would you deduce the functional consequence during cellular processes?";
  }

  return `### Conceptual Clue:\n${clue}\n\n### Diagnostic Question:\n${question}\n\nGrounded in NCERT: ${citation}`;
}
