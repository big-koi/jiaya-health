import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { PrismaService } from '../src/prisma/prisma.service'

describe('V1 Prisma schema', () => {
  const prisma = new PrismaService()

  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('persists the core user, family, profile, and blood pressure relationships', async () => {
    const suffix = `${Date.now()}-${Math.random()}`
    const user = await prisma.user.create({
      data: { openid: `openid-${suffix}`, nickname: '小明' },
    })
    const family = await prisma.family.create({
      data: { name: '我们家', ownerUserId: user.id },
    })
    await prisma.familyMembership.create({
      data: { familyId: family.id, userId: user.id, role: 'OWNER' },
    })
    const profile = await prisma.healthProfile.create({
      data: {
        familyId: family.id,
        linkedUserId: null,
        name: '爸爸',
        createdByUserId: user.id,
      },
    })
    const record = await prisma.bloodPressureRecord.create({
      data: {
        profileId: profile.id,
        systolic: 128,
        diastolic: 82,
        measuredAt: new Date('2026-09-07T08:12:00+08:00'),
        source: 'FAMILY',
        recordedByUserId: user.id,
        attentionLevel: 'NORMAL',
        ruleVersion: 'v1',
      },
    })

    expect(profile.linkedUserId).toBeNull()
    expect(record.source).toBe('FAMILY')
    expect(record.deletedAt).toBeNull()
  })

  it('prevents a user from joining the same family twice', async () => {
    const suffix = `${Date.now()}-${Math.random()}`
    const user = await prisma.user.create({ data: { openid: `unique-${suffix}` } })
    const family = await prisma.family.create({
      data: { name: '唯一家庭', ownerUserId: user.id },
    })
    const membership = { familyId: family.id, userId: user.id, role: 'MEMBER' as const }

    await prisma.familyMembership.create({ data: membership })

    await expect(prisma.familyMembership.create({ data: membership })).rejects.toMatchObject({
      code: 'P2002',
    })
  })
})
