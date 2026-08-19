/**
 * 失效 Code 定期清理服务
 * QQ Farm Automation Bot
 *
 * 判定并清理两类账号：
 * - 微信自动刷新 code 失效的账号：存在 wxid 且满足任一条件（code 为空 / 连续刷新失败次数超阈值 / 距最近成功刷新超过保留时限）
 * - 已停止运行且未绑定微信自动刷新的 QQ 端账号
 * - 清理动作：先停止对应 worker，再删除账号
 */
const { createScheduler } = require('../services/scheduler');
const { createModuleLogger } = require('../services/logger');

const SCHEDULER_NS = 'expired_code_cleanup';
const TASK_NAME = 'run_cleanup';

function hasWxRefreshIdentity(account) {
  return !!String(
    (account && account.wxid)
    || (account && account.openId)
    || (account && account.open_id)
    || (account && account.yybOpenid)
    || (account && account.yybOpenId)
    || "",
  ).trim();
}

function createExpiredCodeCleaner({ store, provider, logger }) {
  const cleanerLogger = logger || createModuleLogger('expired-code-cleaner');
  const scheduler = createScheduler(SCHEDULER_NS);

  let lastRunAt = 0;
  let lastCleanupCount = 0;

  function isExpired(account, config, isAccountRunning) {
    if (!account) return false;

    // 已停止运行的账号（不限账号类型）一律纳入清理
    if (typeof isAccountRunning === 'function' && !isAccountRunning(String(account.id || ''))) {
      return true;
    }

    // 微信端账号（运行中）：按失效 code 判定
    if (hasWxRefreshIdentity(account)) {
      if (!account.code) return true;
      const failCount = Number(account.codeRefreshFailCount) || 0;
      if (failCount >= config.failThreshold) return true;
      const lastRefresh = Number(account.lastCodeRefreshAt) || 0;
      if (lastRefresh > 0 && Date.now() - lastRefresh > config.retainDays * 24 * 60 * 60 * 1000) {
        return true;
      }
    }

    return false;
  }

  async function runCleanup() {
    const config = store.getCodeCleanupConfig();
    const data = provider.getAccounts();
    const accounts = Array.isArray(data && data.accounts) ? data.accounts : [];
    const targets = accounts.filter(acc => isExpired(acc, config, provider.isAccountRunning));

    const deletedIds = [];
    for (const account of targets) {
      const accountId = String(account.id || '');
      try {
        const wasRunning = provider.isAccountRunning(String(accountId));
        if (provider.stopWorker) {
          provider.stopWorker(accountId);
        } else if (provider.stopAccount) {
          provider.stopAccount(accountId);
        }
        store.deleteAccount(accountId);
        deletedIds.push(accountId);
        if (provider.addAccountLog) {
          const kind = wasRunning ? '失效 Code' : '已停止';
          provider.addAccountLog(
            'code_cleanup',
            `清理${kind}账号: ${account.name || accountId}`,
            accountId,
            account.name || ''
          );
        }
      } catch (err) {
        cleanerLogger.warn(`清理账号 ${accountId} 失败: ${err.message}`, {
          module: 'expired-code-cleaner',
          scope: SCHEDULER_NS,
          accountId,
          error: err && err.message ? err.message : String(err)
        });
      }
    }

    lastRunAt = Date.now();
    lastCleanupCount = deletedIds.length;
    if (deletedIds.length > 0) {
      cleanerLogger.info(`失效 Code / 已停止账号清理完成，删除 ${deletedIds.length} 个账号`, {
        module: 'expired-code-cleaner',
        scope: SCHEDULER_NS,
        deletedIds,
        deletedCount: deletedIds.length
      });
    }
    return { deletedCount: deletedIds.length, deletedIds, checkedCount: accounts.length };
  }

  function reschedule() {
    const config = store.getCodeCleanupConfig();
    scheduler.clear(TASK_NAME);
    if (config.enabled && Number(config.intervalHours) > 0) {
      const intervalMs = Number(config.intervalHours) * 60 * 60 * 1000;
      scheduler.setIntervalTask(TASK_NAME, intervalMs, () => {
        runCleanup().catch(err => {
          cleanerLogger.warn(`定时清理执行失败: ${err.message}`, {
            module: 'expired-code-cleaner',
            scope: SCHEDULER_NS,
            error: err && err.message ? err.message : String(err)
          });
        });
      });
    }
  }

  function getConfig() {
    return {
      ...store.getCodeCleanupConfig(),
      lastRunAt,
      lastCleanupCount
    };
  }

  function isAccountExpired(account) {
    return isExpired(account, store.getCodeCleanupConfig(), provider.isAccountRunning);
  }

  return {
    runCleanup,
    reschedule,
    getConfig,
    isAccountExpired,
    getSchedulerSnapshot: () => scheduler.getSnapshot()
  };
}

module.exports = { createExpiredCodeCleaner };
