const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qq-farm-user-store-premium-'));
process.env.FARM_DATA_DIR = dataDir;

const userStore = require('../src/models/user-store');

test.after(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function makePremiumCard(description, days = 30) {
  return userStore.createCard(description, days, 'premium', { durationUnit: 'day' });
}

function makePermanentPremiumCard(description) {
  return userStore.createCard(description, -1, 'premium', { durationUnit: 'day' });
}

function makeTimeCard(description, days = 30) {
  return userStore.createCard(description, days, 'time', { durationUnit: 'day' });
}

function registerWithTimeCard(username) {
  const card = makeTimeCard(`${username} 注册卡`);
  const result = userStore.registerUser(username, 'Passw0rd!', card.code);
  assert.equal(result.ok, true, `注册 ${username} 失败: ${result.error}`);
  return result;
}

test('createCard supports premium type', () => {
  const card = makePremiumCard('高级功能月卡', 30);
  assert.equal(card.type, 'premium');
  assert.equal(card.days, 30);
  assert.equal(card.isPermanent, false);
});

test('registerUser rejects premium card', () => {
  const card = makePremiumCard('不可用于注册');
  const result = userStore.registerUser('premium_reg_user', 'Passw0rd!', card.code);
  assert.equal(result.ok, false);
  assert.match(result.error, /高级功能卡/);
});

test('renewUser activates premium days card', () => {
  registerWithTimeCard('premium_user1');
  const card = makePremiumCard('高级功能30天', 30);
  const result = userStore.renewUser('premium_user1', card.code);
  assert.equal(result.ok, true);
  assert.equal(result.cardType, 'premium');
  assert.ok(result.premium);
  assert.equal(result.premium.days, 30);
  assert.ok(result.premium.expiresAt > Date.now());
});

test('renewUser rejects second premium days card', () => {
  const card = makePremiumCard('第二次30天', 30);
  const result = userStore.renewUser('premium_user1', card.code);
  assert.equal(result.ok, false);
  assert.match(result.error, /仅限激活一次/);
});

test('renewUser allows permanent premium card', () => {
  registerWithTimeCard('premium_user2');
  const card = makePermanentPremiumCard('高级功能永久卡');
  const result = userStore.renewUser('premium_user2', card.code);
  assert.equal(result.ok, true);
  assert.equal(result.premium.isPermanent, true);
  assert.equal(result.premium.expiresAt, null);
});

test('permanent premium card bypasses days-once limit', () => {
  registerWithTimeCard('premium_user3');
  const daysCard = makePremiumCard('天数卡', 30);
  assert.equal(userStore.renewUser('premium_user3', daysCard.code).ok, true);

  const permCard = makePermanentPremiumCard('永久卡');
  const result = userStore.renewUser('premium_user3', permCard.code);
  assert.equal(result.ok, true);
  assert.equal(result.premium.isPermanent, true);
});

test('days card rejected after permanent card', () => {
  const daysCard = makePremiumCard('永久后再天数', 30);
  const result = userStore.renewUser('premium_user3', daysCard.code);
  assert.equal(result.ok, false);
  assert.match(result.error, /仅限激活一次/);
});
