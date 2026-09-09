# 家压小程序第一轮视觉与性能改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按用户确认的八屏参考稿重构登录、首页、血压录入、历史趋势和家庭管理，并消除核心流程中的重复请求、闪烁和交互迟滞。

**Architecture:** 先建立共享视觉组件和轻量查询缓存，再让五个页面只负责业务编排。所有异步页面统一使用 stale-while-refresh、最新请求生效和局部错误降级；业务接口、数据库结构和页面路径保持不变。

**Tech Stack:** Taro 4.2.1、React 18、TypeScript 6、Zustand、SCSS、Vitest、微信小程序。

**Spec:** `docs/superpowers/specs/2026-09-09-miniapp-visual-performance-redesign.md`

## Global Constraints

- 页面背景使用 `#F5FAF7`，品牌主色使用 `#09A86B`；橙色仅表示关注，红色仅表示高风险。
- 采用 8px 间距网格，主要触控区域不低于 44px，主按钮不低于 48px。
- 只使用 12px、16px 两档内容圆角；胶囊形状只用于状态与主按钮。
- 第一轮不得改变服务端业务规则、数据库结构、页面路径及现有接口含义。
- 动画仅使用透明度、位移和缩放，并提供无动画降级；不动画阴影和模糊。
- 所有新增行为先写失败测试，验证 RED 后再实现；每个任务独立提交，提交信息使用中文。
- 保留 `project.private.config.json` 和所有任务外工作区改动，不得提交或覆盖。

---

### Task 1: 设计令牌与共享基础组件

**Files:**
- Modify: `apps/miniapp/src/styles/tokens.scss`
- Modify: `apps/miniapp/src/app.scss`
- Modify: `apps/miniapp/src/components/PrimaryButton/index.tsx`
- Modify: `apps/miniapp/src/components/PrimaryButton/index.scss`
- Modify: `apps/miniapp/src/components/ProfileAvatar/index.tsx`
- Modify: `apps/miniapp/src/components/ProfileAvatar/index.scss`
- Modify: `apps/miniapp/src/components/StatusPill/index.scss`
- Create: `apps/miniapp/src/components/HealthCard/index.tsx`
- Create: `apps/miniapp/src/components/HealthCard/index.scss`
- Create: `apps/miniapp/src/components/SegmentedControl/index.tsx`
- Create: `apps/miniapp/src/components/SegmentedControl/index.scss`
- Create: `apps/miniapp/src/components/StateView/index.tsx`
- Create: `apps/miniapp/src/components/StateView/index.scss`
- Test: `apps/miniapp/test/design-system.spec.tsx`

**Interfaces:**
- Produces: `HealthCard({ tone?: 'plain' | 'healthy'; children })`。
- Produces: `SegmentedControl<T>({ value, options, onChange, ariaLabel })`，其中 `options` 为 `{ label: string; value: T }[]`。
- Produces: `StateView({ state: 'loading' | 'empty' | 'error'; title?; description?; onRetry? })`。
- Produces: `PrimaryButton` 的 `loading`、`disabled`、`variant='primary'|'secondary'` 和按压态。

- [ ] **Step 1: 写共享组件失败测试**

在 `design-system.spec.tsx` 渲染真实组件并验证：加载按钮禁用、错误状态出现重试按钮、分段控件只触发被选值、长辈头像仍有可读名称。

```tsx
it('加载中的主按钮禁用并显示进度文案', () => {
  render(<PrimaryButton loading>保存记录</PrimaryButton>)
  expect(button.disabled).toBe(true)
  expect(button.textContent).toContain('处理中')
})
```

- [ ] **Step 2: 验证 RED**

Run: `pnpm --filter miniapp exec vitest run test/design-system.spec.tsx`
Expected: FAIL，因为新组件和 `variant` 尚不存在。

- [ ] **Step 3: 实现令牌和组件**

令牌至少包括：

```scss
--jp-color-brand: #09a86b;
--jp-color-bg: #f5faf7;
--jp-radius-card: 16px;
--jp-radius-control: 12px;
--jp-duration-fast: 120ms;
--jp-touch-min: 88px; // Taro rpx，等效 44px
```

组件不得发起请求或读取 store，仅通过 props 接收状态。

- [ ] **Step 4: 验证 GREEN 与构建**

Run: `pnpm --filter miniapp exec vitest run test/design-system.spec.tsx && pnpm --filter miniapp typecheck && pnpm --filter miniapp build`
Expected: PASS，微信小程序构建成功。

- [ ] **Step 5: 提交**

