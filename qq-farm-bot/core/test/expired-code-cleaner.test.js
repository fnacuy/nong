const test = require('node:test');
const assert = require('node:assert/strict');

const { createExpiredCodeCleaner } = require('../src/runtime/expired-code-cleaner');

function createHarness(accounts, runningIds = new Set()) {
  const deleted = [];
  const store = {
    getCodeCleanupConfig: () => ({ enabled: false, retainDays: 7, failThreshold: 3, intervalHours: 0 }),
    deleteAccount: (id) => { deleted.push(String(id)); },
  };
  const provider = {
    getAccounts: () => ({ accounts }),
    isAccountRunning: (id) => runningIds.has(String(id)),
    stopWorker: () => {},
    addAccountLog: () => {},
  };
  const cleaner = createExpiredCodeCleaner({ store, provider, logger: { info() {}, warn() {} } });
  return { cleaner, deleted };
}

test('微信端 code 为空判定为失效', () => {
  const { cleaner } = createHarness([
    { id: '1', wxid: 'wx_a', code: '' },
  ]);
  assert.equal(cleaner.isAccountExpired({ id: '1', wxid: 'wx_a', code: '' }), true);
});

test('微信端 code 非空且未超阈值未超时判定为有效', () => {
  const { cleaner } = createHarness([]);
  assert.equal(cleaner.isAccountExpired({
    id: '2', wxid: 'wx_b', code: 'abc', codeRefreshFailCount: 0, lastCodeRefreshAt: Date.now(),
  }), false);
});

test('微信端连续失败次数超阈值判定为失效', () => {
  const { cleaner } = createHarness([]);
  assert.equal(cleaner.isAccountExpired({
    id: '3', wxid: 'wx_c', code: 'abc', codeRefreshFailCount: 3,
  }), true);
});

test('微信端距最近成功刷新超保留时限判定为失效', () => {
  const { cleaner } = createHarness([]);
  assert.equal(cleaner.isAccountExpired({
    id: '4', wxid: 'wx_d', code: 'abc', codeRefreshFailCount: 0,
    lastCodeRefreshAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
  }), true);
});

test('无微信刷新标识的 QQ 端账号已停止判定为失效', () => {
  const { cleaner } = createHarness([
    { id: '5', platform: 'qq', code: 'qqcode' },
  ], new Set());
  assert.equal(cleaner.isAccountExpired({ id: '5', platform: 'qq', code: 'qqcode' }), true);
});

test('无微信刷新标识的 QQ 端账号运行中判定为有效', () => {
  const { cleaner } = createHarness([], new Set(['6']));
  assert.equal(cleaner.isAccountExpired({ id: '6', platform: 'qq', code: 'qqcode' }), false);
});

test('provider 未注入 isAccountRunning 时不清理 QQ 端账号', () => {
  const store = {
    getCodeCleanupConfig: () => ({ enabled: false, retainDays: 7, failThreshold: 3, intervalHours: 0 }),
    deleteAccount: () => {},
  };
  const provider = {
    getAccounts: () => ({ accounts: [] }),
    stopWorker: () => {},
    addAccountLog: () => {},
  };
  const cleaner = createExpiredCodeCleaner({ store, provider, logger: { info() {}, warn() {} } });
  assert.equal(cleaner.isAccountExpired({ id: '7', platform: 'qq', code: 'qqcode' }), false);
});

test('runCleanup 删除失效 Code 微信账号与已停止 QQ 账号，保留运行中的 QQ 账号', async () => {
  const { cleaner, deleted } = createHarness([
    { id: 'wx1', wxid: 'wx_a', code: '' },
    { id: 'qq1', platform: 'qq', code: 'qqcode', name: '停掉的QQ' },
    { id: 'qq2', platform: 'qq', code: 'qqcode', name: '运行中的QQ' },
  ], new Set(['qq2']));

  const result = await cleaner.runCleanup();
  assert.deepEqual(result.deletedIds.sort(), ['qq1', 'wx1']);
  assert.deepEqual(deleted.sort(), ['qq1', 'wx1']);
  assert.equal(result.checkedCount, 3);
});
