// Parse the latest ANSI terminal-QR block from the host log and emit a clean
// scannable HTML grid. Dark module = ESC[40m, light = ESC[47m (two spaces each).
const fs = require('fs');
const log = fs.readFileSync('/root/nanoclaw-v2/logs/nanoclaw.log', 'latin1');
const lines = log.split('\n');

// Find the last "WhatsApp QR code" marker, collect rows until the next
// timestamped log line.
let startIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('WhatsApp QR code')) { startIdx = i; break; }
}
if (startIdx === -1) { console.error('NO_QR'); process.exit(2); }

const rows = [];
for (let i = startIdx + 1; i < lines.length; i++) {
  const ln = lines[i];
  if (/^\[[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(ln)) break; // next log line
  // Match each module: ESC[40m (dark) or ESC[47m (light) followed by 2 spaces.
  const mods = [...ln.matchAll(/\x1b\[4([07])m {2}/g)].map(m => (m[1] === '0' ? 1 : 0));
  if (mods.length) rows.push(mods);
}
// Keep only rows matching the modal width (drops stray/partial lines).
const widthCount = {};
rows.forEach(r => { widthCount[r.length] = (widthCount[r.length] || 0) + 1; });
const W = Object.keys(widthCount).sort((a, b) => widthCount[b] - widthCount[a])[0] | 0;
const grid = rows.filter(r => r.length === W);
if (!grid.length || !W) { console.error('PARSE_FAIL rows=' + rows.length + ' W=' + W); process.exit(3); }

const QZ = 4; // quiet zone in modules
const H = grid.length;
const cell = 10;
const totalW = (W + QZ * 2) * cell;
let cells = '';
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (grid[y][x]) {
      cells += `<rect x="${(x + QZ) * cell}" y="${(y + QZ) * cell}" width="${cell}" height="${cell}" fill="#000"/>`;
    }
  }
}
const totalH = (H + QZ * 2) * cell;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}"><rect width="${totalW}" height="${totalH}" fill="#fff"/>${cells}</svg>`;

const html = `<title>NanoClaw WhatsApp QR</title>
<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#fff;font-family:system-ui,sans-serif;padding:24px">
<h1 style="color:#111;font-size:20px;margin:0">Scan with WhatsApp → Linked Devices</h1>
<div style="background:#fff;padding:8px;border:1px solid #ddd;border-radius:8px">${svg}</div>
<p style="color:#555;font-size:14px;margin:0;text-align:center">Bot phone …207783 · WhatsApp → Settings → Linked Devices → Link a Device<br>Scan promptly — this code rotates.</p>
</div>`;
fs.writeFileSync('/root/nanoclaw-v2/scripts/wa-qr.html', html);
console.error(`OK W=${W} H=${H}`);
