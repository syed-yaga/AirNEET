"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  Send,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  FileSearch,
} from "lucide-react";
import { RetrievedSourceItem } from "./RagReferenceModal";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  source?: string;
  sources?: RetrievedSourceItem[];
  timestamp?: string;
}

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isStreaming: boolean;
  onOpenSourcesModal: (
    sources: RetrievedSourceItem[],
    topicTitle: string,
  ) => void;
  currentChapter: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  onOpenSourcesModal,
  currentChapter,
}) => {
  const [inputText, setInputText] = useState("");
  const [expandedSources, setExpandedSources] = useState<
    Record<string, boolean>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "What is the structural difference between a nucleoside and a nucleotide?",
    "How does a peptide bond form between two amino acids?",
    "How does competitive enzyme inhibition affect Km and Vmax?",
    "Why does starch give blue color with I₂ but cellulose does not?",
    "Explain the zwitterionic structure of amino acids",
    "What was Watson and Crick’s 1953 B-DNA pitch and structure?",
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const toggleSourceAccordion = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-12 space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/5">
              🧬
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                AirNEET — Offline Socratic Mentor
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Welcome, Sifat! You are revising in 100% Airplane Mode. This AI
                will <strong>never give direct answers</strong>; instead, it
                provides strict NCERT hints and diagnostic questions to test
                your active recall.
              </p>
            </div>

            {/* Socratic Principles Card */}
            <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
                Strict Socratic Rules in Effect:
              </span>
              <ul className="space-y-1.5 text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>
                    <strong>Zero Spoon-Feeding:</strong> Only 1 conceptual clue
                    + 1 diagnostic test question per turn.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>
                    <strong>100% Grounded in NCERT:</strong> If it's not in the
                    textbook, the tutor flags it as out-of-scope.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>
                    <strong>Zero Cloud Leaks:</strong> Runs completely on local
                    Ollama weights on your machine.
                  </span>
                </li>
              </ul>
            </div>

            {/* Quick Prompt Chips */}
            <div className="w-full space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-400 block">
                Tap a high-yield NCERT question to test active recall:
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(prompt)}
                    className="text-left text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 px-3 py-2 rounded-xl border border-slate-800 hover:border-emerald-500/30 transition shadow-sm"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === "user";
            const isLatest = index === messages.length - 1;
            const sources = msg.sources || [];
            const primaryCitation =
              msg.source || "NCERT Class 11 Biology, Chapter 9: Biomolecules";
            const isExpanded = expandedSources[msg.id];

            return (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 max-w-3xl ${
                  isUser ? "ml-auto justify-end" : "mr-auto justify-start"
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-xs text-slate-950 flex-shrink-0 shadow-md shadow-emerald-500/10 mt-0.5">
                    AI
                  </div>
                )}

                <div className={`space-y-2 max-w-[88%] sm:max-w-[85%]`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl p-4 sm:p-5 text-sm leading-relaxed shadow-md ${
                      isUser
                        ? "bg-emerald-600 text-white rounded-tr-sm ml-auto"
                        : "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm"
                    }`}
                  >
                    <div className="prose prose-invert max-w-none text-xs sm:text-sm prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          h3: ({ node, children, ...props }) => {
                            const text = String(children);
                            if (
                              text.toLowerCase().includes("conceptual clue")
                            ) {
                              return (
                                <div className="flex items-center gap-1.5 mt-2.5 mb-1 text-emerald-400 font-bold text-xs uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg w-fit shadow-sm not-prose">
                                  <span></span>
                                  <span>Conceptual Clue:</span>
                                </div>
                              );
                            }
                            if (
                              text.toLowerCase().includes("diagnostic question")
                            ) {
                              return (
                                <div className="flex items-center gap-1.5 mt-3.5 mb-1 text-amber-400 font-bold text-xs uppercase tracking-wider bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-lg w-fit shadow-sm not-prose">
                                  <span></span>
                                  <span>Diagnostic Question:</span>
                                </div>
                              );
                            }
                            return (
                              <h3
                                className="text-sm font-bold text-slate-200 mt-2 mb-1"
                                {...props}
                              >
                                {children}
                              </h3>
                            );
                          },
                          strong: ({ node, children, ...props }) => {
                            const text = String(children);
                            if (
                              text.toLowerCase().includes("conceptual clue")
                            ) {
                              return (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md mr-1.5 not-prose">
                                  💡 Conceptual Clue:
                                </span>
                              );
                            }
                            if (
                              text.toLowerCase().includes("diagnostic question")
                            ) {
                              return (
                                <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-xs uppercase tracking-wider bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md mr-1.5 not-prose">
                                  🎯 Diagnostic Question:
                                </span>
                              );
                            }
                            return (
                              <strong
                                className="font-semibold text-slate-100"
                                {...props}
                              >
                                {children}
                              </strong>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* NCERT Context Accordion (for Assistant messages) */}
                  {!isUser && (
                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden text-xs transition">
                      <button
                        onClick={() => toggleSourceAccordion(msg.id)}
                        className="w-full px-3.5 py-2 flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition select-none"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="font-medium truncate">
                            Grounded in NCERT:{" "}
                            <span className="text-emerald-300 font-semibold">
                              {primaryCitation}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] text-slate-500">
                          <span>{sources.length || 3} Chunks</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-3.5 pt-2 border-t border-slate-800/80 space-y-2.5 bg-slate-900/30 animate-in fade-in duration-150">
                          {sources.length > 0 ? (
                            sources.map((src, sIdx) => (
                              <div
                                key={src.id || sIdx}
                                className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/60 space-y-1"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-mono text-emerald-400 font-semibold">
                                    {src.page || src.chapter}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    Match: {(src.score * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                                  {src.excerpt}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">
                              Anchored to NCERT Class 11 Biology, Chapter 9:
                              Biomolecules.
                            </div>
                          )}

                          <button
                            onClick={() =>
                              onOpenSourcesModal(sources, primaryCitation)
                            }
                            className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium pt-1"
                          >
                            <FileSearch className="w-3.5 h-3.5" />
                            Inspect Full NCERT Excerpt Texts &amp; Similarity
                            Details
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-300 flex-shrink-0 mt-0.5">
                    S
                  </div>
                )}
              </div>
            );
          })
        )}

        {isStreaming && (
          <div className="flex items-center gap-3 text-xs text-slate-400 pl-2 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span>
              Ollama llama3.2 is synthesizing Socratic clue from NCERT...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/80 backdrop-blur">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative flex items-center"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a Biomolecules doubt (e.g., 'What is the difference between a nucleoside and a nucleotide?')..."
            disabled={isStreaming}
            className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition disabled:opacity-60 shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
            className="absolute right-2 p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-600 transition shadow-md"
            title="Send query to local Socratic RAG"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="max-w-3xl mx-auto text-center text-[11px] text-slate-500 mt-2">
          AirNEET • Strict Socratic Mentor • Offline Inference via Ollama
          (llama3.2 + nomic-embed-text) • 100% Distraction Free
        </p>
      </div>
    </div>
  );
};
