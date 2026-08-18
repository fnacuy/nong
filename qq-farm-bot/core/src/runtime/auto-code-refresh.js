const fetch = require('node-fetch');
const { createScheduler } = require('../services/scheduler');

function createAutoCodeRefreshService(deps) {
  const {
    store,
    getAccounts,
    addOrUpdateAccount,
    resolveWorkerControls,
    log,
    addAccountLog,
  } = deps;

  const scheduler = createScheduler('auto_code_refresh');

  function getTaskName(accountId) {
    return `refresh_${  String(accountId || '')}`;
  }

  function findAccount(accountId) {
    const data = getAccounts();
    const accounts = Array.isArray(data && data.accounts) ? data.accounts : [];
    return accounts.find(acc => String(acc.id) === String(accountId));
  }

  function normalizeConfig(accountId) {
    const cfg = store.getAutoCodeRefresh ? store.getAutoCodeRefresh(accountId) : null;
    return {
      enabled: cfg && cfg.enabled === true,
      intervalMinutes: Math.max(1, Math.min(1440, Number(cfg && cfg.intervalMinutes) || 60)),
    };
  }

  function getWxConfig() {
    return store.getGlobalWxConfig ? store.getGlobalWxConfig() : {};
  }

  function getOpenId(account) {
    return String(account && (account.openId || account.open_id || account.yybOpenid || account.yybOpenId) || '').trim();
  }

  function getYybOpenId(account) {
    // 应用宝刷新 code 需要"应用宝 openid"（扫码得到的 openid），
    // 优先取 yybOpenid 字段；openId 可能已被登录状态覆盖为真实微信 openId。
    return String(account && (account.yybOpenid || account.yybOpenId || account.openId || account.open_id) || '').trim();
  }

  function getWxid(account) {
    return String(account && account.wxid || '').trim();
  }

  function isYybAccount(account) {
    return String(account && account.loginType || '').toLowerCase() === 'yyb'
      || (!getWxid(account) && !!getOpenId(account));
  }

  function hasRefreshIdentity(account) {
    return !!getWxid(account) || !!getOpenId(account);
  }

  async function requestYybCode(account, wxConfig) {
    const openid = getYybOpenId(account);
    if (!openid) throw new Error('账号缺少 openid，无法自动刷新 Code');

    const apiBase = String(wxConfig.apiBase || '').trim();
    if (!apiBase) throw new Error('未配置应用宝接口地址，无法自动刷新 Code');

    const headers = { 'Content-Type': 'application/json' };
    const apiKey = String(wxConfig.apiKey || '').trim();
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(`${apiBase}/wxapp/getCode`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ openid, forceRefresh: true }),
    });
    const data = await response.json();
    if (data && data.code === 0 && data.data && data.data.code) return String(data.data.code);
    throw new Error(data && data.msg ? data.msg : `获取应用宝 Code 失败 (HTTP ${response.status})`);
  }

  async function requestFarmCode(account, wxConfig) {
    const wxid = getWxid(account);
    if (!wxid) throw new Error('账号缺少 wxid，无法自动刷新 Code');

    const apiKey = String(wxConfig.apiKey || '').trim();
    const appId = String(wxConfig.appId || 'wx5306c5978fdb76e4').trim();

    if (apiKey) {
      const proxyApiUrl = String(wxConfig.proxyApiUrl || 'https://code.z74d.top/api').trim();
      const targetUrl = `${proxyApiUrl  }?api_key=${  encodeURIComponent(apiKey)  }&action=jslogin`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wxid, appid: appId }),
      });
      const data = await response.json();
      if (data && data.code === 0 && data.data && data.data.code) return String(data.data.code);
      throw new Error(data && data.msg ? data.msg : '代理获取 Code 失败');
    }

    const apiBase = String(wxConfig.apiBase || 'https://code.z74d.top/api').trim();
    const response = await fetch(`${apiBase  }/Wxapp/JSLogin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Wxid: wxid, Appid: appId }),
    });
    const data = await response.json();
    if (data && data.Success && data.Data && data.Data.code) return String(data.Data.code);
    const msg = data && data.Data && data.Data.jsapiBaseresponse && data.Data.jsapiBaseresponse.errmsg
      ? data.Data.jsapiBaseresponse.errmsg
      : data && data.Message ? data.Message : '获取 Code 失败';
    throw new Error(msg);
  }

  async function refreshAccountCode(accountId, reason = 'timer') {
    const account = findAccount(accountId);
    if (!account) return false;

    if (!hasRefreshIdentity(account)) {
      log('系统', '自动刷新 Code 跳过: 账号缺少 wxid/openid', {
        accountId: String(accountId),
        accountName: account.name,
      });
      return false;
    }

    const wxConfig = getWxConfig();
    if (wxConfig.enabled === false) {
      log('系统', '自动刷新 Code 跳过: 微信登录未启用', {
        accountId: String(accountId),
        accountName: account.name,
      });
      return false;
    }

    try {
      const code = isYybAccount(account)
        ? await requestYybCode(account, wxConfig)
        : await requestFarmCode(account, wxConfig);
      const nextAccount = {
        ...account,
        code,
        lastCodeRefreshAt: Date.now(),
        codeRefreshFailCount: 0,
      };
      addOrUpdateAccount(nextAccount);

      const controls = typeof resolveWorkerControls === 'function' ? (resolveWorkerControls() || {}) : {};
      if (typeof controls.restartWorker === 'function') controls.restartWorker(nextAccount);

      addAccountLog('auto_code_refresh', `自动刷新 Code 成功，已重启账号: ${  account.name}`,
        account.id, account.name, { reason });
      log('系统', `自动刷新 Code 成功: ${  account.name}`, {
        accountId: String(account.id),
        accountName: account.name,
      });
      return true;
    } catch (err) {
      const nextAccount = {
        ...account,
        codeRefreshFailCount: (Number(account.codeRefreshFailCount) || 0) + 1,
      };
      addOrUpdateAccount(nextAccount);
      addAccountLog('auto_code_refresh_failed', `自动刷新 Code 失败: ${  err.message}`,
        account.id, account.name, { reason });
      log('错误', `自动刷新 Code 失败: ${  account.name  } - ${  err.message}`, {
        accountId: String(account.id),
        accountName: account.name,
      });
      return false;
    }
  }

  function scheduleAccount(accountId) {
    const cfg = normalizeConfig(accountId);
    const taskName = getTaskName(accountId);
    scheduler.clear(taskName);
    if (!cfg.enabled) return;

    const account = findAccount(accountId);
    if (!account || !hasRefreshIdentity(account)) {
      log('系统', '自动刷新 Code 未启动: 账号缺少 wxid/openid', {
        accountId: String(accountId),
        accountName: account && account.name || '',
      });
      return;
    }

    scheduler.setIntervalTask(taskName, cfg.intervalMinutes * 60000, () => {
      refreshAccountCode(accountId, 'timer');
    }, { preventOverlap: true });

    log('系统', `自动刷新 Code 已启用: ${  account.name  }，间隔 ${  cfg.intervalMinutes  } 分钟`, {
      accountId: String(accountId),
      accountName: account.name,
    });
  }

  function rescheduleAll() {
    scheduler.clearAll();
    const data = getAccounts();
    const accounts = Array.isArray(data && data.accounts) ? data.accounts : [];
    for (const account of accounts) {
      scheduleAccount(account.id);
    }
  }

  function stopAccount(accountId) {
    scheduler.clear(getTaskName(accountId));
  }

  return {
    refreshAccountCode,
    scheduleAccount,
    rescheduleAll,
    stopAccount,
  };
}

module.exports = { createAutoCodeRefreshService };
