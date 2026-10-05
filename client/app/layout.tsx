import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AirNEET — Offline Socratic Mentor',
  description: '100% Offline Socratic RAG Mentor for NEET Aspirants (AirNEET) powered by local Ollama.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
