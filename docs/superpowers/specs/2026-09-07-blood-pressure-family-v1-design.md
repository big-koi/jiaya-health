# 家庭血压小程序 V1 设计规格

**日期：** 2026-09-07  
**状态：** 已确认  
**产品定位：** 家庭健康型血压记录小程序  
**目标用户：** 普通家庭成员 + 长辈用户  
**核心模式：** 本人记录 + 家人代录 + 家庭共享查看  
**V1 设备策略：** 蓝牙能力预留，不接设备  
**V1 提醒策略：** 固定时间测量提醒  
**V1 健康提示策略：** 基础关注提示，不做诊断  

---

## 1. 产品目标

V1 只解决一个核心问题：

> 让一个家庭中的多名成员，能够方便地记录、查看和关注彼此的血压数据。

成功标准：

1. 用户能创建家庭并添加至少 1 名未注册的小程序家庭成员。
2. 用户能为自己或有权限的家庭成员记录血压。
3. 用户能查看某个家庭成员最近一次读数、历史记录、7/30 天趋势。
4. 系统能对一次记录生成“无特殊提示 / 建议关注 / 建议复测”级别提示。
5. 用户能为家庭成员配置每天固定测量时间。
6. 普通模式和长辈模式共享同一业务数据，只替换展示层。
7. 权限校验必须在后端完成，不能仅依赖前端隐藏按钮。

---

## 2. V1 明确不做

- AI 医生
- 医疗诊断
- 在线问诊
- 医院 HIS/EMR 对接
- 药品推荐
- 蓝牙血压计接入
- Apple Health / 微信运动
- 血糖 / 体重 / 心电等其他健康指标
- 商城
- 微服务拆分

---

## 3. 核心领域模型

### 3.1 User 与 HealthProfile 分离

`User` 代表登录小程序的微信账号。

`HealthProfile` 代表一个真实的人及其健康档案。

两者不能合并。

示例：

```text
User: 小明
  └── Family: 我们家
      ├── HealthProfile: 小明（linked_user_id = 小明）
      ├── HealthProfile: 爸爸（linked_user_id = null）
      └── HealthProfile: 妈妈（linked_user_id = null）
```

爸爸即使没有注册小程序，也可以被家人代为记录。未来爸爸注册后，可将账号绑定到现有 `HealthProfile`。

---

## 4. 核心实体

### User

- id
- openid
- unionid
- nickname
- avatar
- phone
- status
- created_at
- updated_at

### Family

- id
- name
- owner_user_id
- avatar
- created_at
- updated_at

### FamilyMembership

- id
- family_id
- user_id
- role: owner | manager | member
- status
- created_at

### HealthProfile

- id
- family_id
- linked_user_id nullable
- name
- avatar
- gender nullable
- birthday nullable
- relationship nullable
- elder_mode
- status
- created_by
- created_at
- updated_at

### ProfilePermission

- id
- profile_id
- user_id
- can_view
- can_record
- can_manage_reminder
- can_manage_profile
- can_receive_attention
- created_at
- updated_at

### BloodPressureRecord

- id
- profile_id
- systolic
- diastolic
- pulse nullable
- measured_at
- source: self | family | device
- recorded_by_user_id
- measurement_context nullable
- note nullable
- attention_level: normal | attention | recheck
- rule_version
- device_id nullable
- created_at
- updated_at
- deleted_at nullable

### MeasurementReminder

- id
- profile_id
- created_by_user_id
- title
- time_of_day
- repeat_type
- weekdays nullable
- enabled
- late_remind_minutes nullable
- created_at
- updated_at

### AttentionEvent

- id
- profile_id
- record_id
- type
- level
- status: pending | acknowledged | resolved
- created_at
- acknowledged_at nullable
- resolved_at nullable

### AuditLog

- id
- actor_user_id
- family_id nullable
- profile_id nullable
- action
- target_type
- target_id
- metadata nullable
- created_at

### DeviceBinding（V2 预留）

- id
- profile_id
- device_type
- vendor
- external_device_id
- status
- created_at

---

## 5. 权限规则

所有健康档案读取与修改接口必须同时满足：

1. 用户已登录。
2. 用户属于对应家庭或具备显式档案权限。
3. 对应动作权限为 true。

权限语义：

| 权限 | 作用 |
|---|---|
| can_view | 查看档案与血压数据 |
| can_record | 新增/修改血压记录 |
| can_manage_reminder | 管理测量提醒 |
| can_manage_profile | 修改健康档案 |
| can_receive_attention | 接收该成员的关注提示 |

Family role 只用于家庭级管理，不替代 ProfilePermission。

---

## 6. 血压提示规则

V1 不输出疾病诊断。

输入：

```ts
type AttentionRuleInput = {
  systolic: number
  diastolic: number
  pulse?: number
  measuredAt: string
}
```

输出：

```ts
type AttentionRuleResult = {
  level: 'normal' | 'attention' | 'recheck'
  messageCode: string
  requireRecheck: boolean
  ruleVersion: string
}
```

