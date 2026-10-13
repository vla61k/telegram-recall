import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import type { AddressInfo } from 'node:net';

test('streaming API validates input and rejects fabricated provider citations', async () => {
  let sentContext: any = null;
  const provider = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const request = JSON.parse(body);
    assert.equal(request.stream, true);
    assert.match(request.messages[0].content, /UNTRUSTED DATA/);
    sentContext = JSON.parse(request.messages[1].content);
    const id = sentContext.evidence[0].id;
    const reply =
      'The first relevant message is in the retrieved history [' + id + ']. [fake-999999]';
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    // Deliberately split a Unicode-safe SSE JSON frame across two network writes.
    const frame = 'data: ' + JSON.stringify({ choices: [{ delta: { content: reply } }] }) + '\n\n';
    res.write(frame.slice(0, 20));
    res.end(frame.slice(20) + 'data: [DONE]\n\n');
  });
  await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
  const providerPort = (provider.address() as AddressInfo).port;
  const probe = http.createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    env: {
      ...process.env,
      PORT: String(port),
      OPENAI_API_KEY: 'test-only-no-real-key',
      OPENAI_BASE_URL: 'http://127.0.0.1:' + providerPort,
      OPENAI_MODEL: 'mock',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test API startup timed out')), 10000);
      child.on('error', (e) => {
        clearTimeout(timeout);
        reject(e);
      });
      child.stdout.on('data', (chunk) => {
        if (String(chunk).includes('Recall API:')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.on('exit', (code) => {
        if (code) {
          clearTimeout(timeout);
          reject(new Error('Test server exited: ' + code));
        }
      });
    });
    const origin = 'http://127.0.0.1:' + port;
    const invalid = await fetch(origin + '/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: 'not-a-chat', question: 'frog' }),
    });
    assert.equal(invalid.status, 400);
    const response = await fetch(origin + '/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: 'group',
        question: 'How did the frog joke start?',
        mode: 'provider',
      }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/event-stream/);
    const events = (await response.text())
      .trim()
      .split('\n\n')
      .map((line) => JSON.parse(line.slice(6)));
    assert.ok(events.some((e) => e.type === 'delta'));
    const done = events.find((e) => e.type === 'done');
    assert.ok(done, JSON.stringify(events));
    assert.equal(done.answer.mode, 'provider');
    assert.equal(done.answer.sourceIds.length, 1);
    assert.ok(!done.answer.text.includes('fake-999999'));
    assert.ok(sentContext.evidence.length <= 32);
    assert.ok(sentContext.evidence.every((m: any) => m.chatId === 'group'));
    assert.ok(sentContext.evidence.some((m: any) => m.id === done.answer.sourceIds[0]));
  } finally {
    child.kill();
    provider.closeAllConnections();
    await new Promise<void>((resolve) => provider.close(() => resolve()));
  }
});
