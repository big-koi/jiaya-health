# 家压家庭健康

家压家庭健康是一套面向家庭场景的微信小程序与服务端工程。V1 聚焦血压记录、家庭代录、档案共享、关注提示和测量提醒，帮助家庭成员共同维护健康数据。

> 当前仓库处于基础建设阶段，已完成后端核心 API 与小程序 UI 演示骨架，尚未达到生产可用状态。小程序页面目前使用本地演示数据，尚未完成登录鉴权与接口联调。系统只提供 `normal`、`attention`、`recheck` 产品提示，不代替医生诊断。

## V1 功能边界

- 支持本人记录和家庭成员代录血压。
- 用户账号与健康档案分离，一个账号可管理多个档案。
- 后端统一校验档案访问权限。
- 支持家庭共享、固定测量提醒和长辈模式。
- 血压记录采用软删除，避免误操作造成数据丢失。
- V1 不接入蓝牙设备，仅为后续设备数据源保留扩展边界。

## 技术栈

- Node.js 24、pnpm 11、TypeScript（严格模式）
- 微信小程序：Taro 4.2.1、React 18、Zustand 5
- 服务端：NestJS 11、Prisma 7
- 数据库：PostgreSQL 15+
- 测试：Vitest、Node.js Test Runner

## 工程结构

```text
jiaya-health/
├─ apps/
│  ├─ miniapp/       # Taro 微信小程序
│  └─ server/        # NestJS API 与 Prisma 数据层
├─ packages/
│  ├─ constants/     # 前后端共享常量
│  ├─ contracts/     # API 请求、响应与错误契约
│  └─ utils/         # 通用工具
└─ docs/
   └─ superpowers/   # V1 设计说明与实施计划
```

## 开发环境

开始前请确认本机已经安装：

- Node.js 24 或更高版本
- pnpm 11.19.0
- Docker Desktop
- 微信开发者工具

```bash
node --version
pnpm --version
docker --version
```

## 快速开始

### 1. 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

### 2. 启动 PostgreSQL

首次启动可直接创建本地开发容器：

```bash
docker run --name jiaya-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=jiaya_health \
  -p 5432:5432 \
  -d postgres:15
```

以后启动和停止数据库：

```bash
docker start jiaya-postgres
docker stop jiaya-postgres
```

### 3. 配置环境变量

在 `apps/server` 下创建 `.env`，不要将它提交到 Git：

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jiaya_health?schema=public
JWT_SECRET=请替换为至少32位的随机字符串
PORT=3000
# 联调真实微信登录时再填写
WECHAT_APP_ID=
WECHAT_APP_SECRET=
# 关注规则阈值需由产品和专业人员确认后配置
ATTENTION_RULE_VERSION=
ATTENTION_SYSTOLIC_MIN=
RECHECK_SYSTOLIC_MIN=
ATTENTION_DIASTOLIC_MIN=
RECHECK_DIASTOLIC_MIN=
# 今日任务完成窗口（分钟）和业务时区偏移（中国标准时间为 480）
REMINDER_COMPLETION_WINDOW_MINUTES=30
APP_TIMEZONE_OFFSET_MINUTES=480
```

### 4. 初始化数据库

```bash
pnpm --filter server exec prisma generate
pnpm --filter server exec prisma migrate dev
```

修改 `apps/server/prisma/schema.prisma` 后，也应重新执行这两条命令。生产或持续集成环境应使用 `prisma migrate deploy`，不要使用 `migrate dev`。

### 5. 启动服务端

```bash
pnpm --filter server dev
```

默认监听 `http://localhost:3000`，API 前缀统一使用 `/api/v1`。当前可通过以下接口读取统计与首页聚合数据：

- `GET /api/v1/blood-pressure/summary?profileId=<档案ID>&range=7d|30d`
- `GET /api/v1/dashboard?profileId=<档案ID>`
- `POST /api/v1/reminders`
- `GET /api/v1/reminders?profileId=<档案ID>`
- `PATCH /api/v1/reminders/<提醒ID>`
- `DELETE /api/v1/reminders/<提醒ID>`

