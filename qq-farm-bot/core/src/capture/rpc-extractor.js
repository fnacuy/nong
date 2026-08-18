/**
 * RPC 方法名提取器
 *
 * 在中间人链路上解析 WebSocket 中的 `gatepb.Message`，提取
 * `meta.service_name` / `meta.method_name` / `meta.message_type`。
 *
 * 客户端→服务器方向的 body 被 TSDK 加密，但 meta 始终是明文，
 * 因此抓包时仍能拿到完整的方法名（如 gamepb.dogpb.DogService.AddFood）。
 * 服务器→客户端方向的 body 为明文 protobuf（见 friend-extractor）。
 */

const path = require('node:path');
const protobuf = require('protobufjs');

function getProtoPaths() {
  return [path.join(__dirname, '../proto/game.proto')];
}

/**
 * 创建 RPC 提取器（异步加载 proto）
 * @returns {Promise<{ handleMessage: (buffer: Buffer) => {service: string, method: string, messageType: number} | null }>}
 */
async function createRpcExtractor() {
  const root = new protobuf.Root();
  await root.load(getProtoPaths(), { keepCase: true });
  const GateMessage = root.lookupType('gatepb.Message');

  /**
   * 解析一条二进制 WebSocket 消息，返回 RPC 元信息。
   * 非 gatepb.Message 或缺少 meta 时返回 null。
   * @param {Buffer} buffer
   * @returns {{ service: string, method: string, messageType: number } | null}
   */
  function handleMessage(buffer) {
    if (!buffer || buffer.length === 0) return null;
    let message;
    try {
      message = GateMessage.decode(buffer);
    } catch {
      return null;
    }
    const meta = message && message.meta;
    if (!meta) return null;
    const service = String(meta.service_name || '');
    const method = String(meta.method_name || '');
    if (!service || !method) return null;
    return {
      service,
      method,
      messageType: Number(meta.message_type || 0),
    };
  }

  return { handleMessage };
}

module.exports = {
  createRpcExtractor,
  getProtoPaths,
};
