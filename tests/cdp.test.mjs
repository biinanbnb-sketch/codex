import test from 'node:test';
import assert from 'node:assert/strict';
import {connect, localSocket, mainWindow} from '../launcher/cdp.mjs';

test('only the official main page is eligible for injection', () => {
  assert.equal(mainWindow({type:'page', url:'app://-/index.html?initialRoute=%2F'}), true);
  for (const url of ['https://example.org/index.html', 'app://other/index.html', 'app://-/index.html?initialRoute=/quick-chat', 'app://-/index.html?initialRoute=/detached-window', 'app://-/index.html?initialRoute=/avatar', 'about:blank']) {
    assert.equal(mainWindow({type:'page', url}), false, url);
  }
  assert.equal(mainWindow({type:'worker', url:'app://-/index.html'}), false);
});

test('socket rejects other hosts, ports and non-page endpoints', () => {
  assert.equal(localSocket('ws://127.0.0.1:9311/devtools/page/abc',9311), 'ws://127.0.0.1:9311/devtools/page/abc');
  for (const value of ['ws://example.org:9311/devtools/page/abc','ws://127.0.0.1:9312/devtools/page/abc','ws://user@127.0.0.1:9311/devtools/page/abc','ws://127.0.0.1:9311/devtools/browser/abc','http://127.0.0.1:9311/devtools/page/abc']) assert.throws(() => localSocket(value,9311));
});

class FakeSocket extends EventTarget {
  constructor() { super(); queueMicrotask(() => this.dispatchEvent(new Event('open'))); }
  send(data) {
    const {id,method} = JSON.parse(data);
    if (method === 'wait') return;
    queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', {data:JSON.stringify(method === 'denied' ? {id,error:{message:'denied'}} : {id,result:{method}})})));
  }
  close() { this.dispatchEvent(new Event('close')); }
}

test('concurrent CDP replies, protocol errors, and timeouts are handled', async () => {
  const client=await connect('ws://test', FakeSocket);
  assert.deepEqual(await Promise.all([client.call('first'),client.call('second')]), [{method:'first'},{method:'second'}]);
  await assert.rejects(client.call('denied'), /denied/);
  await assert.rejects(client.call('wait',{},10), /超时/);
  client.close();
});

test('disconnect rejects in-flight requests without waiting for timeout', async () => {
  const client=await connect('ws://test', FakeSocket);
  const pending=assert.rejects(client.call('wait'), /断开/);
  client.close();
  await pending;
});
