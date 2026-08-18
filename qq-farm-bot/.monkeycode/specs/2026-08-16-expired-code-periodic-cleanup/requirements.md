# Requirements Document

# 失效 code 定期清理

## Introduction

管理员的账号管理界面（设置 → 账号管理）当前提供"一键清理"按钮，用于删除已停止的账号。本功能在"一键清理"旁新增"清理失效 code"，允许管理员设置**保留时限**与**自动定期执行间隔**，系统据此定期清理微信自动刷新 code 失效的账号，并支持手动立即执行。

项目中"失效 code"指：启用微信自动刷新（有 `wxid`）的账号，其登录 code 无法刷新或长期未成功刷新。判定依据为 `auto_code_refresh_failed` 记录、最近成功刷新时间与保留时限的比较。

定期清理除失效 code 的微信账号外，同时清理**已停止运行且未绑定微信自动刷新的 QQ 端账号**（即无 `wxid`/`openId`/`yybOpenid` 等微信刷新标识、且 worker 当前未运行的账号）。

## Glossary

- **账号**: QQ/微信农场自动化工具中存储的登录账号（`store.getAccounts()` 返回，含 `id`、`code`、`wxid` 字段）。
- **微信自动刷新 code**: 通过 `wxid` 从第三方代理换取农场登录 `code` 的机制（`auto-code-refresh.js`）。
- **失效 code**: 满足以下任一条件的账号登录 code：
  1. 账号存在 `wxid` 但 `code` 为空；
  2. 距最近一次成功刷新时间超过保留时限（管理员可配置）；
  3. 自动刷新连续失败次数超过阈值（管理员可配置）。
- **保留时限**: 管理员设定的允许 code 失效的最大时长（默认 7 天）。
- **清理**: 删除判定为失效 code 的账号记录。
- **QQ 端账号**: 未绑定微信自动刷新标识（无 `wxid`/`openId`/`yybOpenid`）的账号，通过 QQ 扫码等方式登录。
- **已停止的 QQ 端账号**: QQ 端账号中 worker 当前未运行的账号，定期清理时将其纳入清理范围。

## Requirements

### Requirement 1: 清理入口

**User Story:** AS 管理员, I want 在账号管理界面看到"清理失效 code"入口, so that 无需进入后台即可维护失效 code 的账号。

#### Acceptance Criteria

1. WHEN 管理员查看设置 → 账号管理界面, THE 系统 SHALL 在"一键清理"按钮旁显示"清理失效 code"按钮。
2. WHEN 普通用户查看账号管理界面, THE 系统 SHALL 隐藏"清理失效 code"按钮（仅管理员/超级管理员可见）。

### Requirement 2: 配置保留时限与自动间隔

**User Story:** AS 管理员, I want 设置保留时限与自动定期执行间隔, so that 清理策略符合运维要求。

#### Acceptance Criteria

1. WHEN 管理员点击"清理失效 code"按钮, THE 系统 SHALL 显示保留时限（默认 7 天）、连续失败阈值（默认 3 次）与自动清理间隔（默认关闭）配置项。
2. WHEN 管理员保存配置, THE 系统 SHALL 持久化配置并应用新的自动清理间隔。
3. WHILE 自动清理间隔已启用, THE 系统 SHALL 按设定间隔周期执行清理任务。

### Requirement 3: 失效判定

**User Story:** AS 系统, I want 依据明确规则判定失效 code, so that 清理对象准确。

#### Acceptance Criteria

1. WHEN 执行清理, THE 系统 SHALL 将存在 `wxid` 且 `code` 为空的账号判定为失效。
2. WHEN 执行清理, THE 系统 SHALL 将距最近成功刷新时间超过保留时限的账号判定为失效。
3. WHEN 执行清理, THE 系统 SHALL 将自动刷新连续失败次数超过阈值的账号判定为失效。
4. WHEN 账号无微信刷新标识（`wxid`/`openId`/`yybOpenid`）且已停止运行, THE 系统 SHALL 将其判定为失效并纳入清理。
5. WHEN 账号无微信刷新标识但仍在运行, THE 系统 SHALL 不将其纳入清理范围。

### Requirement 4: 清理执行

**User Story:** AS 管理员, I want 手动或自动执行清理, so that 失效 code 账号可被批量移除。

#### Acceptance Criteria

1. WHEN 管理员确认手动清理, THE 系统 SHALL 立即执行清理并删除全部失效 code 账号。
2. WHEN 自动清理任务触发, THE 系统 SHALL 执行清理并记录执行日志。
3. WHEN 清理执行完成, THE 系统 SHALL 返回被清理账号数量与明细。

### Requirement 5: 结果反馈

**User Story:** AS 管理员, I want 看到清理结果, so that 了解清理影响。

#### Acceptance Criteria

1. WHEN 手动清理完成, THE 系统 SHALL 提示清理数量。
2. WHEN 清理涉及正在运行的账号, THE 系统 SHALL 先停止对应 worker 再删除账号。
