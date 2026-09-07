import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { WECHAT_SESSION_CLIENT } from '../src/auth/wechat-session.client'
import { configureApp } from '../src/configure-app'
import { PrismaService } from '../src/prisma/prisma.service'

describe('血压记录 API', () => {
  let app: INestApplication
  let ownerToken: string
  let viewerToken: string
  let ownerUserId: string
  let viewerUserId: string
  let familyId: string
  let profileId: string
  const prisma = new PrismaService()
  const suffix = `${Date.now()}-${Math.random()}`
  const openidPrefix = `task7-${suffix}-`

  beforeAll(async () => {
    process.env.JWT_SECRET = 'task-7-e2e-secret-with-at-least-32-chars'
    process.env.ATTENTION_RULE_VERSION = 'test-v1'
    process.env.ATTENTION_SYSTOLIC_MIN = '140'
    process.env.RECHECK_SYSTOLIC_MIN = '180'
    process.env.ATTENTION_DIASTOLIC_MIN = '90'
    process.env.RECHECK_DIASTOLIC_MIN = '120'
    await prisma.$connect()
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WECHAT_SESSION_CLIENT)
      .useValue({ exchangeCode: async (code: string) => ({ openid: `${openidPrefix}${code}` }) })
      .compile()
    app = moduleRef.createNestApplication()
    configureApp(app)
    await app.init()

    const owner = await login('owner')
    const viewer = await login('viewer')
    ownerToken = owner.accessToken
    viewerToken = viewer.accessToken
    ownerUserId = owner.userId
    viewerUserId = viewer.userId

    const family = await request(app.getHttpServer())
      .post('/api/v1/families')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ name: '血压测试家庭' })
      .expect(201)
    familyId = family.body.id
    const profile = await request(app.getHttpServer())
      .post('/api/v1/profiles')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ familyId, name: '爸爸' })
      .expect(201)
    profileId = profile.body.id
    await request(app.getHttpServer())
      .patch(`/api/v1/profiles/${profileId}/permissions`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({
        userId: viewerUserId,
        canView: true,
        canRecord: false,
        canManageReminder: false,
        canManageProfile: false,
        canReceiveAttention: false,
      })
      .expect(200)
  })

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [ownerUserId, viewerUserId] } } })
    if (familyId) await prisma.family.delete({ where: { id: familyId } })
    await prisma.user.deleteMany({ where: { openid: { startsWith: openidPrefix } } })
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

  it('使用 JWT 用户和规则结果事务创建血压记录', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/blood-pressure')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({
        profileId,
        systolic: 180,
        diastolic: 82,
        pulse: 72,
        measuredAt: '2026-09-07T08:12:00+08:00',
        source: 'family',
        measurementContext: { medication: 'before' },
        note: '',
        recordedByUserId: '客户端伪造用户',
      })
      .expect(201)

    expect(response.body.record).toMatchObject({
      profileId,
      recordedByUserId: ownerUserId,
      attentionLevel: 'recheck',
      ruleVersion: 'test-v1',
    })
    expect(response.body.attention).toEqual({
      level: 'recheck',
      messageCode: 'BP_RECHECK',
      requireRecheck: true,
      ruleVersion: 'test-v1',
    })

    const event = await prisma.attentionEvent.findFirstOrThrow({ where: { recordId: response.body.record.id } })
    expect(event.messageCode).toBe('BP_RECHECK')
    await expect(
      prisma.auditLog.findFirstOrThrow({
        where: { actorUserId: ownerUserId, targetId: response.body.record.id, action: 'BLOOD_PRESSURE_CREATED' },
      }),
    ).resolves.toBeTruthy()
  })

  it('拒绝没有 canRecord 权限的用户创建记录', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/blood-pressure')
      .set('authorization', `Bearer ${viewerToken}`)
      .send({
        profileId,
        systolic: 128,
        diastolic: 82,
        measuredAt: '2026-09-07T09:00:00+08:00',
        source: 'family',
      })
      .expect(403)

    expect(response.body.code).toBe('PROFILE_RECORD_FORBIDDEN')
  })

  it.each([
    { name: '过低收缩压', patch: { systolic: 39 } },
    { name: '过高舒张压', patch: { diastolic: 201 } },
    { name: '非整数脉搏', patch: { pulse: 72.5 } },
    { name: '设备来源', patch: { source: 'device' } },
    { name: '无效测量时间', patch: { measuredAt: 'not-a-date' } },
  ])('拒绝无效输入：$name', async ({ patch }) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/blood-pressure')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({
        profileId,
        systolic: 128,
        diastolic: 82,
        pulse: 72,
        measuredAt: '2026-09-07T10:00:00+08:00',
        source: 'self',
        ...patch,
      })
      .expect(400)
    expect(response.body.code).toBe('INVALID_BP_READING')
  })

  it('支持查询、重新计算修改结果和软删除', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/blood-pressure')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({
        profileId,
        systolic: 128,
        diastolic: 82,
        measuredAt: '2026-09-08T08:00:00+08:00',
        source: 'self',
      })
      .expect(201)
    const recordId = created.body.record.id

    await request(app.getHttpServer())
      .get(`/api/v1/blood-pressure/${recordId}`)
      .set('authorization', `Bearer ${viewerToken}`)
      .expect(200)

    const history = await request(app.getHttpServer())
      .get('/api/v1/blood-pressure')
      .query({ profileId, from: '2026-09-08T00:00:00+08:00', to: '2026-09-09T00:00:00+08:00' })
      .set('authorization', `Bearer ${viewerToken}`)
      .expect(200)
    expect(history.body.items).toContainEqual(expect.objectContaining({ id: recordId }))

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/blood-pressure/${recordId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ systolic: 140 })
      .expect(200)
    expect(updated.body).toMatchObject({ attentionLevel: 'attention', ruleVersion: 'test-v1' })

    await request(app.getHttpServer())
      .delete(`/api/v1/blood-pressure/${recordId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(204)
    await request(app.getHttpServer())
      .get(`/api/v1/blood-pressure/${recordId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(404)
    const afterDelete = await request(app.getHttpServer())
      .get('/api/v1/blood-pressure')
      .query({ profileId })
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200)
    expect(afterDelete.body.items).not.toContainEqual(expect.objectContaining({ id: recordId }))

    const stored = await prisma.bloodPressureRecord.findUniqueOrThrow({ where: { id: recordId } })
    expect(stored.deletedAt).toEqual(expect.any(Date))
  })
})
