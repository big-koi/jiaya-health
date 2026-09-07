# 家庭血压小程序 V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个支持本人记录、家人代录、家庭共享、基础关注提示、固定测量提醒和长辈模式的微信血压记录小程序 V1。

**Architecture:** 使用 pnpm Monorepo。前端采用 Taro + React + TypeScript；后端采用 NestJS 模块化单体；PostgreSQL + Prisma 管理数据；User 与 HealthProfile 分离；所有档案操作由后端 ProfilePermission 守卫校验；血压原始记录、关注规则和展示文案分离。

**Tech Stack:** Node.js 24 LTS, pnpm workspace, TypeScript strict, Taro 4.2.1, React, Zustand, NestJS 11.2.x, PostgreSQL, Prisma ORM 7, REST, JWT, Vitest/Jest, Supertest.

**Spec:** `docs/superpowers/specs/2026-09-07-blood-pressure-family-v1-design.md`

## Global Constraints

- V1 不接蓝牙设备，只保留 `source=device` 与 Device 模块边界。
- V1 不做医疗诊断，只输出 `normal | attention | recheck` 产品提示。
- User 与 HealthProfile 必须分离。
- 所有 Profile 数据权限必须在后端校验。
- 阈值规则只存在于服务端 AttentionRuleEngine。
- 所有 TypeScript 项目启用 strict。
- API 前缀固定为 `/api/v1`。
- 所有健康数据日志禁止直接输出完整值。
- 删除血压记录使用软删除。
- 普通模式与长辈模式共享同一业务状态和接口。
- 每个任务必须先写失败测试，再实现，再跑测试，再提交。

---

# 0. 文件结构锁定

```text
blood-pressure-family/
├── apps/
│   ├── miniapp/
│   │   ├── src/
│   │   │   ├── app.config.ts
│   │   │   ├── app.tsx
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── family/
│   │   │   │   ├── profile/
│   │   │   │   ├── blood-pressure/
│   │   │   │   ├── reminder/
│   │   │   │   └── attention/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   │   └── api/
│   │   │   ├── store/
│   │   │   └── styles/
│   │   └── tests/
│   │
│   └── server/
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── common/
│       │   │   ├── auth/
│       │   │   ├── errors/
│       │   │   └── guards/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── families/
│       │   ├── profiles/
│       │   ├── permissions/
│       │   ├── blood-pressure/
│       │   ├── analysis/
│       │   ├── attention/
│       │   ├── reminders/
│       │   ├── notifications/
│       │   ├── audit/
│       │   └── prisma/
│       └── test/
│
├── packages/
│   ├── contracts/
│   │   └── src/
│   ├── constants/
│   │   └── src/
│   └── utils/
│       └── src/
│
└── docs/
    └── superpowers/
        ├── specs/
        └── plans/
```

---

# Task 1: Monorepo 与基础工程

