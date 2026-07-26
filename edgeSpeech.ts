/**
 * Edge TTS client for Deno.
 * Uses npm:ws — Deno's native WebSocket is rejected by speech.platform.bing.com.
 */

import WebSocket from 'ws';

const EDGE_SPEECH_URL =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
// Keep in sync with upstream edge-tts Chromium version when Microsoft tightens checks.
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split('.')[0];
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

const WSS_HEADERS = {
  Pragma: 'no-cache',
  'Cache-Control': 'no-cache',
  Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
  'User-Agent':
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function generateSecMsGecToken() {
  const ticks = BigInt(Math.floor(Date.now() / 1000 + 11644473600)) * 10000000n;
  const roundedTicks = ticks - (ticks % 3000000000n);
  const data = new TextEncoder().encode(`${roundedTicks}${TRUSTED_CLIENT_TOKEN}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function genSSML(text: string, voice: string, rate: number, pitch: number) {
  let inner = text;
  if (rate || pitch) {
    const pitchPct = Math.floor((pitch || 1) * 100);
    const ratePct = Math.floor((rate || 1) * 100);
    inner = `<prosody pitch="${pitchPct}%" rate="${ratePct}%">${inner}</prosody>`;
  }
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
    `xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">` +
    `<voice name="${voice}">${inner}</voice></speak>`
  );
}

function sendContent(headers: Record<string, string>, body: string) {
  return `${Object.entries(headers)
    .map(([k, v]) => `${k}:${v}`)
    .join('\r\n')}\r\n\r\n${body}`;
}

export async function synthesizeEdgeSpeech(
  text: string,
  voice: string,
  rate = 0,
  pitch = 0
): Promise<Uint8Array> {
  const connectId = crypto.randomUUID().replace(/-/g, '');
  const secMsGec = await generateSecMsGecToken();
  const url =
    `${EDGE_SPEECH_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
    `&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}` +
    `&ConnectionId=${connectId}`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: WSS_HEADERS });
    ws.binaryType = 'arraybuffer';

    let audioData = new Uint8Array(0);
    let settled = false;

    const finish = (err?: Error, data?: Uint8Array) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      if (err) reject(err);
      else resolve(data!);
    };

    const timer = setTimeout(() => finish(new Error('Edge TTS timeout')), 30000);

    ws.on('open', () => {
      const date = new Date().toString();
      const config = JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: true },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
            },
          },
        },
      });
      ws.send(
        sendContent(
          {
            'Content-Type': 'application/json; charset=utf-8',
            Path: 'speech.config',
            'X-Timestamp': date,
          },
          config
        )
      );
      ws.send(
        sendContent(
          {
            'Content-Type': 'application/ssml+xml',
            Path: 'ssml',
            'X-RequestId': connectId,
            'X-Timestamp': date,
          },
          genSSML(text, voice, rate, pitch)
        )
      );
    });

    ws.on('message', (data: unknown, isBinary: boolean) => {
      if (!isBinary) {
        const textMsg = typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array);
        if (textMsg.includes('Path:turn.end')) {
          if (!audioData.byteLength) {
            finish(new Error('Edge TTS returned no audio'));
            return;
          }
          finish(undefined, audioData);
        }
        return;
      }

      const buf =
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : new Uint8Array(data as Uint8Array);
      if (buf.byteLength < 2) return;
      const headerLength = (buf[0] << 8) | buf[1];
      if (buf.byteLength <= headerLength + 2) return;
      const body = buf.subarray(2 + headerLength);
      const merged = new Uint8Array(audioData.byteLength + body.byteLength);
      merged.set(audioData, 0);
      merged.set(body, audioData.byteLength);
      audioData = merged;
    });

    ws.on('error', (err: Error) => {
      finish(new Error(`Edge TTS WebSocket error: ${err.message}`));
    });

    ws.on('close', () => {
      if (!settled) {
        finish(
          audioData.byteLength
            ? undefined
            : new Error('Edge TTS WebSocket closed before audio received'),
          audioData.byteLength ? audioData : undefined
        );
      }
    });
  });
}
