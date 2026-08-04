// Final WhatsApp link harness. Writes creds DIRECTLY to the real store/auth,
// reconnects through the post-pair 515 restart (like the real adapter), and
// holds the connection until 'open'. Never deletes anything. Once it prints
// LINKED, the creds are safely in store/auth and the service can take over.
const path = require('path');
const fs = require('fs');

const AUTH_DIR = '/root/nanoclaw-v2/store/auth';
const QR_HTML = '/root/nanoclaw-v2/scripts/wa-qr.html';
const PHONE = '420735207783';

(async () => {
  const B = require('@whiskeysockets/baileys');
  const makeWASocket = B.default || B.makeWASocket;
  const { useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers, DisconnectReason } = B;
  const QRCode = require('qrcode');
  const P = require('pino')({ level: 'warn' });

  // Fresh pair: clear the store.
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  let version = [2, 3000, 1043984129];
  try {
    const res = await fetch('https://wppconnect.io/whatsapp-versions/', { signal: AbortSignal.timeout(5000) });
    const m = (await res.text()).match(/2\.3000\.(\d+)/);
    if (m) version = [2, 3000, Number(m[1])];
  } catch {}
  console.log('[link2] baileys', require('@whiskeysockets/baileys/package.json').version, 'WA', version.join('.'));

  let qrDone = false;
  let opened = false;

  async function connect() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P) },
      printQRInTerminal: false,
      logger: P,
      browser: Browsers.macOS('Chrome'),
    });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
      const reason = u.lastDisconnect?.error?.output?.statusCode;
      if (u.connection || reason) {
        console.log('[link2] update:', JSON.stringify({ connection: u.connection, isNewLogin: u.isNewLogin, disconnectReason: reason }));
      }

      if (u.qr && !qrDone && !state.creds.me) {
        qrDone = true;
        const svg = await QRCode.toString(u.qr, { type: 'svg', margin: 2, width: 520, errorCorrectionLevel: 'M' });
        fs.writeFileSync(QR_HTML, `<title>NanoClaw WhatsApp QR</title>
<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#fff;font-family:system-ui,sans-serif;padding:24px">
<h1 style="color:#111;font-size:19px;margin:0">Scan with WhatsApp → Linked Devices</h1>
<div style="background:#fff;padding:10px;border:1px solid #ddd;border-radius:10px;max-width:92vw">${svg}</div>
<p style="color:#555;font-size:13px;margin:0;text-align:center">Bot phone …207783 · rotates ~20s — refresh if it expires.</p></div>`);
        console.log('[link2] >>> QR RENDERED <<<');
        try { console.log('[link2] >>> PAIRING CODE:', await sock.requestPairingCode(PHONE), '<<<'); }
        catch (e) { console.log('[link2] code error:', e?.message || e); }
      }

      if (u.connection === 'open') {
        opened = true;
        console.log('\n[link2] *** LINKED & OPEN — creds saved to store/auth ***\n');
      }

      if (u.connection === 'close') {
        if (reason === DisconnectReason.restartRequired) {
          console.log('[link2] 515 restart required (post-pair) — reconnecting…');
          setTimeout(() => connect().catch(e => console.log('[link2] reconnect err', e?.message)), 800);
        } else if (reason === DisconnectReason.loggedOut) {
          console.log('[link2] *** LOGGED OUT (401) ***');
        } else if (!opened) {
          console.log('[link2] closed before open, reason', reason, '— reconnecting…');
          setTimeout(() => connect().catch(e => console.log('[link2] reconnect err', e?.message)), 1500);
        }
      }
    });
  }

  await connect();
  // Stay alive 6 min; never delete auth.
  setTimeout(() => { console.log('[link2] harness exiting (creds preserved in store/auth)'); process.exit(0); }, 360000);
})();
