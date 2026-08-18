/**
 * 宠物狗服务
 *
 * 功能：
 * - 获取狗狗信息（DogService.GetDogInfo）
 * - 上阵/召回狗狗（DogService.DeployDog / WithdrawDog，抓包确认）
 * - 资本模式：农作物成熟前自动上阵选中狗狗守护，收获后延迟收回
 */
const { sendMsgAsync, getUserState, isConnected } = require('../utils/network');
const { types } = require('../utils/proto');
const { toNum, toLong, toTimeSec, getServerTimeSec, log, logWarn } = require('../utils/utils');
const { PlantPhase } = require('../config/config');
const { getCurrentPhase } = require('./farm-land-analyzer');
const { getAutomation, getPremiumActive } = require('../models/store');
const { createModuleLogger } = require('./logger');

const dogLogger = createModuleLogger('dog');

/** 资本模式可选狗狗（ID -> 名称/守护概率） */
const CAPITAL_MODE_DOGS = {
    90001: { name: '田园犬', guardRate: 10 },
    90002: { name: '牧羊犬', guardRate: 30 },
    90003: { name: '斑点狗', guardRate: 50 },
    90011: { name: '柯基', guardRate: 50 },
    90021: { name: '护主犬', guardRate: 50 },
};

/** 收获完成后延迟收狗秒数 */
const CAPITAL_MODE_RECALL_DELAY_MS = 5000;

// ─── 资本模式运行状态（worker 单账号，模块级即可） ───

let capitalDogDeployedId = 0;
let capitalDogRecallTimer = null;
let capitalDogDeploying = false;

// ─── 底层协议 ───

/**
 * 获取当前账号的狗狗信息。
 * @returns {Promise<{ok:boolean, dogs:Array, coin:number, protectTime:number, foods:Array, error?:string}>}
 */
async function getDogInfo() {
    const state = getUserState();
    const connected = !!(state && isConnected());
    const base = { ok: true, dogs: [], coin: 0, protectTime: 0, foods: [] };
    if (!connected) {
        return { ...base, ok: false, error: '当前账号未在线' };
    }

    try {
        const hostGid = toNum(state.gid) || 0;
        const payload = types.GetDogInfoRequest.encode(
            types.GetDogInfoRequest.create({ host_gid: toLong(hostGid) })
        ).finish();
        const { body } = await sendMsgAsync('gamepb.dogpb.DogService', 'GetDogInfo', payload);
        const reply = types.GetDogInfoReply.decode(body);
        return {
            ...base,
            dogs: (reply.dogs || []).map(dog => ({
                id: toNum(dog.id),
                expireTime: toNum(dog.expire_time),
                status: toNum(dog.status),
                level: toNum(dog.level),
                active: toNum(dog.active),
            })),
            coin: toNum(reply.coin),
            protectTime: toNum(reply.protect_time),
            foods: (reply.foods || []).map(food => ({
                id: toNum(food.id),
                duration: toNum(food.duration),
                count: toNum(food.count),
            })),
        };
    } catch (err) {
        return { ...base, ok: false, error: err?.message || '获取狗狗信息失败' };
    }
}

/**
 * 上阵狗狗（单狗部署，部署新狗会自动替换当前部署的狗）。
 * @param {number} dogId - 狗狗 ID
 */
async function deployDog(dogId) {
    const state = getUserState();
    if (!state || !isConnected()) {
        return { ok: false, error: '当前账号未在线' };
    }

    const id = toNum(dogId);
    if (id <= 0) {
        return { ok: false, error: '缺少有效的狗狗 ID' };
    }

    try {
        const payload = types.DeployDogRequest.encode(types.DeployDogRequest.create({
            dog_id: toLong(id),
        })).finish();
        const { body } = await sendMsgAsync('gamepb.dogpb.DogService', 'DeployDog', payload);
        const reply = types.DeployDogReply.decode(body);
        return {
            ok: true,
            dogId: toNum(reply.dog_id) || id,
            prevDogId: toNum(reply.prev_dog_id),
        };
    } catch (err) {
        return { ok: false, error: err?.message || '上阵狗狗失败' };
    }
}

/**
 * 召回狗狗（撤回当前部署的狗）。
 * @param {number} dogId - 期望撤回的狗狗 ID（服务器总是撤回当前部署的狗）
 */
async function withdrawDog(dogId) {
    const state = getUserState();
    if (!state || !isConnected()) {
        return { ok: false, error: '当前账号未在线' };
    }

    const id = toNum(dogId) || 0;
    try {
        const payload = types.WithdrawDogRequest.encode(types.WithdrawDogRequest.create({
            dog_id: toLong(id),
        })).finish();
        const { body } = await sendMsgAsync('gamepb.dogpb.DogService', 'WithdrawDog', payload);
        const reply = types.WithdrawDogReply.decode(body);
        return { ok: true, dogId: toNum(reply.dog_id) || id };
    } catch (err) {
        return { ok: false, error: err?.message || '召回狗狗失败' };
    }
}

/**
 * 上阵 / 召回狗狗（资本模式统一入口）。
 * @param {number} dogId - 狗狗 ID
 * @param {boolean} active - true 上阵，false 召回
 */
async function setDogActive(dogId, active) {
    return active ? deployDog(dogId) : withdrawDog(dogId);
}

// ─── 资本模式 ───

function getCapitalModeConfig() {
    const auto = getAutomation() || {};
    return {
        enabled: auto.capital_mode === true,
        guardSeconds: Math.max(5, Math.min(300, Number(auto.capital_mode_guard_seconds) || 10)),
        dogId: Number(auto.capital_mode_dog_id) || 0,
    };
}

