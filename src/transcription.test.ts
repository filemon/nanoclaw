import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { transcribeAudio, type LocalWhisperConfig, type TranscriptionConfig } from './transcription.js';

const cfg: TranscriptionConfig = { apiKey: 'sk-test', model: 'whisper-1', timeoutMs: 1000 };

/** A stand-in for the faster-whisper script: node runs it in place of python. */
function fakeLocal(body: string): LocalWhisperConfig {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'transcribe-test-'));
  const script = path.join(dir, 'fake.js');
  fs.writeFileSync(script, body);
  return { python: process.execPath, script, model: 'small', timeoutMs: 5000 };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('transcribeAudio', () => {
  it('returns the transcript text on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('  hello world  ', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const text = await transcribeAudio(Buffer.from('fake-ogg'), cfg, { mimeType: 'audio/ogg; codecs=opus' });
    expect(text).toBe('hello world');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/v1/audio/transcriptions');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer sk-test' });
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
    expect(((init as RequestInit).body as FormData).get('language')).toBeNull();
  });

  it('sends the language hint when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ahoj', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await transcribeAudio(Buffer.from('x'), { ...cfg, language: 'cs' });
    expect(((fetchMock.mock.calls[0][1] as RequestInit).body as FormData).get('language')).toBe('cs');
  });

  it('returns null on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad key', { status: 401 })));
    expect(await transcribeAudio(Buffer.from('x'), cfg)).toBeNull();
  });

  it('returns null when the transcript is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('   ', { status: 200 })));
    expect(await transcribeAudio(Buffer.from('x'), cfg)).toBeNull();
  });

  it('returns null (not throws) on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    expect(await transcribeAudio(Buffer.from('x'), cfg)).toBeNull();
  });
});

describe('transcribeAudio local fallback', () => {
  it('falls back to local whisper when OpenAI rejects the key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad key', { status: 401 })));
    const local = fakeLocal(
      `const fs = require('fs'); process.stdout.write(' heard ' + fs.readFileSync(process.argv[2], 'utf8') + ' ');`,
    );
    expect(await transcribeAudio(Buffer.from('ogg-bytes'), { ...cfg, local })).toBe('heard ogg-bytes');
  });

  it('uses local whisper alone when no API key is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const local = fakeLocal(`process.stdout.write(process.argv.slice(3).join(' '));`);
    const text = await transcribeAudio(Buffer.from('x'), {
      model: 'whisper-1',
      timeoutMs: 1000,
      local: { ...local, language: 'cs' },
    });
    expect(text).toBe('--model small --language cs');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the local backend fails', async () => {
    const local = fakeLocal(`process.exit(1);`);
    expect(await transcribeAudio(Buffer.from('x'), { model: 'whisper-1', timeoutMs: 1000, local })).toBeNull();
  });
});
