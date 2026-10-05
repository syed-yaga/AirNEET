'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow, Message } from '@/components/ChatWindow';
import { OfflineBadge } from '@/components/OfflineBadge';
import { RagReferenceModal, RetrievedSourceItem } from '@/components/RagReferenceModal';
import { RoastModal } from '@/components/RoastModal';
import { RoastResponse, StudySession } from '@/lib/types';
import { Sparkles, Terminal } from 'lucide-react';

export default function StudyPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSubject, setCurrentSubject] = useState<string>('Biology (Class 11)');
  const [currentChapter, setCurrentChapter] = useState<string>('Ch 9: Biomolecules');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Status & Metrics
  const [ollamaRunning, setOllamaRunning] = useState<boolean>(true);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [weakTopics, setWeakTopics] = useState<string[]>([
    'Competitive Inhibition: Malonate vs Succinic Dehydrogenase (Km & Vmax)',
    'Amino Acids: Zwitterionic form & isoelectric point',
  ]);

  // Actions states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);

  // Modals
  const [ragModalOpen, setRagModalOpen] = useState<boolean>(false);
  const [activeSources, setActiveSources] = useState<RetrievedSourceItem[]>([]);
  const [activeTopicTitle, setActiveTopicTitle] = useState<string>('');

  const [roastModalOpen, setRoastModalOpen] = useState<boolean>(false);
  const [roastData, setRoastData] = useState<RoastResponse | null>(null);
  const [isRoasting, setIsRoasting] = useState<boolean>(false);

  // Initial status check
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setOllamaRunning(data.ollamaRunning);
          if (data.totalChunks > 0) {
            setTotalChunks(data.totalChunks);
          }
        }
      } catch (err) {
        console.warn('Status route error:', err);
      }
    }
    checkStatus();
  }, []);

  // Handle sending a message & streaming Socratic response
  const handleSendMessage = async (text: string) => {
    if (isStreaming) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsStreaming(true);
    setSaveSuccess(null);
    setSyncSuccess(null);

    // Track weak topic heuristics
    const lower = text.toLowerCase();
    if (lower.includes('quasi') || lower.includes('fluid')) {
      if (!weakTopics.includes('Fluid Mosaic Model lipid fluidity')) {
        setWeakTopics((prev) => [...prev, 'Fluid Mosaic Model lipid fluidity']);
      }
    } else if (lower.includes('endomembrane') || lower.includes('vacuole') || lower.includes('lysosome')) {
      if (!weakTopics.includes('Endomembrane system components')) {
        setWeakTopics((prev) => [...prev, 'Endomembrane system components']);
      }
    } else if (lower.includes('ribosome') || lower.includes('70s') || lower.includes('80s')) {
      if (!weakTopics.includes('Ribosome 70S vs 80S subunits')) {
        setWeakTopics((prev) => [...prev, 'Ribosome 70S vs 80S subunits']);
      }
    }

    const assistantId = `msg_${Date.now()}_a`;
    const initialAssistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    setMessages([...updatedMessages, initialAssistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          subject: currentSubject,
          chapter: currentChapter,
        }),
      });

      // Extract retrieved sources from header
      let retrievedSources: RetrievedSourceItem[] = [];
      let primaryCitation = 'NCERT Chapter 8';

      const encodedSources = response.headers.get('X-NCERT-Sources');
      if (encodedSources) {
        try {
          const decoded = atob(encodedSources);
          retrievedSources = JSON.parse(decoded);
        } catch (e) {
          console.warn('Failed to parse sources header:', e);
        }
      }

      const encodedCitation = response.headers.get('X-NCERT-Primary-Citation');
      if (encodedCitation) {
        primaryCitation = decodeURIComponent(encodedCitation);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: accumulatedText,
                  source: primaryCitation,
                  sources: retrievedSources,
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Chat stream error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  'Think about the lipid bilayer described in NCERT Class 11 Chapter 8. What component moves laterally to provide quasi-fluidity? [NCERT Biology Ch 8, p. 131]',
                source: 'NCERT Biology Ch 8, p. 131',
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // 1. Save Session to local study_log.json
  const handleSaveSession = async () => {
    setIsSaving(true);
    setSaveSuccess(null);

    const payload: StudySession = {
      studentName: 'Sifat',
      timestamp: new Date().toISOString(),
      subject: currentSubject,
      chapter: currentChapter,
      metrics: {
        totalInteractions: messages.length,
        weakTopicsIdentified: weakTopics,
      },
      rawHistory: messages.map((m) => ({
        role: m.role,
        content: m.content,
        source: m.source,
      })),
    };

    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccess('Saved to ./data/study_log.json');
        setTimeout(() => setSaveSuccess(null), 4000);
      } else {
        alert('Failed to save session locally.');
      }
    } catch (err) {
      console.error('Save session error:', err);
      alert('Error writing study_log.json');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Roast My Mistakes
  const handleRoastMistakes = async () => {
    setRoastModalOpen(true);
    setIsRoasting(true);

    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          weakTopics,
          chapter: currentChapter,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoastData(data);
      } else {
        throw new Error('Roast route returned error');
      }
    } catch (err) {
      console.error('Roast error:', err);
    } finally {
      setIsRoasting(false);
    }
  };

  // 3. Sync to Brother (Express server on Render or localhost:4000)
  const handleSyncCloud = async () => {
    setIsSyncing(true);
    setSyncSuccess(null);

    const payload = {
      studentName: 'Sifat',
      timestamp: new Date().toISOString(),
      subject: currentSubject,
      chapter: currentChapter,
      metrics: {
        totalInteractions: messages.length,
        weakTopicsIdentified: weakTopics,
      },
      weakTopics,
      rawHistory: messages.map((m) => ({
        role: m.role,
        content: m.content,
        source: m.source,
      })),
    };

    try {
      // First save locally to disk
      await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Then dispatch to Express backend (default http://localhost:4000/api/sync)
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
      const syncRes = await fetch(`${serverUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (syncRes.ok) {
        const result = await syncRes.json();
        setSyncSuccess(`Synced to Brother's Dashboard! (${result.totalSynced} sessions)`);
        setTimeout(() => setSyncSuccess(null), 5000);
      } else {
        setSyncSuccess('Server unreachable. Ensure /server is running on port 4000.');
      }
    } catch (err) {
      console.warn('Sync error:', err);
      setSyncSuccess('Saved locally. Brother server offline (Wi-Fi off).');
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Re-Ingest NCERT Documents
  const handleReIngest = async () => {
    setIsIngesting(true);
    try {
      const res = await fetch('/api/ingest', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTotalChunks(data.totalChunks || 63);
        alert(`Successfully indexed ${data.totalChunks} NCERT chunks!`);
      } else {
        alert('Failed to re-index documents.');
      }
    } catch (err) {
      console.error('Ingest error:', err);
      alert('Ingestion error.');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleOpenSourcesModal = (sources: RetrievedSourceItem[], topicTitle: string) => {
    setActiveSources(sources);
    setActiveTopicTitle(topicTitle);
    setRagModalOpen(true);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSubject={currentSubject}
        onSubjectChange={setCurrentSubject}
        currentChapter={currentChapter}
        onChapterChange={setCurrentChapter}
        onSaveSession={handleSaveSession}
        onRoastMistakes={handleRoastMistakes}
        onSyncCloud={handleSyncCloud}
        onReIngest={handleReIngest}
        isSaving={isSaving}
        isSyncing={isSyncing}
        isIngesting={isIngesting}
        syncSuccess={syncSuccess}
        saveSuccess={saveSuccess}
        totalChunks={totalChunks}
      />

      {/* Main Study Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/70 backdrop-blur px-6 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-xl">✈️</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  AirNEET
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {currentSubject}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Scope: <span className="text-emerald-300 font-semibold">{currentChapter.includes('Biomolecules') ? 'Biomolecules' : currentChapter}</span>
              </p>
            </div>
          </div>

          {/* Airplane Mode Live Status Badge */}
          <OfflineBadge
            ollamaRunning={ollamaRunning}
            totalChunks={totalChunks}
          />
        </header>

        {/* Chat Window with Socratic Stream */}
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onOpenSourcesModal={handleOpenSourcesModal}
          currentChapter={currentChapter}
        />
      </div>

      {/* Modal for Inspecting NCERT Grounding Excerpts */}
      <RagReferenceModal
        isOpen={ragModalOpen}
        onClose={() => setRagModalOpen(false)}
        sources={activeSources}
        topicTitle={activeTopicTitle}
      />

      {/* Modal for Older Brother Roast & NEET Mnemonics */}
      <RoastModal
        isOpen={roastModalOpen}
        onClose={() => setRoastModalOpen(false)}
        roastData={roastData}
        isLoading={isRoasting}
        onRegenerate={handleRoastMistakes}
      />
    </div>
  );
}
