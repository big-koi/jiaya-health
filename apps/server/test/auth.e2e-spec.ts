import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { configureApp } from '../src/configure-app'
import { PrismaService } from '../src/prisma/prisma.service'

const WECHAT_SESSION_CLIENT = 'WECHAT_SESSION_CLIENT'

describe('鉴权 API', () => {
  let app: INestApplication
  const prisma = new PrismaService()
  const suffix = `${Date.now()}-${Math.random()}`
  const openid = `auth-openid-${suffix}`

  beforeAll(async () => {
    process.env.JWT_SECRET = 'task-4-e2e-secret-with-at-least-32-chars'
    await prisma.$connect()
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WECHAT_SESSION_CLIENT)
      .useValue({
        exchangeCode: async (code: string) => ({ openid: code === 'valid-code' ? openid : '' }),
      })
      .compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
    await prisma.user.deleteMany({ where: { openid } })
    await prisma.$disconnect()
  })

  it('未登录访问当前用户时返回稳定的鉴权错误', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/users/me').expect(401)

    expect(response.body.code).toBe('AUTH_REQUIRED')
    expect(response.body.requestId).toEqual(expect.any(String))
  })

  it('使用微信 code 登录后可通过 JWT 获取当前用户', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat')
      .send({ code: 'valid-code', ignored: '会被白名单过滤' })

    expect(loginResponse.status, JSON.stringify(loginResponse.body)).toBe(200)

    expect(loginResponse.body.accessToken).toEqual(expect.any(String))
    expect(loginResponse.body.user).toMatchObject({ id: expect.any(String), status: 'active' })

    const currentUserResponse = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200)

    expect(currentUserResponse.body).toEqual({ userId: loginResponse.body.user.id })
  })

  it('拒绝无效的 JWT', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('authorization', 'Bearer invalid-token')
      .expect(401)

    expect(response.body.code).toBe('AUTH_REQUIRED')
  })
})
