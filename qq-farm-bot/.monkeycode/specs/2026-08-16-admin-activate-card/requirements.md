# Requirements Document

# 管理员激活卡密

## Introduction

设置界面的"用户管理" tab 当前提供设备协议、修改密码、离线提醒等个人设置。本功能在"用户管理"标题旁新增"激活卡密"入口，管理员可为指定用户激活卡密（复用现有卡密续费逻辑），延长用户有效期、增加账号额度或激活极速务农权限。

项目已存在卡密激活链路：`renewUser(username, cardCode)`（`user-store.js`）与管理员续费接口 `POST /api/admin/users/:username/renew`。本功能在前端设置界面提供入口，后端复用现有接口能力。

## Glossary

- **卡密**: 系统生成的激活凭证（`cards.json`），类型包含 time（时间卡）、quota（额度卡）、turbo（极速务农卡）。
- **激活卡密**: 为指定用户消耗一张卡密，更新该用户的到期时间、账号额度或极速务农权限。
- **用户管理界面**: 设置 → 用户管理（`UserSettingsTab.vue`），显示设备协议、修改密码、离线提醒等设置。

## Requirements

### Requirement 1: 激活入口

**User Story:** AS 管理员, I want 在用户管理界面看到激活卡密入口, so that 可直接为指定用户激活卡密。

#### Acceptance Criteria

1. WHEN 管理员查看设置 → 用户管理界面, THE 系统 SHALL 在"用户管理"标题旁显示"激活卡密"按钮。
2. WHEN 普通用户查看用户管理界面, THE 系统 SHALL 隐藏"激活卡密"按钮（仅管理员/超级管理员可见）。

### Requirement 2: 激活表单

**User Story:** AS 管理员, I want 输入用户名与卡密完成激活, so that 无需进入后台即可续费用户。

#### Acceptance Criteria

1. WHEN 管理员点击"激活卡密"按钮, THE 系统 SHALL 显示包含用户名与卡密的输入表单。
2. WHEN 管理员提交表单, THE 系统 SHALL 校验用户名与卡密非空。

### Requirement 3: 激活执行

**User Story:** AS 管理员, I want 激活卡密生效, so that 用户时长/额度/极速务农权限得到更新。

#### Acceptance Criteria

1. WHEN 管理员确认激活, THE 系统 SHALL 调用管理员续费接口为指定用户激活卡密。
2. WHEN 卡密不存在、已禁用或已被使用, THE 系统 SHALL 返回对应错误提示。
3. WHEN 激活成功, THE 系统 SHALL 提示成功并展示更新后的时长/额度信息。

### Requirement 4: 权限控制

**User Story:** AS 系统, I want 仅允许管理员激活卡密, so that 避免越权操作。

#### Acceptance Criteria

1. WHEN 非管理员调用激活接口, THE 系统 SHALL 返回 403 禁止访问。
