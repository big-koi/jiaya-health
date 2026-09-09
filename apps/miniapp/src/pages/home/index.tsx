import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import type { BloodPressureRecordDTO, HealthProfileSummary } from '@bp/contracts'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import { StatusPill } from '../../components/StatusPill'
import { formatMeasuredAt } from '../../mocks/demo-data'
import { dashboardApi } from '../../services/api/dashboard.api'
import { profilesApi } from '../../services/api/profiles.api'
import { recordsApi } from '../../services/api/records.api'
import { useActiveProfileStore } from '../../store/active-profile.store'
import './index.scss'

const PROFILE_TONES = ['#1fa97a', '#4db6ac', '#3d8bfd', '#e2a03f', '#9b59b6']

const quickActions = [
  { key: 'record', label: '记录血压', path: '/pages/record-create/index', tab: true },
  { key: 'history', label: '历史数据', path: '/pages/record-history/index', tab: false },
  { key: 'tips', label: '关注提示', path: '/pages/record-result/index', tab: false },
  { key: 'reminder', label: '提醒设置', path: '/pages/reminder/index', tab: false },
] as const

export default function HomePage(): JSX.Element {
  const [profiles, setProfiles] = useState<HealthProfileSummary[]>([])
  const [latest, setLatest] = useState<BloodPressureRecordDTO | null>(null)
  const [recentRecords, setRecentRecords] = useState<BloodPressureRecordDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeProfileId = useActiveProfileStore((state) => state.activeProfileId)

  const loadDashboard = async (profileId: string): Promise<void> => {
    try {
      const [dashboard, records] = await Promise.all([
        dashboardApi.get(profileId),
        recordsApi.list({ profileId, limit: 5 }),
      ])
      setLatest(dashboard.latestRecord)
      setRecentRecords(records.items)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '加载失败，请稍后重试')
    }
  }

  useDidShow(() => {
    void (async () => {
      setLoading(true)
      try {
        const profileList = await profilesApi.list()
        setProfiles(profileList)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '加载失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    })()
  })

  useEffect(() => {
    if (!activeProfileId || !profiles.some((profile) => profile.id === activeProfileId)) {
      setLatest(null)
      setRecentRecords([])
      return
    }
    void loadDashboard(activeProfileId)
  }, [activeProfileId, profiles])

  const switchProfile = (profileId: string): void => {
    if (profileId === activeProfileId) return
    const target = profiles.find((item) => item.id === profileId)
    if (target) useActiveProfileStore.getState().selectProfile(target.familyId, target.id)
  }

  const activeMember = useMemo(
    () => profiles.find((item) => item.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  )

  const openAction = (path: string, tab: boolean): void => {
    if (tab) {
      void Taro.switchTab({ url: path })
      return
    }
    void Taro.navigateTo({ url: path })
  }

  if (loading) {
    return (
      <View className="page home-page">
        <Text className="home-page__greeting">加载中…</Text>
      </View>
    )
  }

  if (profiles.length === 0) {
    return (
      <View className="page home-page">
        <View className="home-page__header">
          <Text className="home-page__brand">家压</Text>
        </View>
        <View className="card home-page__latest">
          <Text className="home-page__greeting">还没有家庭成员档案</Text>
          <Text className="home-page__greeting">
            登录后可先创建家庭，再从「记录血压」添加测量对象。
          </Text>
        </View>
      </View>
    )
  }

  if (!activeMember) {
    return (
      <View className="page home-page">
        <View className="home-page__header">
          <View>
            <Text className="home-page__brand">家压</Text>
            <Text className="home-page__greeting">请先选择一位成员</Text>
          </View>
        </View>
        <View className="home-page__members">
          {profiles.map((member, index) => (
            <View key={member.id} onClick={() => switchProfile(member.id)}>
              <ProfileAvatar
                name={member.name}
                initial={member.name.slice(0, 1) || '家'}
                tone={PROFILE_TONES[index % PROFILE_TONES.length] ?? '#1fa97a'}
              />
            </View>
          ))}
        </View>
        <View className="card home-page__latest">
          <Text className="home-page__greeting">选择后会加载对应成员的首页摘要和近期记录。</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="page home-page">
      <View className="home-page__header">
        <View>
          <Text className="home-page__brand">家压</Text>
          <Text className="home-page__greeting">今天也要好好记录家人的血压</Text>
        </View>
        <View
          className="home-page__settings"
          onClick={() => void Taro.switchTab({ url: '/pages/mine/index' })}
        >
          <Text className="home-page__settings-icon">设</Text>
        </View>
      </View>

      <View className="home-page__members">
        {profiles.map((member, index) => (
          <View key={member.id} onClick={() => switchProfile(member.id)}>
            <ProfileAvatar
              name={member.name}
              initial={member.name.slice(0, 1) || '家'}
              tone={PROFILE_TONES[index % PROFILE_TONES.length] ?? '#1fa97a'}
              active={member.id === activeProfileId}
            />
          </View>
        ))}
        <View
          className="home-page__add"
          onClick={() => void Taro.switchTab({ url: '/pages/family/index' })}
        >
          <View className="home-page__add-circle">
            <Text className="home-page__add-plus">+</Text>
          </View>
          <Text className="home-page__add-text">添加</Text>
        </View>
      </View>

      {latest ? (
        <View className="card home-page__latest">
          <View className="home-page__latest-top">
            <Text className="home-page__latest-name">{activeMember?.name ?? '家人'}的最近读数</Text>
            <StatusPill level={latest.attentionLevel} />
          </View>
          <View className="home-page__latest-values">
            <Text className="home-page__bp">
              {latest.systolic}
              <Text className="home-page__bp-sep">/</Text>
              {latest.diastolic}
            </Text>
            <Text className="home-page__unit">mmHg</Text>
          </View>
          <View className="home-page__latest-meta">
            <Text className="home-page__meta-item">脉搏 {latest.pulse ?? '--'} bpm</Text>
            <Text className="home-page__meta-item">{formatMeasuredAt(latest.measuredAt)}</Text>
          </View>
        </View>
      ) : (
        <View className="card home-page__latest">
          <Text className="home-page__greeting">暂无读数，快去记录第一条吧</Text>
        </View>
      )}

      {error ? <Text className="home-page__greeting">{error}</Text> : null}

      <View className="home-page__actions">
        {quickActions.map((action) => (
          <View
            key={action.key}
            className="home-page__action"
            onClick={() => openAction(action.path, action.tab)}
          >
            <View className={`home-page__action-icon home-page__action-icon--${action.key}`}>
              <Text className="home-page__action-mark">{action.label.slice(0, 1)}</Text>
            </View>
            <Text className="home-page__action-label">{action.label}</Text>
          </View>
        ))}
      </View>

      <View className="home-page__section">
        <Text className="section-title">近期记录</Text>
        <View className="card home-page__list">
          {recentRecords.length > 0 ? (
            recentRecords.map((record) => (
              <View key={record.id} className="home-page__row">
                <View>
                  <Text className="home-page__row-time">{formatMeasuredAt(record.measuredAt)}</Text>
                  <Text className="home-page__row-bp">
                    {record.systolic}/{record.diastolic} mmHg
                  </Text>
                </View>
                <StatusPill level={record.attentionLevel} />
              </View>
            ))
          ) : (
            <Text className="home-page__greeting">还没有血压记录</Text>
          )}
        </View>
      </View>
    </View>
  )
}
