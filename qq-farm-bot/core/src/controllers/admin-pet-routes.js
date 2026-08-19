const { toNum } = require("../utils/utils");

function getAuthorizedAccountId({
  req,
  res,
  getAccountIdFromRequest,
  canAccessAccount,
}) {
  const accountId = getAccountIdFromRequest(req);
  if (!accountId) {
    res.status(400).json({ ok: false, error: "Missing x-account-id" });
    return null;
  }
  if (!canAccessAccount(req, accountId)) {
    res.status(403).json({ ok: false, error: "无权访问此账号" });
    return null;
  }
  return accountId;
}

function registerAdminPetRoutes({
  app,
  provider,
  adminLogger,
  getAccountIdFromRequest,
  canAccessAccount,
  sendProviderError,
}) {
  // API: 获取宠物状态（自家或好友）
  app.get("/api/pet/status", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    const friendGid = toNum(req.query.friendGid) || 0;
    try {
      const data = await provider.getPetStatus(accountId, friendGid);
      res.json({ ok: true, data });
    } catch (error) {
      adminLogger.error("获取宠物状态失败", { error: error.message });
      sendProviderError(res, error);
    }
  });

  // API: 获取宠物列表（所有狗类型）
  app.get("/api/pet/list", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    try {
      const data = await provider.getPetList(accountId);
      res.json({ ok: true, data });
    } catch (error) {
      adminLogger.error("获取宠物列表失败", { error: error.message });
      sendProviderError(res, error);
    }
  });

  // API: 激活狗
  app.post("/api/pet/activate", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    const { dogTypeId } = req.body || {};
    try {
      const data = await provider.activateDog(accountId, dogTypeId);
      res.json({ ok: true, data });
    } catch (error) {
      adminLogger.error("激活狗失败", { error: error.message });
      sendProviderError(res, error);
    }
  });

  // API: 上阵狗
  app.post("/api/pet/deploy", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    const { dogTypeId } = req.body || {};
    try {
      const data = await provider.deployDog(accountId, dogTypeId);
      res.json({ ok: true, data });
    } catch (error) {
      adminLogger.error("上阵狗失败", { error: error.message });
      sendProviderError(res, error);
    }
  });

  // API: 召回狗
  app.post("/api/pet/recall", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    try {
      const data = await provider.withdrawDog(accountId);
      res.json({ ok: true, data });
    } catch (error) {
      adminLogger.error("召回狗失败", { error: error.message });
      sendProviderError(res, error);
    }
  });

  // API: 狗粮列表
  app.get("/api/pet/food-list", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    try {
      const data = await provider.getDogFoodList(accountId);
      res.json({ ok: true, data });
    } catch (error) {
      adminLogger.error("获取狗粮列表失败", { error: error.message });
      sendProviderError(res, error);
    }
  });

  // API: 喂食
  app.post("/api/pet/feed", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    const { itemId, count } = req.body || {};
    try {
      const data = await provider.feedDog(accountId, itemId, count || 1);
      res.json({ ok: true, data });
    } catch (error) {
      adminLogger.error("喂食失败", { error: error.message });
      sendProviderError(res, error);
    }
  });

  // API: 守护日志
  app.get("/api/pet/guard-logs", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    const page = Number.parseInt(req.query.page, 10) || 1;
    const pageSize = Number.parseInt(req.query.pageSize, 10) || 10;
    try {
      const data = await provider.getGuardLogs(accountId, page, pageSize);
      res.json({ ok: true, data });
    } catch (error) {
      adminLogger.error("获取守护日志失败", { error: error.message });
      sendProviderError(res, error);
    }
  });

  // API: 护主奖励状态
  app.get("/api/pet/rewards", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    try {
      const data = await provider.getGuardReward(accountId);
      res.json({ ok: true, data });
    } catch (error) {
      adminLogger.error("获取护主奖励失败", { error: error.message });
      sendProviderError(res, error);
    }
  });

  // API: 领取护主奖励
  app.post("/api/pet/rewards/claim", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    try {
      const data = await provider.claimGuardReward(accountId);
      res.json({ ok: true, data });
    } catch (error) {
      adminLogger.error("领取护主奖励失败", { error: error.message });
      sendProviderError(res, error);
    }
  });

  // API: 临时诊断 - 原始 RPC
  app.post("/api/pet/raw", async (req, res) => {
    const accountId = getAuthorizedAccountId({
      req,
      res,
      getAccountIdFromRequest,
      canAccessAccount,
    });
    if (!accountId) return;

    try {
      const { service, method, body } = req.body || {};
      const rawBody = body ? Buffer.from(body, "base64") : Buffer.from([]);
      const data = await provider.rawRpc(accountId, service, method, rawBody);
      res.json({ ok: true, data });
    } catch (error) {
      res.json({ ok: false, error: error.message });
    }
  });
}

module.exports = { registerAdminPetRoutes };
