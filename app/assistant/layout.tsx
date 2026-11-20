import { Geist, Geist_Mono } from 'next/font/google';

/*
 * The assistant's own type: Geist for words and Geist Mono for readouts (figures,
 * speeds, the small instrument labels). Loaded for this screen only, so the rest
 * of the dashboard keeps its system fonts and pays nothing for these.
 */
const sans = Geist({ subsets: ['latin'], variable: '--font-ai-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-ai-mono', display: 'swap' });

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${sans.variable} ${mono.variable} ai-fonts h-full`}>{children}</div>;
}