```bash
git add apps/miniapp/src/styles apps/miniapp/src/app.scss apps/miniapp/src/components apps/miniapp/test/design-system.spec.tsx
git commit -m "样式：建立小程序统一视觉组件"
```

### Task 2: 查询缓存与页面刷新控制

**Files:**
- Create: `apps/miniapp/src/services/query/query-cache.ts`
- Create: `apps/miniapp/src/services/query/profile-query.service.ts`
- Test: `apps/miniapp/test/query-cache.spec.ts`
- Test: `apps/miniapp/test/profile-query.service.spec.ts`

**Interfaces:**
- Produces: `createQueryCache({ ttlMs })`，提供 `get<T>(key)`、`set<T>(key,value)`、`dedupe<T>(key,loader)`、`invalidate(prefix)`。
- Produces: `profileQueryService.list({ force?: boolean })` 和 `profileQueryService.dashboard(profileId,{ force?: boolean })`。
- Consumes: `profilesApi.list()`、`dashboardApi.get(profileId)`。

- [ ] **Step 1: 写缓存失败测试**

覆盖 TTL 命中、过期刷新、相同 key 并发去重、不同 profile 不串数据、失败请求不写缓存。

```ts
const first = cache.dedupe('profiles', loader)
const second = cache.dedupe('profiles', loader)
expect(loader).toHaveBeenCalledTimes(1)
await expect(Promise.all([first, second])).resolves.toEqual([profiles, profiles])
```

- [ ] **Step 2: 验证 RED**

Run: `pnpm --filter miniapp exec vitest run test/query-cache.spec.ts test/profile-query.service.spec.ts`
Expected: FAIL，因为缓存服务不存在。

- [ ] **Step 3: 实现最小缓存**

缓存默认 TTL 为 30 秒；`force` 跳过值缓存但仍复用同一时刻的进行中请求。错误必须向调用者抛出，且删除 pending entry。

- [ ] **Step 4: 验证 GREEN**

Run: `pnpm --filter miniapp exec vitest run test/query-cache.spec.ts test/profile-query.service.spec.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/miniapp/src/services/query apps/miniapp/test/query-cache.spec.ts apps/miniapp/test/profile-query.service.spec.ts
git commit -m "性能：增加成员数据缓存与请求去重"
```

### Task 3: 登录与启动体验还原

**Files:**
- Modify: `apps/miniapp/src/pages/login/index.tsx`
- Modify: `apps/miniapp/src/pages/login/index.scss`
- Modify: `apps/miniapp/test/login-page.spec.ts`
- Create: `apps/miniapp/src/assets/brand/family-hero.png`

**Interfaces:**
- Consumes: `authService.loginWithWechat()`、`PrimaryButton`。
- Produces: 与参考稿一致的品牌区、家庭插画区、协议区和底部登录操作。

- [ ] **Step 1: 写交互失败测试**

验证已有 session 直接进入首页、未同意协议不请求登录、登录中按钮即时禁用、失败保留页面并显示重试信息。

- [ ] **Step 2: 验证 RED**

Run: `pnpm --filter miniapp exec vitest run test/login-page.spec.ts`
Expected: 至少一个新增的加载状态或结构行为断言失败。

- [ ] **Step 3: 实现页面与素材**

页面结构固定为 `brand`、`message`、`illustration`、`login-action`、`legal` 五区；不得将整张参考图作为背景。插画为独立原创素材并压缩到适合小程序的尺寸。

- [ ] **Step 4: 验证页面**

Run: `pnpm --filter miniapp exec vitest run test/login-page.spec.ts && pnpm --filter miniapp build`
Expected: PASS；构建产物包含插画且无外链资源。

- [ ] **Step 5: 提交**

```bash
git add apps/miniapp/src/pages/login apps/miniapp/src/assets/brand apps/miniapp/test/login-page.spec.ts
git commit -m "样式：还原家压登录与启动页面"
```

### Task 4: 首页家庭概览与成员切换

**Files:**
- Modify: `apps/miniapp/src/pages/home/index.tsx`
- Modify: `apps/miniapp/src/pages/home/index.scss`
- Create: `apps/miniapp/src/features/home/HomeSkeleton.tsx`
- Create: `apps/miniapp/src/features/home/RecentRecordList.tsx`
- Modify: `apps/miniapp/test/active-profile-pages.spec.tsx`
- Create: `apps/miniapp/test/home-page-performance.spec.tsx`

