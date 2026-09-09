import 'reflect-metadata'
import 'dotenv/config'
import { setDefaultResultOrder } from 'node:dns'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { configureApp } from './configure-app'

// 部分代理工具会劫持 DNS 返回 fake-ip，Node 默认 IPv6 优先会导致 fetch 微信 API 超时
setDefaultResultOrder('ipv4first')

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  configureApp(app)
  await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
