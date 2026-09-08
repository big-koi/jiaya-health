# Task 10 实施报告

## 状态

已完成小程序 API Client、微信登录、持久化 session、家庭与 active profile 选择状态，以及登录页视觉重做。

## 契约核对

- 服务端全局 API 前缀为 `/api/v1`。
- `POST /auth/wechat` 请求体为 `{ code }`，响应遵循 `WechatLoginResponse`，包含 `accessToken` 与 `user`。
- 当前 `GET /users/me` 的真实响应是 `{ userId }`，并非完整 `UserDTO`。小程序据此将 session 的当前用户建模为 `{ userId }`。
- 服务端错误体遵循共享 `ApiError`：`code`、`message`、`requestId` 与可选 `details`。

## 变更

### API 与鉴权

- 新增 `apps/miniapp/src/services/api/client.ts`：
  - 提供 `apiClient.get/post/patch/delete`。
  - 默认地址为 `http://127.0.0.1:3000/api/v1`，可通过 `TARO_APP_API_BASE_URL` 覆盖。
  - 所有请求统一从 session store 读取 token 并注入 `Authorization: Bearer <token>`。
  - 非 2xx 响应统一解析为 `ApiRequestError`，保留共享 `ApiError` 字段与 HTTP 状态码。
  - 任意 401 或错误码 `TOKEN_EXPIRED` 会清空内存和持久化 session，并 `reLaunch` 到登录页。
- 新增 `apps/miniapp/src/features/auth/auth.service.ts`：
  - 严格执行 `Taro.login → POST /auth/wechat → 暂存 token → GET /users/me → 完整 session`。
  - `/users/me` 失败时清除暂存 token，避免残留半完成 session。

### 全局状态

- 新增 `apps/miniapp/src/store/session.store.ts`：持久化 `accessToken` 与 `{ userId }`，提供暂存 token、建立 session 与清理 session 的动作。
- 新增 `apps/miniapp/src/store/active-profile.store.ts`：只持久化 `activeFamilyId` 与 `activeProfileId`；切换家庭时清除旧档案选择，不复制姓名、头像、生日、关系等业务对象。

### 登录页

- 将预览跳转替换为真实微信登录服务调用。
- 已登录 session 自动进入首页；未同意协议时保持原提示；登录中禁用按钮；失败时显示就地错误。
- 采用微信原生 `Button`、`CheckboxGroup`、`Checkbox` 与 `Label`。
- 视觉从通用渐变与装饰性人物图形调整为浅色稳定底、单一品牌青绿、清晰标题与健康数据用途说明。
- 法律同意文案保持原文：`我已阅读并同意《用户协议》和《隐私政策》`。

### 测试

- 新增 `apps/miniapp/test/api-client.spec.ts`。
- 新增 `apps/miniapp/test/auth.service.spec.ts`。
- 新增 `apps/miniapp/test/active-profile.store.spec.ts`。

## TDD 证据

### RED 1：API 401 与 active profile

命令：

```text
pnpm --filter miniapp exec vitest run test/api-client.spec.ts test/active-profile.store.spec.ts
```

结果：退出码 1；2 个测试套件失败。失败原因分别是 `src/services/api/client` 与 `src/store/active-profile.store` 尚不存在，与待实现功能一致。

### GREEN 1

同一命令结果：退出码 0；2 个测试文件、5 个测试全部通过。

### RED 2：微信登录 flow

命令：

```text
pnpm --filter miniapp exec vitest run test/auth.service.spec.ts
```

结果：退出码 1；测试套件因 `src/features/auth/auth.service` 尚不存在而失败，与待实现功能一致。

### GREEN 2

同一命令结果：退出码 0；1 个测试文件、2 个测试全部通过。

### 验证中发现并修复的问题

初次 `pnpm --filter miniapp typecheck` 在 `api-client.spec.ts` 报 `TS2558`，根因为 Vitest `toMatchObject` 不接受显式泛型。将断言改为 `satisfies Partial<ApiRequestError>` 后，独立重跑 typecheck 退出码为 0。运行时测试此前已经通过，该修复只纠正测试类型写法。

## 完整验证

- `pnpm test`
  - 退出码 0。
  - workspace smoke：1/1 通过。
  - contracts：4/4 通过。
  - server：8/8 通过。
  - miniapp：11/11 通过，4 个测试文件全部通过。
- `pnpm --filter miniapp typecheck`
  - 退出码 0，无 TypeScript 错误。
- `pnpm --filter miniapp lint`
  - 退出码 0，无 ESLint 错误。
- `pnpm --filter miniapp build`
  - 退出码 0，Taro Webpack 微信小程序构建成功，最终验证耗时 21.35 秒。

## 自审

