import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { WECHAT_SESSION_CLIENT } from '../src/auth/wechat-session.client'
import { configureApp } from '../src/configure-app'
import { PrismaService } from '../src/prisma/prisma.service'

describe('家庭、健康档案与权限 API', () => {
  let app: INestApplication
  const prisma = new PrismaService()
  const suffix = `${Date.now()}-${Math.random()}`
  const testOpenidPrefix = `task5-${suffix}-`
  const createdFamilyIds: string[] = []

  beforeAll(async () => {
    process.env.JWT_SECRET = 'task-5-e2e-secret-with-at-least-32-chars'
    await prisma.$connect()
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WECHAT_SESSION_CLIENT)
      .useValue({ exchangeCode: async (code: string) => ({ openid: `${testOpenidPrefix}${code}` }) })
      .compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()
  })

  afterAll(async () => {
    if (createdFamilyIds.length) {
      await prisma.family.deleteMany({ where: { id: { in: createdFamilyIds } } })
    }
    await prisma.user.deleteMany({ where: { openid: { startsWith: testOpenidPrefix } } })
    await app.close()
    await prisma.$disconnect()
  })

  async function login(code: string): Promise<{ accessToken: string; userId: string }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/wechat')
      .send({ code })
      .expect(200)
    return { accessToken: response.body.accessToken, userId: response.body.user.id }
  }

  it('创建家庭时同步建立 owner 成员关系', async () => {
    const owner = await login('family-owner')
    const response = await request(app.getHttpServer())
      .post('/api/v1/families')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({ name: '我们的家' })
      .expect(201)

    createdFamilyIds.push(response.body.id)
    expect(response.body).toMatchObject({ name: '我们的家', ownerUserId: owner.userId, memberCount: 1 })

    const membership = await prisma.familyMembership.findUniqueOrThrow({
      where: { familyId_userId: { familyId: response.body.id, userId: owner.userId } },
    })
    expect(membership.role).toBe('OWNER')

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/families')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
    expect(listResponse.body).toContainEqual(expect.objectContaining({ id: response.body.id, memberCount: 1 }))

    await request(app.getHttpServer())
      .get(`/api/v1/families/${response.body.id}`)
      .set('authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
  })

  it('创建无账号档案时给创建者授予全部权限', async () => {
    const owner = await login('profile-owner')
    const familyResponse = await request(app.getHttpServer())
      .post('/api/v1/families')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({ name: '健康之家' })
      .expect(201)
    createdFamilyIds.push(familyResponse.body.id)

    const profileResponse = await request(app.getHttpServer())
      .post('/api/v1/profiles')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({ familyId: familyResponse.body.id, name: '爸爸', relationship: 'father' })
      .expect(201)

    expect(profileResponse.body).toMatchObject({
      familyId: familyResponse.body.id,
      linkedUserId: null,
      name: '爸爸',
      createdBy: owner.userId,
    })

    const permissionsResponse = await request(app.getHttpServer())
      .get(`/api/v1/profiles/${profileResponse.body.id}/permissions`)
      .set('authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
    expect(permissionsResponse.body).toContainEqual({
      profileId: profileResponse.body.id,
      userId: owner.userId,
      canView: true,
      canRecord: true,
      canManageReminder: true,
      canManageProfile: true,
      canReceiveAttention: true,
    })

    const profilesResponse = await request(app.getHttpServer())
      .get('/api/v1/profiles')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .expect(200)
    expect(profilesResponse.body).toContainEqual(
      expect.objectContaining({ id: profileResponse.body.id, name: '爸爸' }),
    )

    const updatedResponse = await request(app.getHttpServer())
      .patch(`/api/v1/profiles/${profileResponse.body.id}`)
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({ name: '父亲', elderMode: true })
      .expect(200)
    expect(updatedResponse.body).toMatchObject({ name: '父亲', elderMode: true })
  })

  it('严格按显式档案权限区分无权限用户和只读用户', async () => {
    const owner = await login('permission-owner')
    const viewer = await login('permission-viewer')
    const familyResponse = await request(app.getHttpServer())
      .post('/api/v1/families')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({ name: '权限测试家庭' })
      .expect(201)
    createdFamilyIds.push(familyResponse.body.id)
    const profileResponse = await request(app.getHttpServer())
      .post('/api/v1/profiles')
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({ familyId: familyResponse.body.id, name: '爸爸' })
      .expect(201)

    const forbiddenResponse = await request(app.getHttpServer())
      .get(`/api/v1/profiles/${profileResponse.body.id}`)
      .set('authorization', `Bearer ${viewer.accessToken}`)
      .expect(403)
    expect(forbiddenResponse.body.code).toBe('PROFILE_VIEW_FORBIDDEN')

    await request(app.getHttpServer())
      .patch(`/api/v1/profiles/${profileResponse.body.id}/permissions`)
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({
        userId: viewer.userId,
        canView: true,
        canRecord: false,
        canManageReminder: false,
        canManageProfile: false,
        canReceiveAttention: false,
      })
      .expect(200)

    await request(app.getHttpServer())
      .get(`/api/v1/profiles/${profileResponse.body.id}`)
      .set('authorization', `Bearer ${viewer.accessToken}`)
      .expect(200)

    const writeResponse = await request(app.getHttpServer())
      .patch(`/api/v1/profiles/${profileResponse.body.id}`)
      .set('authorization', `Bearer ${viewer.accessToken}`)
      .send({ name: '不允许修改' })
      .expect(403)
    expect(writeResponse.body.code).toBe('PROFILE_MANAGE_FORBIDDEN')

    await request(app.getHttpServer())
      .patch(`/api/v1/profiles/${profileResponse.body.id}/permissions`)
      .set('authorization', `Bearer ${owner.accessToken}`)
      .send({
        userId: viewer.userId,
        canView: false,
        canRecord: false,
        canManageReminder: false,
        canManageProfile: false,
        canReceiveAttention: false,
      })
      .expect(200)

    await request(app.getHttpServer())
      .get(`/api/v1/profiles/${profileResponse.body.id}`)
      .set('authorization', `Bearer ${viewer.accessToken}`)
      .expect(403)
  })
})