**Interfaces:**
- Consumes: `profileQueryService.list()`、`profileQueryService.dashboard(profileId)`、`recordsApi.list()`。
- Produces: 成员切换条、最新读数卡、四个快捷入口、近期记录和局部刷新状态。

- [ ] **Step 1: 写首页失败测试**

覆盖缓存先显示、后台刷新不白屏、同一生命周期不重复拉成员、快速 A→B 切换只显示 B、错误只替换数据卡而不清空成员条。

- [ ] **Step 2: 验证 RED**

Run: `pnpm --filter miniapp exec vitest run test/active-profile-pages.spec.tsx test/home-page-performance.spec.tsx`
Expected: 新增缓存或局部错误断言失败。

- [ ] **Step 3: 实现首页结构**

拆出骨架和近期列表；页面只保留查询编排与跳转。成员切换立即更新选中态，再请求对应数据；每次请求使用 cleanup 标记防止陈旧响应。

- [ ] **Step 4: 验证 GREEN**

Run: `pnpm --filter miniapp exec vitest run test/active-profile-pages.spec.tsx test/home-page-performance.spec.tsx && pnpm --filter miniapp typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/miniapp/src/pages/home apps/miniapp/src/features/home apps/miniapp/test/active-profile-pages.spec.tsx apps/miniapp/test/home-page-performance.spec.tsx
git commit -m "样式：首页还原家庭健康概览"
```

### Task 5: 血压录入交互改造

**Files:**
- Modify: `apps/miniapp/src/pages/record-create/index.tsx`
- Modify: `apps/miniapp/src/pages/record-create/index.scss`
- Create: `apps/miniapp/src/features/record/BloodPressureField.tsx`
- Create: `apps/miniapp/src/features/record/BloodPressureField.scss`
- Create: `apps/miniapp/test/record-create-page.spec.tsx`

**Interfaces:**
- Consumes: `recordsApi.create(payload)`、`useActiveProfileStore.activeProfileId`。
- Produces: 收缩压、舒张压、心率、测量时间、测量人、备注及保存状态。

- [ ] **Step 1: 写录入失败测试**

验证无成员时引导选择、空值与范围错误就地显示、输入合法后 payload 使用当前成员、连续点击只提交一次、失败后输入不丢失。

- [ ] **Step 2: 验证 RED**

Run: `pnpm --filter miniapp exec vitest run test/record-create-page.spec.tsx`
Expected: FAIL，因为字段组件和至少一个交互保证尚不存在。

- [ ] **Step 3: 实现大数字输入与反馈**

`BloodPressureField` 接收 `{ label, value, unit, min, max, error, onInput }`；只显示 UI 校验，最终合法性仍服从现有服务端契约。保存期间按钮禁用并显示“保存中”。

- [ ] **Step 4: 验证 GREEN**