**Deliverable:** miniapp、server、共享包都能独立编译；根目录一条命令可执行 lint/typecheck/test。

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.editorconfig`
- Create: `.gitignore`
- Create: `apps/miniapp/*`
- Create: `apps/server/*`
- Create: `packages/contracts/*`
- Create: `packages/constants/*`
- Create: `packages/utils/*`

**Interfaces:**
- Produces: workspace package names `@bp/contracts`, `@bp/constants`, `@bp/utils`
- Produces root commands: `pnpm lint`, `pnpm typecheck`, `pnpm test`

- [ ] **Step 1: 写 workspace smoke test**

在共享包创建一个最小测试，要求 `@bp/contracts` 可被 server 和 miniapp resolve。

- [ ] **Step 2: 运行测试并确认失败**

```bash
pnpm test
```

Expected: workspace/package 尚不存在导致失败。

- [ ] **Step 3: 初始化 pnpm workspace 与两个应用**

约束：

```json
{
  "private": true,
  "packageManager": "pnpm",
  "engines": {
    "node": ">=24"
  }
}
```

Taro 依赖统一锁 4.2.1。NestJS 统一锁 11.2.x。TypeScript strict=true。

- [ ] **Step 4: 增加根命令**

```json
{
  "scripts": {
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test"
  }
}
```

- [ ] **Step 5: 跑全量基础检查**

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: initialize blood pressure monorepo"
```

---

# Task 2: 共享 API Contracts 与错误码

**Deliverable:** 前后端共享稳定的 DTO 类型、枚举和 API 错误码。

**Files:**
- Create: `packages/contracts/src/auth.ts`
- Create: `packages/contracts/src/family.ts`
- Create: `packages/contracts/src/profile.ts`
- Create: `packages/contracts/src/blood-pressure.ts`
- Create: `packages/contracts/src/dashboard.ts`
- Create: `packages/contracts/src/reminder.ts`
- Create: `packages/contracts/src/attention.ts`
- Create: `packages/contracts/src/error.ts`
- Create: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/contracts.spec.ts`

**Interfaces:**
- Produces:
  - `BloodPressureSource = 'self' | 'family' | 'device'`
  - `AttentionLevel = 'normal' | 'attention' | 'recheck'`
  - `ProfilePermissionDTO`
  - `BloodPressureRecordDTO`
  - `DashboardResponse`
  - `ApiError`

- [ ] **Step 1: 写失败的类型测试**

```ts
import type {
  AttentionLevel,
  BloodPressureSource,
  DashboardResponse,
} from './index'

const level: AttentionLevel = 'normal'
const source: BloodPressureSource = 'family'

const dashboard: DashboardResponse = {
  profile: { id: 'p1', name: '爸爸', elderMode: true },
  latestRecord: null,
  todayTasks: [],
  sevenDaySummary: {
    recordCount: 0,
    avgSystolic: null,
    avgDiastolic: null,
    attentionCount: 0,
  },
  attention: null,
}

void [level, source, dashboard]
```

- [ ] **Step 2: typecheck，确认导出缺失**

```bash
pnpm --filter @bp/contracts typecheck
```

Expected: FAIL。

- [ ] **Step 3: 定义共享类型**

至少包含：

```ts
export type AttentionLevel = 'normal' | 'attention' | 'recheck'
export type BloodPressureSource = 'self' | 'family' | 'device'

export type ApiError = {
  code: string
  message: string
  requestId: string
  details?: Record<string, unknown>
}
```

`DashboardResponse` 字段名与 spec 完全一致。

- [ ] **Step 4: typecheck**

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/contracts
git commit -m "feat: add shared api contracts"
```

---

# Task 3: Prisma 数据模型与数据库迁移

**Deliverable:** 创建 V1 核心表、枚举、唯一索引与必要查询索引。

**Files:**
- Create: `apps/server/prisma/schema.prisma`
- Create: `apps/server/src/prisma/prisma.module.ts`
- Create: `apps/server/src/prisma/prisma.service.ts`
- Test: `apps/server/test/prisma-schema.e2e-spec.ts`

**Interfaces:**
- Produces database models:
  `User`, `Family`, `FamilyMembership`, `HealthProfile`,
  `ProfilePermission`, `BloodPressureRecord`,
  `MeasurementReminder`, `AttentionEvent`, `AuditLog`

- [ ] **Step 1: 写数据库集成测试**

测试必须验证：

1. 可以创建 User。
2. 可以创建 `linkedUserId = null` 的 HealthProfile。
3. 同一个用户不能重复加入同一个 Family。
4. BloodPressureRecord 可保存 `source=FAMILY`。
5. `deletedAt` 可为空。

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter server test:e2e -- prisma-schema
```

Expected: FAIL，表不存在。

- [ ] **Step 3: 定义 Prisma enums**

```prisma
enum FamilyRole {
  OWNER
  MANAGER
  MEMBER
}

enum BloodPressureSource {
  SELF
  FAMILY
  DEVICE
}

enum AttentionLevel {
  NORMAL
  ATTENTION
  RECHECK
}

enum AttentionStatus {
  PENDING
  ACKNOWLEDGED
  RESOLVED
}
```

- [ ] **Step 4: 定义核心关系**

关键约束：

```text
FamilyMembership: unique(familyId, userId)
ProfilePermission: unique(profileId, userId)
BloodPressureRecord: index(profileId, measuredAt)
BloodPressureRecord: index(profileId, deletedAt, measuredAt)
MeasurementReminder: index(profileId, enabled)
AttentionEvent: index(profileId, status, createdAt)
```

- [ ] **Step 5: 创建 migration**

```bash
pnpm --filter server prisma migrate dev --name init_v1
```

- [ ] **Step 6: 跑测试**

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/server/prisma apps/server/src/prisma apps/server/test
git commit -m "feat: add v1 database schema"
```

---

# Task 4: API 基础、错误格式与 JWT 鉴权

**Deliverable:** API 前缀、全局校验、统一错误格式、JWT guard、微信登录 service 边界。

**Files:**
- Create: `apps/server/src/common/errors/api-error.filter.ts`
- Create: `apps/server/src/common/auth/current-user.decorator.ts`
- Create: `apps/server/src/common/auth/jwt-auth.guard.ts`
- Create: `apps/server/src/auth/auth.module.ts`
- Create: `apps/server/src/auth/auth.controller.ts`
- Create: `apps/server/src/auth/auth.service.ts`
- Create: `apps/server/src/auth/wechat-session.client.ts`
- Modify: `apps/server/src/main.ts`
- Test: `apps/server/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `ApiError`
- Produces:
  - `POST /api/v1/auth/wechat`
  - `GET /api/v1/users/me`
  - `CurrentUser = { userId: string }`

- [x] **Step 1: 写未登录访问失败测试**

```ts
it('returns 401 with stable error code', async () => {
  const res = await request(app.getHttpServer())
    .get('/api/v1/users/me')
    .expect(401)

  expect(res.body.code).toBe('AUTH_REQUIRED')
  expect(res.body.requestId).toEqual(expect.any(String))
})
```

- [x] **Step 2: 运行并确认失败**

- [x] **Step 3: 配置全局前缀与 ValidationPipe**

```ts
app.setGlobalPrefix('api/v1')
```

全局 ValidationPipe 必须开启 whitelist 和 transform。

- [x] **Step 4: 实现微信 Session Client 抽象**

```ts
export interface WechatSessionClient {
  exchangeCode(code: string): Promise<{
    openid: string
    unionid?: string
  }>
}
```

Controller 不直接调用微信 HTTP API。

- [x] **Step 5: 实现 JWT 生成与 Guard**

Access Token payload 只放必要标识：

```ts
type AccessTokenPayload = {
  sub: string
}
```

- [x] **Step 6: 跑 auth tests**

Expected: PASS。

- [x] **Step 7: Commit**

```bash
git add apps/server/src apps/server/test/auth.e2e-spec.ts
git commit -m "功能：增加 API 与鉴权基础"
```

---

# Task 5: Family + HealthProfile + ProfilePermission 核心闭环

**Deliverable:** 创建家庭、添加无账号成员、获取档案、授权与撤销档案权限。

**Files:**
- Create: `apps/server/src/families/*`
- Create: `apps/server/src/profiles/*`
- Create: `apps/server/src/permissions/*`
- Create: `apps/server/src/common/guards/profile-permission.guard.ts`
- Test: `apps/server/test/family-profile.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `POST /api/v1/families`
  - `GET /api/v1/families`
  - `GET /api/v1/families/:id`
  - `POST /api/v1/profiles`
  - `GET /api/v1/profiles`
  - `GET /api/v1/profiles/:id`
  - `PATCH /api/v1/profiles/:id`
  - `GET /api/v1/profiles/:id/permissions`
  - `PATCH /api/v1/profiles/:id/permissions`

- [ ] **Step 1: 写关键 E2E**

必须覆盖：

```text
owner 创建家庭
owner 添加“爸爸”，linked_user_id = null
owner 自动获得爸爸的全部权限
无权限用户 GET 爸爸档案 => 403 PROFILE_VIEW_FORBIDDEN
有 can_view 无 can_record 用户 => 可读不可写
```

- [ ] **Step 2: 运行确认失败**

- [ ] **Step 3: 实现创建家庭事务**

创建 Family 时同一事务创建 owner 的 FamilyMembership。

- [ ] **Step 4: 实现创建 HealthProfile 事务**

创建档案时，为 creator 自动创建：

```ts
{
  canView: true,
  canRecord: true,
  canManageReminder: true,
  canManageProfile: true,
  canReceiveAttention: true
}
```

- [ ] **Step 5: 实现 ProfilePermissionGuard**

接口调用前按 `profileId` 查询权限。

不得通过“family owner 就直接放行”绕过显式权限，除非产品规则在 service 中明确赋权。

- [ ] **Step 6: 跑 E2E**

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/families apps/server/src/profiles apps/server/src/permissions apps/server/src/common/guards
git commit -m "feat: add family profile and permission model"
```

---

# Task 6: AttentionRuleEngine

**Deliverable:** 独立、可版本化、无 UI 文案耦合的关注规则模块。

**Files:**
- Create: `apps/server/src/attention/attention-rule.types.ts`
- Create: `apps/server/src/attention/attention-rule.engine.ts`
- Create: `apps/server/src/attention/attention-rule.engine.spec.ts`
- Create: `apps/server/src/attention/attention.module.ts`

**Interfaces:**
- Produces:

```ts
export type AttentionRuleInput = {
  systolic: number
  diastolic: number
  pulse?: number
  measuredAt: Date
}

export type AttentionRuleResult = {
  level: 'normal' | 'attention' | 'recheck'
  messageCode: string
  requireRecheck: boolean
  ruleVersion: string
}

export interface AttentionRuleEngine {
  evaluate(input: AttentionRuleInput): AttentionRuleResult
}
```

- [ ] **Step 1: 写边界测试**

正式医学阈值未确认前，使用测试配置注入，不在测试里假定生产阈值：

```ts
const engine = createAttentionRuleEngine({
  version: 'test-v1',
  attentionSystolicMin: 140,
  recheckSystolicMin: 180,
})
```

测试 normal / attention / recheck 三档和 ruleVersion。

- [ ] **Step 2: 确认失败**

- [ ] **Step 3: 实现纯函数规则引擎**

规则模块不能访问数据库、HTTP、Controller 或 UI 文案。

- [ ] **Step 4: 跑 unit tests**

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/attention
git commit -m "feat: add versioned attention rule engine"
```

---

# Task 7: BloodPressure 记录 CRUD

**Deliverable:** 可为自己或有权限的家人记录、查询、编辑和软删除血压。

**Files:**
- Create: `apps/server/src/blood-pressure/dto/create-blood-pressure.dto.ts`
- Create: `apps/server/src/blood-pressure/dto/update-blood-pressure.dto.ts`
- Create: `apps/server/src/blood-pressure/blood-pressure.controller.ts`
- Create: `apps/server/src/blood-pressure/blood-pressure.service.ts`
- Create: `apps/server/src/blood-pressure/blood-pressure.module.ts`
- Test: `apps/server/test/blood-pressure.e2e-spec.ts`

**Interfaces:**
- Consumes: `AttentionRuleEngine`
- Produces:
  - `POST /api/v1/blood-pressure`
  - `GET /api/v1/blood-pressure?profileId=&from=&to=`
  - `GET /api/v1/blood-pressure/:id`
  - `PATCH /api/v1/blood-pressure/:id`
  - `DELETE /api/v1/blood-pressure/:id`

- [ ] **Step 1: 写 create E2E**

输入：

```json
{
  "profileId": "profile-id",
  "systolic": 128,
  "diastolic": 82,
  "pulse": 72,
  "measuredAt": "2026-09-07T08:12:00+08:00",
  "source": "family",
  "measurementContext": {
    "medication": "before"
  },
  "note": ""
}
```

验证：
- `recordedByUserId` 必须来自 JWT，不接受前端指定。
- `attentionLevel` 来自 RuleEngine。
- `ruleVersion` 被持久化。

- [ ] **Step 2: 写权限失败测试**

`canRecord=false` 时 POST 返回 `PROFILE_RECORD_FORBIDDEN`。

- [ ] **Step 3: 写软删除测试**

DELETE 后：
- detail 默认查不到；
- history 默认不出现；
- DB 行仍存在且 deletedAt 非空。

- [ ] **Step 4: 实现 DTO 校验**

至少校验：
- systolic/diastolic/pulse 为整数且在系统允许录入范围内；
- measuredAt 可解析；
- source 只允许 self/family/device；
- V1 API 禁止客户端主动提交 device source，除非内部调用。

- [ ] **Step 5: 实现事务保存**

流程：

```text
permission check
→ validate
→ attention evaluate
→ record create
→ if attention/recheck: attention event create
→ audit log
```

- [ ] **Step 6: 跑 E2E**

Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/blood-pressure apps/server/test/blood-pressure.e2e-spec.ts
git commit -m "feat: add blood pressure recording"
```

---

# Task 8: Analysis + Dashboard 聚合

**Deliverable:** 7/30 天统计和首页聚合接口。

**Files:**
- Create: `apps/server/src/analysis/analysis.service.ts`
- Create: `apps/server/src/analysis/analysis.module.ts`
- Create: `apps/server/src/dashboard/dashboard.controller.ts`
- Create: `apps/server/src/dashboard/dashboard.service.ts`
- Create: `apps/server/src/dashboard/dashboard.module.ts`
- Test: `apps/server/test/dashboard.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `GET /api/v1/blood-pressure/summary?profileId=&range=7d|30d`
  - `GET /api/v1/dashboard?profileId=`

- [ ] **Step 1: 写统计测试**

数据：
- 3 条有效记录
- 1 条 deletedAt 不为空

断言：
- recordCount=3
- 平均值不包含 deleted 记录
- attentionCount 正确

- [ ] **Step 2: 写 Dashboard 测试**

必须返回：

```ts
{
  profile,
  latestRecord,
  todayTasks,
  sevenDaySummary,
  attention
}
```

- [ ] **Step 3: 实现 AnalysisService**

`range=7d|30d` 转换为明确时间范围，不允许前端拼任意 SQL 条件。

- [ ] **Step 4: 实现 DashboardService**

DashboardService 只聚合 service 输出，不复制各领域查询逻辑。

- [ ] **Step 5: 跑测试**

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/analysis apps/server/src/dashboard apps/server/test/dashboard.e2e-spec.ts
git commit -m "feat: add blood pressure analysis dashboard"
```

---

# Task 9: MeasurementReminder

**Deliverable:** 每个 HealthProfile 支持固定时刻每日提醒和首页今日任务状态。

**Files:**
- Create: `apps/server/src/reminders/*`
- Test: `apps/server/test/reminders.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `POST /api/v1/reminders`
  - `GET /api/v1/reminders?profileId=`
  - `PATCH /api/v1/reminders/:id`
  - `DELETE /api/v1/reminders/:id`
  - `ReminderTaskService.getTodayTasks(profileId, date)`

- [ ] **Step 1: 写权限测试**

只有 `canManageReminder=true` 才能修改提醒。

- [ ] **Step 2: 写今日任务测试**

给定：
- 08:00 提醒
- 20:00 提醒
- 当日 08:13 有一条记录

返回：

```ts
[
  { time: '08:00', status: 'completed' },
  { time: '20:00', status: 'pending' }
]
```

V1 可采用“某提醒时间窗口附近存在测量记录则完成”的确定性规则，窗口值作为服务端配置。

- [ ] **Step 3: 实现 CRUD 与 TaskService**

- [ ] **Step 4: 为平台订阅消息定义 adapter**

```ts
export interface ReminderNotificationAdapter {
  sendMeasurementReminder(input: {
    userId: string
    profileId: string
    reminderId: string
  }): Promise<void>
}
```

V1 若未配置平台消息能力，使用 Noop adapter，不影响核心提醒任务。

- [ ] **Step 5: 跑测试**

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/reminders apps/server/test/reminders.e2e-spec.ts
git commit -m "feat: add measurement reminders"
```

---

# Task 10: 小程序 API Client、登录与全局状态

**Deliverable:** 小程序能登录、保存 token、选择家庭与 activeProfile。

**Files:**
- Create: `apps/miniapp/src/services/api/client.ts`
- Create: `apps/miniapp/src/features/auth/auth.service.ts`
- Create: `apps/miniapp/src/store/session.store.ts`
- Create: `apps/miniapp/src/store/active-profile.store.ts`
- Create: `apps/miniapp/src/pages/login/index.tsx`
- Test: corresponding unit tests

**Interfaces:**
- Produces:
  - `apiClient.get/post/patch/delete`
  - `useSessionStore`
  - `useActiveProfileStore`

- [ ] **Step 1: 写 API 401 测试**

401/TOKEN_EXPIRED 时清理 session 并进入登录态。

- [ ] **Step 2: 写 active profile store 测试**

切换 profile 后只改变选择状态，不复制 profile 业务数据到多个 store。

- [ ] **Step 3: 实现 API client**

所有请求统一注入 Authorization。

统一解析 `ApiError`。

- [ ] **Step 4: 实现微信登录 flow**

```text
Taro.login()
→ code
→ POST /auth/wechat
→ accessToken
→ GET /users/me
→ session store
```

- [ ] **Step 5: 跑测试**

- [ ] **Step 6: Commit**

```bash
git add apps/miniapp/src/services apps/miniapp/src/features/auth apps/miniapp/src/store apps/miniapp/src/pages/login
git commit -m "feat: add miniapp auth and api client"
```

---

# Task 11: Family 与 Profile 小程序页面

**Deliverable:** 家庭列表、成员卡片、添加成员、成员详情、成员切换。

**Files:**
- Create: `apps/miniapp/src/features/family/*`
- Create: `apps/miniapp/src/features/profile/*`
- Create: `apps/miniapp/src/pages/family/*`
- Create: `apps/miniapp/src/pages/family-profile/*`
- Create: `apps/miniapp/src/pages/family-profile-add/*`
- Create: `apps/miniapp/src/components/ProfileAvatar/*`

**Interfaces:**
- Consumes: Family/Profile APIs
- Produces: activeProfile selection UI

- [ ] **Step 1: 写成员列表组件测试**

至少覆盖：
- 未绑定账号成员可正常显示；
- elderMode 标记；
- 无 canManageProfile 时不展示编辑入口。

- [ ] **Step 2: 实现 Family API hooks/service**

- [ ] **Step 3: 实现 Family 页面**

卡片只展示：
- 姓名
- 最近测量摘要（若有）
- 今日是否已测
- 关注状态

- [ ] **Step 4: 实现 Add Profile**

第一版字段：
- 姓名必填
- 关系可选
- 生日可选
- 长辈模式 toggle

- [ ] **Step 5: 实现成员切换**

切换 activeProfile 后首页、记录、趋势都基于新 profileId 请求。

- [ ] **Step 6: 测试并 Commit**

```bash
git add apps/miniapp/src
git commit -m "feat: add family profile ui"
```

---

# Task 12: 血压录入页与结果页

**Deliverable:** 一屏完成记录；保存后显示关注结果；长辈也能轻松使用。

**Files:**
- Create: `apps/miniapp/src/features/blood-pressure/components/BPInput.tsx`
- Create: `apps/miniapp/src/features/blood-pressure/blood-pressure.service.ts`
- Create: `apps/miniapp/src/pages/record-create/index.tsx`
- Create: `apps/miniapp/src/pages/record-result/index.tsx`
- Test: component/page tests

**Interfaces:**
- Consumes: `POST /blood-pressure`
- Produces: record creation flow

- [ ] **Step 1: 写录入验证测试**

覆盖：
- 收缩压为空不可提交
- 舒张压为空不可提交
- 输入完成后焦点自动进入下一项
- recordedBy 不出现在用户表单中

- [ ] **Step 2: 实现录入字段**

V1：
- profile
- systolic
- diastolic
- pulse optional
- measuredAt
- medication context optional
- note optional

- [ ] **Step 3: 实现提交**

按钮提交期间 disabled，避免重复创建。

- [ ] **Step 4: 实现结果页**

只根据服务端返回：

```ts
attentionLevel
messageCode
requireRecheck
```

映射 UI，不重新计算阈值。

- [ ] **Step 5: 实现“稍后复测”入口**

只创建产品层提醒或导航到提醒配置，不输出诊断结论。

- [ ] **Step 6: 测试并 Commit**

```bash
git add apps/miniapp/src/features/blood-pressure apps/miniapp/src/pages/record-create apps/miniapp/src/pages/record-result
git commit -m "feat: add blood pressure entry flow"
```

---

# Task 13: 首页 Dashboard 普通模式

**Deliverable:** 首页显示当前成员、最近读数、今日任务、7 日摘要和快速记录。

**Files:**
- Create: `apps/miniapp/src/pages/home/index.tsx`
- Create: `apps/miniapp/src/features/blood-pressure/components/BPCard.tsx`
- Create: `apps/miniapp/src/features/reminder/components/TodayTasks.tsx`
- Create: `apps/miniapp/src/features/attention/components/AttentionCard.tsx`
- Create: `apps/miniapp/src/components/ProfileSwitcher/*`
- Test: page tests

**Interfaces:**
- Consumes: `GET /dashboard?profileId=`

- [ ] **Step 1: 写四种首页状态测试**

1. 新成员，无记录。
2. 有正常记录。
3. 有 attention。
4. 有 recheck + 待测任务。

- [ ] **Step 2: 实现页面**

信息优先级：

```text
ProfileSwitcher
Recent BP
Attention
Today Tasks
Record CTA
7-day Summary
```

- [ ] **Step 3: 空状态**

无数据时主 CTA 必须是“记录第一次血压”，而不是空折线图。

- [ ] **Step 4: 测试并 Commit**

```bash
git add apps/miniapp/src/pages/home apps/miniapp/src/components apps/miniapp/src/features
git commit -m "feat: add standard dashboard"
```

---

# Task 14: 历史记录与趋势页

**Deliverable:** 查看列表、详情、7/30 天趋势。

**Files:**
- Create: `apps/miniapp/src/pages/record-history/index.tsx`
- Create: `apps/miniapp/src/pages/record-detail/index.tsx`
- Create: `apps/miniapp/src/pages/record-trend/index.tsx`
- Create: `apps/miniapp/src/features/blood-pressure/components/TrendChart.tsx`

**Interfaces:**
- Consumes:
  - `GET /blood-pressure`
  - `GET /blood-pressure/:id`
  - `GET /blood-pressure/summary`

- [ ] **Step 1: 写 history 状态测试**

包括：
- 空列表
- 正常列表
- 家人代录 source 标签
- 删除后消失

- [ ] **Step 2: 实现历史列表分页**

使用稳定游标或 page/limit，V1 统一一种，禁止一个页面一种分页方案。

- [ ] **Step 3: 实现详情页**

展示：
- 收缩压/舒张压/脉搏
- 时间
- source
- 测量上下文
- 备注
- attention 状态

- [ ] **Step 4: 实现趋势**

默认 7 天，可切 30 天。

趋势图只负责可视化，不自己统计平均值。

- [ ] **Step 5: 测试并 Commit**

```bash
git add apps/miniapp/src/pages/record-history apps/miniapp/src/pages/record-detail apps/miniapp/src/pages/record-trend
git commit -m "feat: add history and trend views"
```

---

# Task 15: 提醒页面

**Deliverable:** 用户可以给有权限的成员设置早/晚固定提醒。

**Files:**
- Create: `apps/miniapp/src/pages/reminder/index.tsx`
- Create: `apps/miniapp/src/pages/reminder-edit/index.tsx`
- Create: `apps/miniapp/src/features/reminder/*`

- [ ] **Step 1: 写无权限 UI 测试**

`canManageReminder=false` 时编辑按钮不可见，同时服务端仍需返回 403 防绕过。

- [ ] **Step 2: 实现提醒列表**

显示：
- 时间
- 是否启用
- 重复规则

- [ ] **Step 3: 实现编辑**

V1 默认只做“每天 + 固定时间”，weekdays 数据结构保留但 UI 可后续打开。

- [ ] **Step 4: 接入平台授权入口**

平台订阅消息能力只能作为 enhancement；未授权不能影响提醒配置本身。

- [ ] **Step 5: 测试并 Commit**

```bash
git add apps/miniapp/src/pages/reminder apps/miniapp/src/features/reminder
git commit -m "feat: add reminder settings ui"
```

---

# Task 16: 长辈模式

**Deliverable:** 同一 activeProfile 数据在 ElderDashboard 上以大字号、少入口呈现。

**Files:**
- Create: `apps/miniapp/src/pages/elder-mode/index.tsx`
- Create: `apps/miniapp/src/features/profile/components/ElderDashboard.tsx`
- Create: `apps/miniapp/src/features/profile/components/StandardDashboard.tsx`
- Modify: `apps/miniapp/src/pages/home/index.tsx`
- Test: mode tests

**Interfaces:**
- Consumes: same `DashboardResponse`
- Produces: presentation switch only

- [ ] **Step 1: 写模式共享数据测试**

同一 DashboardResponse 输入，StandardDashboard 与 ElderDashboard 不触发额外业务接口。

- [ ] **Step 2: 抽出 Dashboard presentation**

```tsx
return elderMode
  ? <ElderDashboard data={dashboard} />
  : <StandardDashboard data={dashboard} />
```

- [ ] **Step 3: 长辈模式限制**

首页只保留：
- 最近读数
- 状态提示
- 记录血压
- 下一次测量
- 历史记录

- [ ] **Step 4: 可访问性检查**

关键字号与点击区域满足产品规格。

- [ ] **Step 5: 测试并 Commit**

```bash
git add apps/miniapp/src
git commit -m "feat: add elder presentation mode"
```

---

# Task 17: Audit、隐私和敏感日志保护

**Deliverable:** 核心写操作有审计记录；日志不泄露完整健康数据。

**Files:**
- Create: `apps/server/src/audit/*`
- Create: `apps/server/src/common/logging/health-data-redactor.ts`
- Modify: blood pressure/family/profile/reminder services
- Test: `apps/server/test/audit.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `AuditService.log(action)`
  - redacted logger utility

- [ ] **Step 1: 写 audit 测试**

创建/修改/删除血压记录后必须存在 audit 行。

- [ ] **Step 2: 写日志脱敏测试**

输入包含：

```ts
{ systolic: 168, diastolic: 103, note: '...' }
```

日志输出不得包含完整值和 note 原文。

- [ ] **Step 3: 实现 AuditService**

核心 action：

```text
FAMILY_CREATE
PROFILE_CREATE
PROFILE_UPDATE
PERMISSION_UPDATE
BP_CREATE
BP_UPDATE
BP_DELETE
REMINDER_CREATE
REMINDER_UPDATE
REMINDER_DELETE
```

- [ ] **Step 4: 测试并 Commit**

```bash
git add apps/server/src/audit apps/server/src/common/logging
git commit -m "feat: add audit and health data log protection"
```

---

# Task 18: 全链路 E2E 与 V1 验收

**Deliverable:** 从登录到家庭代录再到 Dashboard 的核心路径可自动验证。

**Files:**
- Create: `apps/server/test/v1-critical-flow.e2e-spec.ts`
- Create: `apps/miniapp/tests/v1-critical-flow.spec.ts`
- Modify: CI config if present

- [ ] **Step 1: 写后端关键流 E2E**

流程：

```text
创建用户小明
→ 创建家庭
→ 创建爸爸 HealthProfile（无 linked user）
→ 自动赋权
→ 给爸爸创建两条血压记录
→ 创建早晚提醒
→ 请求 dashboard
→ 校验 latestRecord / todayTasks / sevenDaySummary
→ 撤销 canRecord
→ 再次 POST record 必须 403
```

- [ ] **Step 2: 写前端核心流测试**

模拟：

```text
登录成功
→ 首页无记录
→ 切换爸爸
→ 点击记录
→ 输入数据
→ 保存
→ 结果页
→ 返回首页看到最新数据
```

- [ ] **Step 3: 跑完整质量门禁**

```bash
pnpm lint
pnpm typecheck
pnpm test
```

若 server 分离 e2e：

```bash
pnpm --filter server test:e2e
```

Expected: 全部 PASS。

- [ ] **Step 4: 检查 V1 禁止项**

代码库不得出现：
- 医疗诊断式文案
- 蓝牙设备真实接入
- AI 诊断模块
- 前端硬编码关注阈值
- 仅靠前端隐藏实现权限

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "test: verify v1 critical flow"
```

---

# 开发顺序摘要

```text
1  Monorepo
2  Contracts
3  Database
4  Auth
5  Family/Profile/Permission
6  AttentionRuleEngine
7  BloodPressure CRUD
8  Analysis/Dashboard
9  Reminder
10 Miniapp API/Auth
11 Family/Profile UI
12 Record UI
13 Dashboard UI
14 History/Trend
15 Reminder UI
16 Elder Mode
17 Audit/Privacy
18 E2E & Release Gate
```

---

# 第一阶段建议截止点

先做到 Task 1–7。

此时系统已经具备真正的核心价值：

```text
微信账号
→ 家庭
→ 健康档案
→ 权限
→ 血压记录
→ 关注结果
```

这时再开始大规模做 UI 最稳。

如果 Task 1–7 的数据关系没跑通，提前把十几个页面画得再漂亮，也只是在给未来的返工做精装修。

---

# Cursor / Codex 执行规则

把本计划和设计规格同时放进仓库：

```text
docs/superpowers/specs/2026-09-07-blood-pressure-family-v1-design.md
docs/superpowers/plans/2026-09-07-blood-pressure-family-v1.md
```

每次只执行一个 Task。

执行 prompt 基线：

```text
Read:
1. docs/superpowers/specs/2026-09-07-blood-pressure-family-v1-design.md
2. docs/superpowers/plans/2026-09-07-blood-pressure-family-v1.md

Implement only Task N.
Follow TDD:
1. write failing tests
2. run and confirm failure
3. implement minimum required code
4. run tests
5. run typecheck/lint for touched package
6. summarize changed files and test results

Do not implement later tasks.
Do not change product scope.
```

---

# Plan Self-Review

## Spec coverage

已覆盖：
- User / HealthProfile 分离
- Family 与 Profile 权限
- 血压 CRUD
- 软删除
- 关注规则
- Dashboard
- 7/30 天分析
- 固定提醒
- 普通模式
- 长辈模式
- 日志脱敏
- 审计
- E2E
- 蓝牙预留但不实现

## Placeholder scan

无 TBD / TODO / “之后再处理”式实现步骤。

## Type consistency

核心类型统一：
- `AttentionLevel`
- `BloodPressureSource`
- `DashboardResponse`
- `ProfilePermissionDTO`
- `AttentionRuleInput`
- `AttentionRuleResult`

后续任务只能从 `@bp/contracts` 或明确模块导入，不得自行定义同名重复类型。