要求：

- 阈值统一由服务端规则模块维护。
- 前端不得自行复制判断逻辑。
- `BloodPressureRecord` 保存当时计算出的 `attention_level` 与 `rule_version`。
- 文案使用 `messageCode` 映射，规则与 UI 文案分离。
- 单次读数提示必须带“不能用于诊断”的产品免责声明。
- 上线前由产品方根据目标市场和采用的医学指南确认正式阈值。

---

## 7. 首页 Dashboard

首页使用聚合接口，避免前端同时请求多套数据。

```http
GET /api/v1/dashboard?profileId=<profileId>
```

响应包含：

```ts
type DashboardResponse = {
  profile: HealthProfileSummary
  latestRecord: BloodPressureRecordDTO | null
  todayTasks: MeasurementTaskDTO[]
  sevenDaySummary: BloodPressureSummaryDTO
  attention: AttentionEventDTO | null
}
```

---

## 8. 小程序信息架构

底部 Tab：

1. 首页
2. 记录
3. 家庭
4. 我的

页面：

```text
pages/
├── login
├── home
├── record-create
├── record-result
├── record-history
├── record-detail
├── record-trend
├── family
├── family-profile
├── family-profile-add
├── family-permission
├── reminder
├── reminder-edit
├── mine
├── elder-mode
└── settings
```

---

## 9. 普通模式与长辈模式

两种模式共享：

- API
- 鉴权
- 数据模型
- Store
- 业务逻辑
- 路由

只替换展示层。

长辈模式要求：

- 一屏一个主要动作
- 关键数字 40–48px
- 标题 22–24px
- 正文不低于 18px
- 大按钮
- 高对比度
- 减少次要入口
- 首页突出“最近血压 / 今日任务 / 记录血压”

---

## 10. 技术架构

### Monorepo

```text
blood-pressure-family/
├── apps/
│   ├── miniapp/
│   └── server/
├── packages/
│   ├── contracts/
│   ├── constants/
│   └── utils/
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
└── package.json
```

### V1 技术栈

- Node.js 24 LTS
- pnpm workspace
- TypeScript strict
- Taro 4.2.1
- React
- Zustand：客户端全局状态
- NestJS 11.2.x
- PostgreSQL
- Prisma ORM 7
- REST API
- JWT Access Token
- Vitest/Jest + Supertest（按项目脚手架兼容选择）
- ESLint + Prettier

### 后端模块

```text
AuthModule
UserModule
FamilyModule
ProfileModule
PermissionModule
BloodPressureModule
AnalysisModule
AttentionModule
ReminderModule
NotificationModule
AuditModule
DeviceModule (V2 placeholder only)
```

V1 使用模块化单体，不拆微服务。

---

## 11. 关键数据流

### 家人为爸爸记录血压

```text
User 登录
  ↓
选择爸爸 HealthProfile
  ↓
服务端校验 can_record
  ↓
提交读数
  ↓
BloodPressureService 验证数据
  ↓
AttentionRuleEngine 计算提示
  ↓
保存 BloodPressureRecord
  ↓
需要时创建 AttentionEvent
  ↓
写 AuditLog
  ↓
返回记录结果
  ↓
首页/趋势缓存失效并刷新
```

---

## 12. 错误处理

统一错误结构：

```ts
type ApiError = {
  code: string
  message: string
  requestId: string
  details?: Record<string, unknown>
}
```

核心错误码：

- AUTH_REQUIRED
- TOKEN_EXPIRED
- FAMILY_NOT_FOUND
- PROFILE_NOT_FOUND
- PROFILE_VIEW_FORBIDDEN
- PROFILE_RECORD_FORBIDDEN
- PROFILE_MANAGE_FORBIDDEN
- INVALID_BP_READING
- RECORD_NOT_FOUND
- REMINDER_NOT_FOUND
- DUPLICATE_MEMBERSHIP
- INTERNAL_ERROR

服务端日志不得直接打印完整健康数据。

---

## 13. V1 测试要求

必须覆盖：

- User 与 HealthProfile 分离
- 未绑定账号的 HealthProfile 可被代记录
- 权限不足不能读/写其他档案
- 血压记录 CRUD
- 软删除记录不进入趋势统计
- AttentionRuleEngine 输出稳定且带 ruleVersion
- Dashboard 聚合结果
- 提醒规则
- 长辈模式与普通模式使用同一数据
- API 鉴权与错误码
- 关键业务 E2E

---

## 14. V1 完成定义

V1 可上线的最低完成条件：

1. 微信登录闭环完成。
2. 创建家庭与健康档案完成。
3. 权限校验完成。
4. 血压记录与历史记录完成。
5. 首页 Dashboard 完成。
6. 7 天 / 30 天趋势完成。
7. 关注提示规则完成。
8. 固定测量提醒完成。
9. 普通模式 / 长辈模式完成。
10. 隐私、错误处理、基础审计完成。
11. 核心 E2E 测试通过。
12. 不包含任何诊断式文案。
