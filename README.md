# 家压家庭健康

家压家庭健康是一套面向家庭场景的微信小程序与服务端工程。V1 聚焦血压记录、家庭代录、档案共享、关注提示和测量提醒，帮助家庭成员共同维护健康数据。

> 当前仓库处于基础建设阶段，已完成 Monorepo、共享契约和数据库模型，尚未达到生产可用状态。系统只提供 `normal`、`attention`、`recheck` 产品提示，不代替医生诊断。

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

默认监听 `http://localhost:3000`，API 前缀将在业务接口阶段统一使用 `/api/v1`。

### 6. 启动微信小程序

```bash
pnpm --filter miniapp dev
```

然后在微信开发者工具中导入 `apps/miniapp` 目录。项目配置会将 `dist` 作为小程序代码目录；正式联调前需要把 `apps/miniapp/project.config.json` 中的测试 AppID 替换成自己的小程序 AppID。

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
| Task 8 及后续 | 统计分析、首页、提醒等业务模块 | 待开发 |

详细方案见 [V1 设计说明](docs/superpowers/specs/2026-09-07-blood-pressure-family-v1-design.md) 和 [实施计划](docs/superpowers/plans/2026-09-07-blood-pressure-family-v1-plan.md)。

## 数据与安全

- 不提交 `.env`、数据库密码、小程序密钥等敏感信息。
- 日志中禁止直接输出完整健康数据。
- 所有档案数据访问必须由服务端进行权限校验。
- 关注提示只用于产品提醒，不能作为医疗诊断结论。
