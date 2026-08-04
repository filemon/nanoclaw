/**
 * Host-side voice-note transcription via the OpenAI audio API.
 *
 * Channels such as WhatsApp deliver voice notes as OGG/Opus audio. The Claude
 * Agent SDK cannot read audio, so a raw .ogg staged into the container inbox is
 * invisible to the agent. We transcribe on the host, right after download, and
 * fold the transcript into the message text so it drives trigger-matching,
 * routing, and the agent exactly like a typed message.
 *
 * Backend: OpenAI POST /v1/audio/transcriptions. OGG/Opus is accepted directly
 * — no ffmpeg transcode needed.
 *
 * Config (read by callers via `readEnvFile`, never `process.env` — secrets are
 * deliberately kept out of the host process environment so they don't leak to
 * child processes):
 *   OPENAI_API_KEY              — required; transcription is skipped if unset
 *   VOICE_TRANSCRIPTION_MODEL   — default "whisper-1" (e.g. "gpt-4o-transcribe")
 *   VOICE_TRANSCRIPTION_ENABLED — set "false" to disable even when a key exists
 */
import { readEnvFile } from './env.js';
import { extForMime } from './attachment-naming.js';
import { log } from './log.js';

const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const DEFAULT_MODEL = 'whisper-1';
const DEFAULT_TIMEOUT_MS = 60_000;

export interface TranscriptionConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

/**
 * Resolve transcription config from `.env`, or return `null` when disabled or
 * unconfigured. Call once at adapter startup and reuse the result.
 */
export function loadTranscriptionConfig(): TranscriptionConfig | null {
  const env = readEnvFile(['OPENAI_API_KEY', 'VOICE_TRANSCRIPTION_MODEL', 'VOICE_TRANSCRIPTION_ENABLED']);
  if (env.VOICE_TRANSCRIPTION_ENABLED === 'false') return null;
  if (!env.OPENAI_API_KEY) return null;
  return {
    apiKey: env.OPENAI_API_KEY,
    model: env.VOICE_TRANSCRIPTION_MODEL || DEFAULT_MODEL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

/**
 * Transcribe an audio buffer. Returns the transcript text, or `null` on any
 * failure (network, API error, empty result) — callers should fall back to
 * treating the message as an untranscribed voice note rather than dropping it.
 */
export async function transcribeAudio(
  buffer: Buffer,
  config: TranscriptionConfig,
  opts: { mimeType?: string; filename?: string } = {},
): Promise<string | null> {
  const ext = extForMime(opts.mimeType) || 'ogg';
  const filename =
    opts.filename && /\.[a-z0-9]+$/i.test(opts.filename) ? opts.filename : `audio.${ext}`;
  // OpenAI infers format from the filename extension and the blob type; strip
  // any `; codecs=opus` parameter so the bare MIME is sent.
  const cleanMime =
    typeof opts.mimeType === 'string' && opts.mimeType ? opts.mimeType.split(';')[0].trim() : 'audio/ogg';

  const form = new FormData();
  // Buffer is a Uint8Array subclass; Blob accepts it directly.
  form.append('file', new Blob([buffer], { type: cleanMime }), filename);
  form.append('model', config.model);
  form.append('response_format', 'text');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      log.warn('Voice transcription failed', { status: res.status, detail: detail.slice(0, 200) });
      return null;
    }
    // response_format=text → body is the raw transcript.
    const text = (await res.text()).trim();
    return text || null;
  } catch (err) {
    log.warn('Voice transcription error', { err });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
