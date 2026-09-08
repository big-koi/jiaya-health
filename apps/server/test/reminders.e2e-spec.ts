import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { WECHAT_SESSION_CLIENT } from '../src/auth/wechat-session.client'
import { configureApp } from '../src/configure-app'
import { PrismaService } from '../src/prisma/prisma.service'
import { ReminderTaskService } from '../src/reminders/reminder-task.service'

describe('测量提醒 API', () => {
  let app: INestApplication
  let ownerToken: string
  let viewerToken: string
  let ownerUserId: string
  let viewerUserId: string
  let familyId: string
  let profileId: string
  const prisma = new PrismaService()
  const suffix = `${Date.now()}-${Math.random()}`
  const openidPrefix = `task9-${suffix}-`

  beforeAll(async () => {
    process.env.JWT_SECRET = 'task-9-e2e-secret-with-at-least-32-chars'
    process.env.ATTENTION_RULE_VERSION = 'test-v1'
    process.env.ATTENTION_SYSTOLIC_MIN = '140'
    process.env.RECHECK_SYSTOLIC_MIN = '180'
    process.env.ATTENTION_DIASTOLIC_MIN = '90'
    process.env.RECHECK_DIASTOLIC_MIN = '120'
    process.env.REMINDER_COMPLETION_WINDOW_MINUTES = '30'
    process.env.APP_TIMEZONE_OFFSET_MINUTES = '480'
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
      .send({ name: '提醒测试家庭' })
      .expect(201)
    familyId = family.body.id
    const profile = await request(app.getHttpServer())
      .post('/api/v1/profiles')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ familyId, name: '爷爷' })
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
    const response = await request(app.getHttpServer()).post('/api/v1/auth/wechat').send({ code }).expect(200)
    return { accessToken: response.body.accessToken, userId: response.body.user.id }
  }

  it('拒绝没有 canManageReminder 权限的用户创建提醒', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/reminders')
      .set('authorization', `Bearer ${viewerToken}`)
      .send({ profileId, title: '早间测量', timeOfDay: '08:00', repeatType: 'daily' })
      .expect(403)

    expect(response.body.code).toBe('PROFILE_REMINDER_MANAGE_FORBIDDEN')
  })

  it('支持创建、查看、修改和删除提醒', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/reminders')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({
        profileId,
        title: '工作日早间测量',
        timeOfDay: '08:00',
        repeatType: 'weekdays',
        weekdays: [1, 3, 5],
        lateRemindMinutes: 20,
      })
      .expect(201)

    expect(created.body).toMatchObject({
      profileId,
      createdByUserId: ownerUserId,
      title: '工作日早间测量',
      timeOfDay: '08:00',
      repeatType: 'weekdays',
      weekdays: [1, 3, 5],
      enabled: true,
      lateRemindMinutes: 20,
    })

    const list = await request(app.getHttpServer())
      .get('/api/v1/reminders')
      .query({ profileId })
      .set('authorization', `Bearer ${viewerToken}`)
      .expect(200)
    expect(list.body).toContainEqual(expect.objectContaining({ id: created.body.id }))

    await request(app.getHttpServer())
      .patch(`/api/v1/reminders/${created.body.id}`)
      .set('authorization', `Bearer ${viewerToken}`)
      .send({ title: '越权修改' })
      .expect(403)
    await request(app.getHttpServer())
      .delete(`/api/v1/reminders/${created.body.id}`)
      .set('authorization', `Bearer ${viewerToken}`)
      .expect(403)
    await request(app.getHttpServer())
      .patch(`/api/v1/reminders/${created.body.id}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ weekdays: null })
      .expect(400)

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/reminders/${created.body.id}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ title: '更新后的提醒', repeatType: 'daily', weekdays: null, enabled: false })
      .expect(200)
    expect(updated.body).toMatchObject({ title: '更新后的提醒', repeatType: 'daily', weekdays: null, enabled: false })

    await request(app.getHttpServer())
      .delete(`/api/v1/reminders/${created.body.id}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(204)
    const afterDelete = await request(app.getHttpServer())
      .get('/api/v1/reminders')
      .query({ profileId })
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200)
    expect(afterDelete.body).not.toContainEqual(expect.objectContaining({ id: created.body.id }))
  })

  it.each([
    { name: '无效时间', input: { title: '提醒', timeOfDay: '8:00', repeatType: 'daily' } },
    { name: '工作日缺少星期', input: { title: '提醒', timeOfDay: '08:00', repeatType: 'weekdays' } },
    { name: '星期超出范围', input: { title: '提醒', timeOfDay: '08:00', repeatType: 'weekdays', weekdays: [0, 8] } },
    { name: '每日提醒携带星期', input: { title: '提醒', timeOfDay: '08:00', repeatType: 'daily', weekdays: [1] } },
  ])('拒绝无效提醒参数：$name', async ({ input }) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/reminders')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ profileId, ...input })
      .expect(400)
    expect(response.body.code).toBe('INVALID_REMINDER')
  })

  it('附近存在测量记录时在首页返回已完成任务', async () => {
    const now = new Date()
    const local = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const timeOfDay = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`

    await request(app.getHttpServer())
      .post('/api/v1/reminders')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ profileId, title: '当前测量', timeOfDay, repeatType: 'daily' })
      .expect(201)
    await request(app.getHttpServer())
      .post('/api/v1/blood-pressure')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ profileId, systolic: 126, diastolic: 82, measuredAt: now.toISOString(), source: 'self' })
      .expect(201)

    const dashboard = await request(app.getHttpServer())
      .get('/api/v1/dashboard')
      .query({ profileId })
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200)
    expect(dashboard.body.todayTasks).toContainEqual({ time: timeOfDay, status: 'completed' })
  })

  it('按固定时区计算已完成、待完成、逾期和工作日任务', async () => {
    const profile = await request(app.getHttpServer())
      .post('/api/v1/profiles')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ familyId, name: '任务状态档案' })
      .expect(201)
    const statusProfileId = profile.body.id

    await prisma.measurementReminder.createMany({
      data: [
        { profileId: statusProfileId, createdByUserId: ownerUserId, title: '早间', timeOfDay: '08:00', repeatType: 'DAILY' },
        { profileId: statusProfileId, createdByUserId: ownerUserId, title: '晚间', timeOfDay: '20:00', repeatType: 'DAILY' },
        { profileId: statusProfileId, createdByUserId: ownerUserId, title: '逾期', timeOfDay: '07:00', repeatType: 'DAILY', lateRemindMinutes: 15 },
        { profileId: statusProfileId, createdByUserId: ownerUserId, title: '周三不生效', timeOfDay: '10:00', repeatType: 'WEEKDAYS', weekdays: [3] },
        { profileId: statusProfileId, createdByUserId: ownerUserId, title: '已禁用', timeOfDay: '11:00', repeatType: 'DAILY', enabled: false },
      ],
    })
    await prisma.bloodPressureRecord.create({
      data: {
        profileId: statusProfileId,
        systolic: 126,
        diastolic: 82,
        measuredAt: new Date('2026-09-08T08:13:00+08:00'),
        source: 'SELF',
        recordedByUserId: ownerUserId,
        attentionLevel: 'NORMAL',
        ruleVersion: 'test-v1',
      },
    })

    const tasks = await app
      .get(ReminderTaskService)
      .getTodayTasks(statusProfileId, new Date('2026-09-08T12:00:00+08:00'))

    expect(tasks).toEqual([
      { time: '07:00', status: 'late' },
      { time: '08:00', status: 'completed' },
      { time: '20:00', status: 'pending' },
    ])
  })

  it('一条测量记录只完成距离最近的一个提醒', async () => {
    const profile = await request(app.getHttpServer())
      .post('/api/v1/profiles')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ familyId, name: '临近提醒档案' })
      .expect(201)
    const matchingProfileId = profile.body.id
    await prisma.measurementReminder.createMany({
      data: [
        { profileId: matchingProfileId, createdByUserId: ownerUserId, title: '提醒一', timeOfDay: '08:00' },
        { profileId: matchingProfileId, createdByUserId: ownerUserId, title: '提醒二', timeOfDay: '08:15' },
      ],
    })
    await prisma.bloodPressureRecord.create({
      data: {
        profileId: matchingProfileId,
        systolic: 126,
        diastolic: 82,
        measuredAt: new Date('2026-09-08T08:13:00+08:00'),
        source: 'SELF',
        recordedByUserId: ownerUserId,
        attentionLevel: 'NORMAL',
        ruleVersion: 'test-v1',
      },
    })

    const tasks = await app
      .get(ReminderTaskService)
      .getTodayTasks(matchingProfileId, new Date('2026-09-08T08:20:00+08:00'))
    expect(tasks).toEqual([
      { time: '08:00', status: 'pending' },
      { time: '08:15', status: 'completed' },
    ])
  })

  it('跨午夜但仍在窗口内的记录可以完成当天提醒', async () => {
    const profile = await request(app.getHttpServer())
      .post('/api/v1/profiles')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ familyId, name: '跨日提醒档案' })
      .expect(201)
    const midnightProfileId = profile.body.id
    await prisma.measurementReminder.create({
      data: { profileId: midnightProfileId, createdByUserId: ownerUserId, title: '午夜提醒', timeOfDay: '00:00' },
    })
    await prisma.bloodPressureRecord.create({
      data: {
        profileId: midnightProfileId,
        systolic: 126,
        diastolic: 82,
        measuredAt: new Date('2026-09-07T23:45:00+08:00'),
        source: 'SELF',
        recordedByUserId: ownerUserId,
        attentionLevel: 'NORMAL',
        ruleVersion: 'test-v1',
      },
    })

    const tasks = await app
      .get(ReminderTaskService)
      .getTodayTasks(midnightProfileId, new Date('2026-09-08T00:10:00+08:00'))
    expect(tasks).toEqual([{ time: '00:00', status: 'completed' }])
  })
})
