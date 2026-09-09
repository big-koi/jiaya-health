import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { WECHAT_SESSION_CLIENT } from '../src/auth/wechat-session.client'
import { configureApp } from '../src/configure-app'
import { PrismaService } from '../src/prisma/prisma.service'

describe('血压统计与首页聚合 API', () => {
  let app: INestApplication
  let ownerToken: string
  let viewerToken: string
  let ownerUserId: string
  let viewerUserId: string
  let familyId: string
  let profileId: string
  let latestRecordId: string
  let attentionEventId: string
  const prisma = new PrismaService()
  const suffix = `${Date.now()}-${Math.random()}`
  const openidPrefix = `task8-${suffix}-`

  beforeAll(async () => {
    process.env.JWT_SECRET = 'task-8-e2e-secret-with-at-least-32-chars'
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
      .send({ name: '统计测试家庭' })
      .expect(201)
    familyId = family.body.id
    const profile = await request(app.getHttpServer())
      .post('/api/v1/profiles')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ familyId, name: '妈妈', elderMode: true })
      .expect(201)
    profileId = profile.body.id

    const now = Date.now()
    const createRecord = (daysAgo: number, systolic: number, diastolic: number, attentionLevel: 'NORMAL' | 'ATTENTION') =>
      prisma.bloodPressureRecord.create({
        data: {
          profileId,
          systolic,
          diastolic,
          measuredAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
          source: 'SELF',
          recordedByUserId: ownerUserId,
          attentionLevel,
          ruleVersion: 'test-v1',
        },
      })

    const latest = await createRecord(1, 120, 80, 'NORMAL')
    latestRecordId = latest.id
    await createRecord(2, 130, 84, 'NORMAL')
    const attentionRecord = await createRecord(3, 150, 96, 'ATTENTION')
    await createRecord(8, 160, 98, 'ATTENTION')
    await createRecord(-1, 210, 120, 'ATTENTION')
    await prisma.bloodPressureRecord.create({
      data: {
        profileId,
        systolic: 200,
        diastolic: 120,
        measuredAt: new Date(now - 24 * 60 * 60 * 1000),
        source: 'SELF',
        recordedByUserId: ownerUserId,
        attentionLevel: 'RECHECK',
        ruleVersion: 'test-v1',
        deletedAt: new Date(),
      },
    })
    const event = await prisma.attentionEvent.create({
      data: {
        profileId,
        recordId: attentionRecord.id,
        type: 'BLOOD_PRESSURE_READING',
        level: 'ATTENTION',
        messageCode: 'BP_ATTENTION',
      },
    })
    attentionEventId = event.id
  })

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: [ownerUserId, viewerUserId] } } })
    if (familyId) await prisma.family.delete({ where: { id: familyId } })
    await prisma.user.deleteMany({ where: { openid: { startsWith: openidPrefix } } })
    await app.close()
    await prisma.$disconnect()
  })

  async function login(code: string): Promise<{ accessToken: string; userId: string }> {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/wechat').send({ code }).expect(200)
    return { accessToken: response.body.accessToken, userId: response.body.user.id }
  }

  it('统计 7 天内未删除记录并正确计算平均值与关注数量', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/blood-pressure/summary')
      .query({ profileId, range: '7d' })
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200)

    expect(response.body).toEqual({
      recordCount: 3,
      avgSystolic: 133.3,
      avgDiastolic: 86.7,
      attentionCount: 1,
    })
  })

  it('只允许 7d 或 30d，并拒绝无档案查看权限的用户', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/blood-pressure/summary')
      .query({ profileId, range: '14d' })
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(400)

    const forbidden = await request(app.getHttpServer())
      .get('/api/v1/blood-pressure/summary')
      .query({ profileId, range: '30d' })
      .set('authorization', `Bearer ${viewerToken}`)
      .expect(403)
    expect(forbidden.body.code).toBe('PROFILE_VIEW_FORBIDDEN')
  })

  it('统计 30 天内截至当前时刻的未删除记录', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/blood-pressure/summary')
      .query({ profileId, range: '30d' })
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200)

    expect(response.body).toEqual({
      recordCount: 4,
      avgSystolic: 140,
      avgDiastolic: 89.5,
      attentionCount: 2,
    })
  })

  it('聚合档案、最新记录、今日任务、七天统计和最新待处理关注事件', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .query({ profileId })
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200)

    expect(response.body).toMatchObject({
      profile: { id: profileId, name: '妈妈', avatar: null, elderMode: true },
      measuredToday: false,
      latestRecord: { id: latestRecordId, profileId, systolic: 120, diastolic: 80 },
      todayTasks: [],
      sevenDaySummary: { recordCount: 3, avgSystolic: 133.3, avgDiastolic: 86.7, attentionCount: 1 },
      attention: { id: attentionEventId, profileId, messageCode: 'BP_ATTENTION', status: 'pending' },
    })
  })

  it('没有记录时返回空统计、空最新记录和空关注事件', async () => {
    const emptyProfile = await request(app.getHttpServer())
      .post('/api/v1/profiles')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ familyId, name: '空档案' })
      .expect(201)

    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .query({ profileId: emptyProfile.body.id })
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200)

    expect(response.body).toMatchObject({
      profile: { id: emptyProfile.body.id, name: '空档案' },
      measuredToday: false,
      latestRecord: null,
      todayTasks: [],
      sevenDaySummary: { recordCount: 0, avgSystolic: null, avgDiastolic: null, attentionCount: 0 },
      attention: null,
    })
  })

  it('存在今日未删除记录时明确返回已测', async () => {
    await prisma.bloodPressureRecord.create({
      data: {
        profileId,
        systolic: 118,
        diastolic: 76,
        measuredAt: new Date(),
        source: 'SELF',
        recordedByUserId: ownerUserId,
        attentionLevel: 'NORMAL',
        ruleVersion: 'test-v1',
      },
    })

    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .query({ profileId })
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200)

    expect(response.body.measuredToday).toBe(true)
  })
})
