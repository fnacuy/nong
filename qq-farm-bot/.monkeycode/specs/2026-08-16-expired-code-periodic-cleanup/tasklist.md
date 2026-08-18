# Task List

## 功能一：失效 code 定期清理

- [ ] 1.1 后端：auto-code-refresh.js 在刷新成功/失败时更新账号 `lastCodeRefreshAt` 与 `codeRefreshFailCount` 字段
- [ ] 1.2 后端：store.js 新增 `codeCleanup` 配置读写（getCodeCleanupConfig / setCodeCleanupConfig）
- [ ] 1.3 后端：新增 `core/src/runtime/expired-code-cleaner.js` 清理服务（判定 + 执行 + 定时任务）
- [ ] 1.4 后端：admin-account-routes.js 新增配置 GET/POST 与立即清理 POST 接口
- [ ] 1.5 后端：runtime-engine.js 挂载清理服务并支持配置变更重建定时任务
- [ ] 1.6 后端：新增失效判定单元测试
- [ ] 1.7 前端：useAccountSettings.ts 新增配置加载/保存/立即清理方法
- [ ] 1.8 前端：AccountSettingsTab.vue 新增"清理失效 code"按钮与配置弹窗（仅管理员）
- [ ] 1.9 前端：Settings.vue 接线传参与事件处理

## 功能二：管理员激活卡密

- [ ] 2.1 前端：UserSettingsTab.vue 新增"激活卡密"按钮与弹窗（仅管理员）
- [ ] 2.2 前端：Settings.vue 传入 isAdmin 并处理激活事件
