/**
 * Lightweight voiceover preview using the browser's Web Speech API.
 * No external dependencies — works in all modern browsers.
 */

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
}

export function speakText(text: string, options: SpeakOptions = {}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang  = options.lang  ?? 'es-CL';
  utterance.rate  = options.rate  ?? 0.92;
  utterance.pitch = options.pitch ?? 1.0;

  if (options.onEnd) utterance.onend = options.onEnd;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