function getCapitalModeDogList() {
    return Object.entries(CAPITAL_MODE_DOGS).map(([id, info]) => ({
        id: Number(id),
        name: info.name,
        guardRate: info.guardRate,
    }));
}

function isCapitalDogDeployed() {
    return capitalDogDeployedId > 0;
}

function getCapitalDogDeployedId() {
    return capitalDogDeployedId;
}

function clearCapitalDogRecallTimer() {
    if (capitalDogRecallTimer) {
        clearTimeout(capitalDogRecallTimer);
        capitalDogRecallTimer = null;
    }
}

/** 召回资本模式狗狗（立即） */
async function recallCapitalDog() {
    const dogId = capitalDogDeployedId;
    if (dogId <= 0) return { ok: true, alreadyRecall: true };
    clearCapitalDogRecallTimer();
    capitalDogDeployedId = 0;
    const result = await setDogActive(dogId, false);
    if (result.ok) {
        log('资本模式', `已召回狗狗 #${dogId}`, { module: 'dog', event: '资本模式收狗', result: 'ok', dogId });
    } else {
        logWarn('资本模式', `召回狗狗 #${dogId} 失败: ${result.error}`, { module: 'dog', event: '资本模式收狗', result: 'error', dogId });
    }
    return result;
}

/** 上阵资本模式狗狗 */
async function deployCapitalDog(dogId) {
    if (!getPremiumActive()) {
        logWarn('资本模式', '未激活高级功能权限，拒绝上阵狗狗', { module: 'dog', event: '资本模式放狗', result: 'no_premium' });
        return { ok: false, error: '未激活高级功能权限' };
    }
    if (capitalDogDeploying) return { ok: false, error: '正在上阵狗狗' };
    capitalDogDeploying = true;
    try {
        const result = await setDogActive(dogId, true);
        if (result.ok) {
            capitalDogDeployedId = dogId;
            dogLogger.info('资本模式放狗成功', { event: 'capital_mode_deploy', dogId });
            log('资本模式', `已上阵狗狗 #${dogId} 进行守护`, { module: 'dog', event: '资本模式放狗', result: 'ok', dogId });
        } else {
            logWarn('资本模式', `上阵狗狗 #${dogId} 失败: ${result.error}`, { module: 'dog', event: '资本模式放狗', result: 'error', dogId });
        }
        return result;
    } finally {
        capitalDogDeploying = false;
    }
}

/**
 * 收获完成后调用：延迟 CAPITAL_MODE_RECALL_DELAY_MS 后召回狗狗。
 */
function scheduleCapitalDogRecall() {
    if (capitalDogDeployedId <= 0) return;
    clearCapitalDogRecallTimer();
    capitalDogRecallTimer = setTimeout(() => {
        capitalDogRecallTimer = null;
        recallCapitalDog().catch(err => {
            logWarn('资本模式', `延迟收狗失败: ${err.message}`, { module: 'dog', event: '资本模式收狗', result: 'error' });
        });
    }, CAPITAL_MODE_RECALL_DELAY_MS);
}

/**
 * 巡田时调用：检查生长中的地块，若距成熟时间 <= 放狗秒数则上阵选中狗狗。
 * @param {Array} lands - 原始地块列表（land.plant.phases 结构，来自 getAllLands）
 */
async function checkCapitalModeOnFarm(lands) {
    if (!getPremiumActive()) {
        if (capitalDogDeployedId > 0) {
            recallCapitalDog().catch(() => { });
        }
        return { ok: true, skipped: true };
    }
    const config = getCapitalModeConfig();
    if (!config.enabled || config.dogId <= 0) return { ok: true, skipped: true };
    if (capitalDogDeployedId > 0 || capitalDogDeploying) return { ok: true, skipped: true };

    const list = Array.isArray(lands) ? lands : [];
    const serverTime = getServerTimeSec();
    let hasAlmostMature = false;

    for (const land of list) {
        if (!land || !land.unlocked) continue;
        const plant = land.plant;
        if (!plant || !Array.isArray(plant.phases) || plant.phases.length === 0) continue;

        const currentPhase = getCurrentPhase(plant.phases, false, '', plant.id);
        if (!currentPhase) continue;
        if (toNum(currentPhase.phase) === PlantPhase.DEAD) continue;
        if (toNum(currentPhase.phase) === PlantPhase.MATURE) continue;

        const maturePhase = plant.phases
            .filter(p => p && toTimeSec(p.begin_time) > 0)
            .sort((left, right) => toTimeSec(right.begin_time) - toTimeSec(left.begin_time))[0];
        if (!maturePhase) continue;

        const matureTime = toTimeSec(maturePhase.begin_time);
        if (matureTime <= 0) continue;

        const remaining = matureTime - serverTime;
        if (remaining >= 0 && remaining <= config.guardSeconds) {
            hasAlmostMature = true;
            break;
        }
    }

    if (!hasAlmostMature) return { ok: true, skipped: true };

    return deployCapitalDog(config.dogId);
}

/** 账号停止/下线时重置资本模式状态 */
function resetCapitalModeState() {
    clearCapitalDogRecallTimer();
    capitalDogDeployedId = 0;
    capitalDogDeploying = false;
}

module.exports = {
    getDogInfo,
    setDogActive,
    deployDog,
    withdrawDog,
    getCapitalModeConfig,
    getCapitalModeDogList,
    isCapitalDogDeployed,
    getCapitalDogDeployedId,
    checkCapitalModeOnFarm,
    scheduleCapitalDogRecall,
    recallCapitalDog,
    resetCapitalModeState,
};
