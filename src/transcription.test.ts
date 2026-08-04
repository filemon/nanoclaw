import { afterEach, describe, expect, it, vi } from 'vitest';

import { transcribeAudio, type TranscriptionConfig } from './transcription.js';

const cfg: TranscriptionConfig = { apiKey: 'sk-test', model: 'whisper-1', timeoutMs: 1000 };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('transcribeAudio', () => {
  it('returns the transcript text on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('  hello world  ', { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const text = await transcribeAudio(Buffer.from('fake-ogg'), cfg, { mimeType: 'audio/ogg; codecs=opus' });
    expect(text).toBe('hello world');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/v1/audio/transcriptions');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer sk-test' });
    expect((init as RequestInit).body).toBeInstanceOf(FormData);
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
