/**
 * Host-side voice-note transcription.
 *
 * Channels such as WhatsApp and Telegram deliver voice notes as OGG/Opus audio.
 * The Claude Agent SDK cannot read audio, so a raw .ogg staged into the
 * container inbox is invisible to the agent. We transcribe on the host, right
 * after download, and fold the transcript into the message text so it drives
 * trigger-matching, routing, and the agent exactly like a typed message.
 *
 * Backends, tried in order:
 *   1. OpenAI POST /v1/audio/transcriptions (when OPENAI_API_KEY is set).
 *      OGG/Opus is accepted directly — no ffmpeg transcode needed.
 *   2. Local faster-whisper (scripts/transcribe-local.py) run as a one-shot
 *      subprocess, so the model is not resident between voice notes. Used when
 *      no key is configured or the OpenAI call fails (bad key, outage).
 *
 * Config (read by callers via `readEnvFile`, never `process.env` — secrets are
 * deliberately kept out of the host process environment so they don't leak to
 * child processes):
 *   OPENAI_API_KEY              — enables the OpenAI backend
 *   VOICE_TRANSCRIPTION_MODEL   — default "whisper-1" (e.g. "gpt-4o-transcribe")
 *   VOICE_TRANSCRIPTION_ENABLED — set "false" to disable entirely
 *   LOCAL_WHISPER_PYTHON        — python with faster-whisper installed; default
 *                                 /opt/nanoclaw-whisper/bin/python if present
 *   LOCAL_WHISPER_MODEL         — default "small"
 *   VOICE_TRANSCRIPTION_LANGUAGE — ISO-639-1 hint for both backends, e.g. "cs";
 *                                 auto-detect when unset
 */
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { readEnvFile } from './env.js';
import { extForMime } from './attachment-naming.js';
import { log } from './log.js';

const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const DEFAULT_MODEL = 'whisper-1';
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_LOCAL_PYTHON = '/opt/nanoclaw-whisper/bin/python';
const DEFAULT_LOCAL_MODEL = 'small';
const DEFAULT_LOCAL_TIMEOUT_MS = 180_000;
const LOCAL_SCRIPT = path.resolve(process.cwd(), 'scripts', 'transcribe-local.py');

export interface LocalWhisperConfig {
  python: string;
  script: string;
  model: string;
  language?: string;
  timeoutMs: number;
}

export interface TranscriptionConfig {
  apiKey?: string;
  model: string;
  timeoutMs: number;
  language?: string;
  local?: LocalWhisperConfig;
}

/**
 * Resolve transcription config from `.env`, or return `null` when disabled or
 * no backend is available. Call once at adapter startup and reuse the result.
 */
export function loadTranscriptionConfig(): TranscriptionConfig | null {
  const env = readEnvFile([
    'OPENAI_API_KEY',
    'VOICE_TRANSCRIPTION_MODEL',
    'VOICE_TRANSCRIPTION_ENABLED',
    'LOCAL_WHISPER_PYTHON',
    'LOCAL_WHISPER_MODEL',
    'VOICE_TRANSCRIPTION_LANGUAGE',
  ]);
  const language = env.VOICE_TRANSCRIPTION_LANGUAGE || undefined;
  if (env.VOICE_TRANSCRIPTION_ENABLED === 'false') return null;

  const python = env.LOCAL_WHISPER_PYTHON || DEFAULT_LOCAL_PYTHON;
  const local: LocalWhisperConfig | undefined =
    fs.existsSync(python) && fs.existsSync(LOCAL_SCRIPT)
      ? {
          python,
          script: LOCAL_SCRIPT,
          model: env.LOCAL_WHISPER_MODEL || DEFAULT_LOCAL_MODEL,
          language,
          timeoutMs: DEFAULT_LOCAL_TIMEOUT_MS,
        }
      : undefined;

  if (!env.OPENAI_API_KEY && !local) return null;
  return {
    apiKey: env.OPENAI_API_KEY || undefined,
    model: env.VOICE_TRANSCRIPTION_MODEL || DEFAULT_MODEL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    language,
    local,
  };
}

/**
 * Transcribe an audio buffer. Returns the transcript text, or `null` when every
 * configured backend fails — callers should fall back to treating the message
 * as an untranscribed voice note rather than dropping it.
 */
export async function transcribeAudio(
  buffer: Buffer,
  config: TranscriptionConfig,
  opts: { mimeType?: string; filename?: string } = {},
): Promise<string | null> {
  if (config.apiKey) {
    const text = await transcribeOpenAI(buffer, config.apiKey, config, opts);
    if (text) return text;
  }
  if (config.local) {
    return transcribeLocal(buffer, config.local, opts);
  }
  return null;
}

async function transcribeOpenAI(
  buffer: Buffer,
  apiKey: string,
  config: TranscriptionConfig,
  opts: { mimeType?: string; filename?: string },
): Promise<string | null> {
  const ext = extForMime(opts.mimeType) || 'ogg';
  const filename = opts.filename && /\.[a-z0-9]+$/i.test(opts.filename) ? opts.filename : `audio.${ext}`;
  // OpenAI infers format from the filename extension and the blob type; strip
  // any `; codecs=opus` parameter so the bare MIME is sent.
  const cleanMime =
    typeof opts.mimeType === 'string' && opts.mimeType ? opts.mimeType.split(';')[0].trim() : 'audio/ogg';

  const form = new FormData();
  // Buffer is a Uint8Array subclass; Blob accepts it directly.
  form.append('file', new Blob([buffer], { type: cleanMime }), filename);
  form.append('model', config.model);
  form.append('response_format', 'text');
  if (config.language) form.append('language', config.language);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
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

async function transcribeLocal(
  buffer: Buffer,
  local: LocalWhisperConfig,
  opts: { mimeType?: string },
): Promise<string | null> {
  const ext = extForMime(opts.mimeType) || 'ogg';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nanoclaw-voice-'));
  const audioPath = path.join(dir, `audio.${ext}`);
  try {
    fs.writeFileSync(audioPath, buffer);
    const args = [local.script, audioPath, '--model', local.model];
    if (local.language) args.push('--language', local.language);
    const text = await new Promise<string>((resolve, reject) => {
      execFile(local.python, args, { timeout: local.timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) reject(Object.assign(err, { stderr: String(stderr).slice(-500) }));
        else resolve(String(stdout));
      });
    });
    return text.trim() || null;
  } catch (err) {
    log.warn('Local voice transcription failed', { err });
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
