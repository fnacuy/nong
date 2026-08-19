const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const protobuf = require('protobufjs');

const { createRpcExtractor } = require('../src/capture/rpc-extractor');

let gateMessageType = null;

async function buildGateMessageType() {
  if (gateMessageType) return gateMessageType;
  const root = new protobuf.Root();
  await root.load([path.join(__dirname, '../src/proto/game.proto')], { keepCase: true });
  gateMessageType = root.lookupType('gatepb.Message');
  return gateMessageType;
}

async function createMessage(serviceName, methodName, messageType = 1, body = Buffer.alloc(0)) {
  const type = await buildGateMessageType();
  return type.encode(type.create({
    meta: {
      service_name: serviceName,
      method_name: methodName,
      message_type: messageType,
      client_seq: 1,
      server_seq: 1,
    },
    body,
  })).finish();
}

test('extracts service and method from a DogService.AddFood request', async () => {
  const extractor = await createRpcExtractor();
  const message = await createMessage('gamepb.dogpb.DogService', 'AddFood', 1, Buffer.from([0x08, 0x01]));
  const result = extractor.handleMessage(message);
  assert.deepEqual(result, {
    service: 'gamepb.dogpb.DogService',
    method: 'AddFood',
    messageType: 1,
  });
});

test('records message_type for responses', async () => {
  const extractor = await createRpcExtractor();
  const message = await createMessage('gamepb.dogpb.DogService', 'GetDogInfo', 2, Buffer.from([0x0A, 0x00]));
  const result = extractor.handleMessage(message);
  assert.equal(result.messageType, 2);
});

test('ignores malformed and empty messages', async () => {
  const extractor = await createRpcExtractor();
  assert.equal(extractor.handleMessage(Buffer.from('not a protobuf')), null);
  assert.equal(extractor.handleMessage(Buffer.alloc(0)), null);
  assert.equal(extractor.handleMessage(null), null);
});

test('ignores messages without meta', async () => {
  const extractor = await createRpcExtractor();
  const type = await buildGateMessageType();
  const message = type.encode(type.create({ body: Buffer.from([0x08, 0x01]) })).finish();
  assert.equal(extractor.handleMessage(message), null);
});