所有接口都需要携带登录令牌。统计、首页和提醒列表校验档案查看权限；提醒的创建、修改和删除还要求提醒管理权限。首页响应中的 `todayTasks` 已接入当天生效的测量提醒。

### 6. 启动微信小程序

```bash
pnpm --filter miniapp dev
```

然后在微信开发者工具中导入 `apps/miniapp` 目录。项目配置会将 `dist` 作为小程序代码目录；正式联调前需要把 `apps/miniapp/project.config.json` 中的测试 AppID 替换成自己的小程序 AppID。

当前小程序 UI 已按设计图落地演示页：

- 登录页、首页、记录血压、历史趋势、关注提示、家人、提醒设置、我的
- 底部 Tab：首页 / 家人 / 记录 / 我的（V1 不含「发现」）
- 设备同步入口保留为占位，提示 V1 暂不接蓝牙
- 数据解读页只展示产品关注提示，不展示诊断式医学分级表

页面数据来自 `apps/miniapp/src/mocks/demo-data.ts`，后续 Task 10 起再接入真实 API。

### 预览注意

1. 先在仓库根目录执行 `pnpm --filter miniapp dev`（或 `build`），确保生成 `apps/miniapp/dist`。
2. 微信开发者工具导入目录必须是 `apps/miniapp`，不要导入 `src` 或仓库根目录。
3. 项目已配置 `miniprogramRoot: dist/`，模拟器运行的是编译产物。
4. 若仍白屏：打开调试器「Console」查看红色报错，并点击「清缓存 → 全部清除」后重新编译。
5. 编辑器里关于 `noImplicitOverride` 的提示来自开发者工具内置旧版 TypeScript，不影响运行。

## 质量检查

在仓库根目录执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

数据库端到端测试会写入并清理测试数据，请使用独立测试库：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jiaya_test?schema=public \
  pnpm --filter server test:e2e
```

PowerShell 可使用：

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/jiaya_test?schema=public'
pnpm --filter server test:e2e
```

## 开发与提交约定

当前是个人项目，后续直接在 `main` 分支开发：

```bash
git switch main
git pull --ff-only origin main
# 完成开发并通过检查
git add <文件>
git commit -m "功能：增加血压记录接口"
git push origin main
```

提交信息统一使用中文，推荐采用“类型：内容”的格式，例如：

- `功能：增加家庭成员管理`
- `修复：处理重复提交血压记录`
- `测试：补充档案权限场景`
- `文档：更新本地开发说明`

提交前至少运行与改动相关的测试；涉及共享契约、数据库结构或公共配置时，应运行全部质量检查。

## 当前进度

| 任务 | 内容 | 状态 |
| --- | --- | --- |
| Task 1 | Monorepo 与基础工程 | 已完成 |
| Task 2 | 共享 API 契约、常量与工具 | 已完成 |
| Task 3 | Prisma 数据模型、迁移与数据库测试 | 已完成 |
| Task 4 | API 基础、统一错误与 JWT 鉴权 | 已完成 |
| Task 5 | 家庭、健康档案与档案权限闭环 | 已完成 |
| Task 6 | 可配置、可版本化的血压关注规则引擎 | 已完成 |
| Task 7 | 血压记录创建、查询、修改与软删除 | 已完成 |
| Task 8 | 7/30 天血压统计与首页聚合接口 | 已完成 |
| Task 9 | 测量提醒、今日任务及首页接入 | 已完成 |
| UI 演示 | 小程序主流程页面与设计 Token（演示数据） | 已完成 |
| Task 10 及后续 | 登录鉴权、接口联调、关注事件、通知等 | 待开发 |

详细方案见 [V1 设计说明](docs/superpowers/specs/2026-09-07-blood-pressure-family-v1-design.md) 和 [实施计划](docs/superpowers/plans/2026-09-07-blood-pressure-family-v1-plan.md)。

## 数据与安全

- 不提交 `.env`、数据库密码、小程序密钥等敏感信息。
- 日志中禁止直接输出完整健康数据。
- 所有档案数据访问必须由服务端进行权限校验。
- 关注提示只用于产品提醒，不能作为医疗诊断结论。
