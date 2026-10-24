import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const outDir = fileURLToPath(new URL('../.screenshots/', import.meta.url));
await mkdir(outDir, { recursive: true });

async function targets() {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  return res.json();
}

let list = [];
for (let i = 0; i < 30; i += 1) {
  try {
    list = await targets();
    if (list.some((t) => t.type === 'page')) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
const created = await fetch(
  'http://127.0.0.1:9222/json/new?' + encodeURIComponent('http://127.0.0.1:5173/'),
  { method: 'PUT' },
).then((r) => r.json());
const page = created;
if (!page || !page.webSocketDebuggerUrl) throw new Error('no page target');
console.log('target:', page.url);

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description ?? ''));
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
});

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text + ' ' + (result.exceptionDetails.exception?.description ?? ''));
  }
  return result.result?.value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(outDir + name, Buffer.from(data, 'base64'));
  console.log('captured', name);
}

async function clickText(text) {
  const ok = await evaluate(`(() => {
    const norm = (s) => (s || '').replace(/\\s+/g, '');
    const btn = [...document.querySelectorAll('button')].find((b) => norm(b.textContent).includes(${JSON.stringify(text)}) && !b.disabled);
    if (!btn) return false;
    btn.click();
    return true;
  })()`);
  console.log('click', text, ok);
  return ok;
}

async function scene() {
  return evaluate(`(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim(),
    buttons: [...document.querySelectorAll('button')].map((b) => (b.textContent || '').replace(/\\s+/g, '')).filter(Boolean).slice(0, 20),
    bodyText: document.body.innerText.slice(0, 400),
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))()`);
}

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await sleep(3500);
console.log(await scene());
await shot('gate.png');

await clickText('押送审判');
await sleep(2600);
console.log('after judge:', await scene());
await shot('verdict.png');

await clickText('申请还阳');
await sleep(3200);
console.log('modal:', await scene());
await shot('resurrect.png');

await clickText('确认采用补丁');
await sleep(2400);
console.log('verified:', await evaluate(`document.body.innerText.includes('本次修复验证通过')`));
await shot('verified.png');

console.log('errors:', errors);
ws.close();