- [x] `apiClient` 提供四种要求的方法。
- [x] 所有请求统一注入 session token。
- [x] 非 2xx 响应统一转换为带状态码的 `ApiRequestError`。
- [x] 401 不依赖错误码即可清理 session。
- [x] 非 401 的 `TOKEN_EXPIRED` 也会清理 session。
- [x] 清理同时覆盖 Zustand 内存、Taro 持久化存储与登录页导航。
- [x] API 地址可按环境配置，并有本地默认值与测试覆盖。
- [x] 登录 flow 顺序与任务简报一致，失败不会遗留 token。
- [x] active profile store 只保存选择标识，家庭切换会清除旧 profile。
- [x] 登录页保留法律同意文案，使用单一青绿强调色，无通用渐变和多余装饰。
- [x] 登录页具备未同意提示、loading、error 与已有 session 跳转状态。
- [x] 登录页可见文案已复读，无长破折号、无含混或虚构表达。
- [x] 未修改或回退工作区内其他既有未提交改动。

## 遗留顾虑

- `GET /users/me` 目前只返回 `{ userId }`，因此 session 暂不包含昵称和头像。未来若服务端丰富该响应，应先补共享契约再扩展 session。
- `127.0.0.1` 适用于本地微信开发者工具；真机联调和发布必须通过 `TARO_APP_API_BASE_URL` 配置可访问的局域网或 HTTPS 地址。
- 已完成构建与代码级视觉检查，但本任务环境未执行微信开发者工具真机截图验收，安全区和原生复选框在目标机型上的细节仍应做一次人工巡检。

## 修复轮次 1：鉴权失效同步清理档案选择

### 审查问题与根因

审查指出，session 与 active profile 分别持久化在 `jiaya.session` 和 `jiaya.active-profile`。原 `clearSession()` 只删除前者，而 API 的 401/TOKEN_EXPIRED 路径只调用 `clearSession()`。因此账号 A 的家庭与档案选择会保留在 Zustand 内存和 Taro 持久化存储中，并可能被随后登录的账号 B 继承。

根因是账号级状态没有统一生命周期出口，而不是 API 错误分支判断遗漏。采用审查指定的最小方案：让公共 `clearSession()` 同步调用 `useActiveProfileStore.getState().clearSelection()`。这样 API 鉴权失效、登录 flow 失败和今后显式登出只要复用 `clearSession()`，都会清除当前账号的选择状态。

### RED 证据

先修改测试，未改生产代码。命令：

```text
pnpm --filter miniapp exec vitest run test/api-client.spec.ts test/active-profile.store.spec.ts
```

结果：退出码 1；2 个测试文件中 3 个测试按预期失败、4 个通过。

- 401/AUTH_REQUIRED 后仍得到 `activeFamilyId: "family-a"`、`activeProfileId: "profile-a"`。
- 403/TOKEN_EXPIRED 后仍得到同样的旧选择。
- 直接调用 `clearSession()` 后仍得到同样的旧选择。

所有失败均为行为断言失败，不是导入、语法或测试配置错误。

### 最小修复

- `apps/miniapp/src/store/session.store.ts`
  - 引入 `useActiveProfileStore`。
  - `clearSession()` 删除 `jiaya.session` 后同步执行 `clearSelection()`，再重置 session 内存状态。
- `apps/miniapp/test/api-client.spec.ts`
  - 为既有 401 与 TOKEN_EXPIRED 参数化测试建立 active profile，并断言内存选择和 `jiaya.active-profile` 都被清除。
- `apps/miniapp/test/active-profile.store.spec.ts`
  - 新增直接登出跨 store 回归测试，验证 `clearSession()` 同时清除 active profile。
  - 测试初始化显式重置两个 store，防止用例间状态泄漏。

### GREEN 证据

再次运行同一定向命令：退出码 0；2 个测试文件、7 个测试全部通过。

### 修复后完整验证

- `pnpm --filter miniapp test`
  - 退出码 0；4 个测试文件、12 个测试全部通过。
- `pnpm --filter miniapp typecheck`
  - 退出码 0，无 TypeScript 错误。
- `pnpm --filter miniapp lint`
  - 退出码 0，无 ESLint 错误。
- `pnpm --filter miniapp build`
  - 退出码 0；Taro Webpack 微信小程序构建成功，耗时 21.68 秒。

### 修复轮次自审

- [x] 401 不论错误码为何都会清除 session 与 active profile。
- [x] 非 401 的 TOKEN_EXPIRED 也会清除两类状态。
- [x] 直接 `clearSession()` 的登出路径具备相同清理语义。
- [x] 同时覆盖 Zustand 内存状态与两个 Taro 持久化 key。
- [x] active profile store 仍只保存家庭与档案标识，没有复制业务对象。
- [x] 删除 `clearSession()` 中新增的 `clearSelection()` 调用会稳定导致 3 个回归测试失败。
- [x] 未修改或暂存其他既有未提交改动。

### 修复轮次遗留顾虑

- 当前账号级持久化状态只有 session 与 active profile。未来若新增其他账号级 store，应继续纳入统一清理入口，避免再次出现跨账号残留。