Run: `pnpm --filter miniapp exec vitest run test/record-create-page.spec.tsx && pnpm --filter miniapp build`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/miniapp/src/pages/record-create apps/miniapp/src/features/record apps/miniapp/test/record-create-page.spec.tsx
git commit -m "交互：重构血压录入与保存反馈"
```

### Task 6: 历史趋势页面还原

**Files:**
- Modify: `apps/miniapp/src/pages/record-history/index.tsx`
- Modify: `apps/miniapp/src/pages/record-history/index.scss`
- Create: `apps/miniapp/src/features/history/BloodPressureTrend.tsx`
- Create: `apps/miniapp/src/features/history/BloodPressureTrend.scss`
- Modify: `apps/miniapp/test/active-profile-pages.spec.tsx`
- Create: `apps/miniapp/test/record-history-page.spec.tsx`

**Interfaces:**
- Consumes: `recordsApi.list({ profileId, from, to })`、`recordsApi.summary(profileId, range)`。
- Produces: 7 天、30 天、3 个月、1 年的 UI 选项；第一轮接口实际支持 7 天和 30 天，其余显示明确的暂不可选状态，不伪造数据。

- [ ] **Step 1: 写历史页失败测试**

验证切换范围参数、陈旧响应不覆盖、平均值来自服务端、无记录显示空状态、趋势组件使用当前范围记录。

- [ ] **Step 2: 验证 RED**

Run: `pnpm --filter miniapp exec vitest run test/active-profile-pages.spec.tsx test/record-history-page.spec.tsx`
Expected: 新趋势结构或不可选范围断言失败。

- [ ] **Step 3: 实现趋势与统计布局**

趋势组件使用小程序原生 View 绘制点线结构，不引入大型图表依赖；数据不足两个点时显示单点状态。范围切换立即更新控件，保留旧内容并显示局部刷新。

- [ ] **Step 4: 验证 GREEN**

Run: `pnpm --filter miniapp exec vitest run test/active-profile-pages.spec.tsx test/record-history-page.spec.tsx && pnpm --filter miniapp typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/miniapp/src/pages/record-history apps/miniapp/src/features/history apps/miniapp/test/active-profile-pages.spec.tsx apps/miniapp/test/record-history-page.spec.tsx
git commit -m "样式：还原血压历史与趋势页面"
```

### Task 7: 家庭管理页面还原

**Files:**
- Modify: `apps/miniapp/src/pages/family/index.tsx`
- Modify: `apps/miniapp/src/pages/family/index.scss`
- Modify: `apps/miniapp/src/features/family/FamilyMemberCard.tsx`
- Create: `apps/miniapp/src/features/family/FamilyMemberCard.scss`
- Modify: `apps/miniapp/src/features/family/family.service.ts`
- Modify: `apps/miniapp/test/family-page.spec.tsx`
- Create: `apps/miniapp/test/family-page-performance.spec.tsx`

**Interfaces:**
- Consumes: `familyService.loadOverview(userId, { force?: boolean })`，内部复用 Task 2 查询缓存。
- Produces: 家庭标题、成员数量、紧凑成员卡、创建者标签、添加成员和权限入口。

- [ ] **Step 1: 写家庭页失败测试**

覆盖缓存返回、后台刷新、共享成员分组、无权限隐藏编辑、快速家庭切换不串成员、局部摘要失败仍展示成员。

- [ ] **Step 2: 验证 RED**

Run: `pnpm --filter miniapp exec vitest run test/family-page.spec.tsx test/family-page-performance.spec.tsx`
Expected: 新缓存或视觉结构行为断言失败。

- [ ] **Step 3: 实现家庭管理布局**

成员卡只保留头像、姓名、关系或年龄、身份标签和进入箭头；测量摘要移到可选的第二行，避免文字堆叠。主列表不使用复杂阴影或大面积动画。

- [ ] **Step 4: 验证 GREEN**

Run: `pnpm --filter miniapp exec vitest run test/family-page.spec.tsx test/family-page-performance.spec.tsx && pnpm --filter miniapp build`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add apps/miniapp/src/pages/family apps/miniapp/src/features/family apps/miniapp/test/family-page.spec.tsx apps/miniapp/test/family-page-performance.spec.tsx
git commit -m "样式：还原家庭成员管理页面"
```

### Task 8: 第一轮集成、性能巡检与文档

**Files:**
- Modify: `README.md`
- Create: `docs/qa/phase-1-miniapp-visual-checklist.md`
- Modify only if defects are found: files changed by Task 1–7

**Interfaces:**
- Consumes: Task 1–7 的页面与组件。
- Produces: 可重复的视觉、交互、弱网和性能验收清单。

- [ ] **Step 1: 执行完整自动验证**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm --filter miniapp build`
Expected: 所有命令 exit 0，无测试失败或类型错误。

- [ ] **Step 2: 在微信开发者工具逐页巡检**

检查 iPhone 12/13 mini、iPhone 15 Pro 两档尺寸：登录、首页、录入、历史、家庭。记录首屏跳动、连续快速点击、A→B 成员切换、7d→30d 范围切换和弱网错误。

- [ ] **Step 3: 检查性能证据**

开发者工具 Network 中，同一次页面显示不得出现参数相同的重复请求；Performance 中主要点击不得出现明显长任务。将观察结果、设备尺寸和通过状态写入 QA 清单。

- [ ] **Step 4: 修复巡检发现的问题并重跑验证**

每个修复先补能复现的测试；重新运行 Step 1。不得以隐藏错误或延长 loading 代替修复。

- [ ] **Step 5: 更新 README 并提交**

README 增加第一轮完成范围、开发者工具预览步骤和第二轮待办；不修改现有环境变量含义。

```bash
git add README.md docs/qa/phase-1-miniapp-visual-checklist.md apps/miniapp
git commit -m "文档：完成第一轮小程序视觉与性能验收"
```

## 第一轮完成门槛

- 登录、首页、录入、历史、家庭五页与参考稿的色彩、层级和布局一致。
- 自动测试、类型检查、代码规范和小程序构建全部通过。
- 快速切换成员和范围时没有陈旧数据覆盖。
- 返回页面优先展示缓存，不出现可感知整页白屏。
- 主按钮、开关、成员切换和范围切换具有即时反馈。
- QA 清单包含至少两种设备尺寸和弱网场景的人工验收结果。

