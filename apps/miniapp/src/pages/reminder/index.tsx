import { Picker, Switch, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import type { HealthProfileSummary, MeasurementReminderDTO } from '@bp/contracts'
import { PrimaryButton } from '../../components/PrimaryButton'
import { profilesApi } from '../../services/api/profiles.api'
import { remindersApi } from '../../services/api/reminders.api'
import { useActiveProfileStore } from '../../store/active-profile.store'
import './index.scss'

const QUICK_TIMES = ['08:00', '20:00']

export default function ReminderPage(): JSX.Element {
  const [profiles, setProfiles] = useState<HealthProfileSummary[]>([])
  const [profileIndex, setProfileIndex] = useState(0)
  const [reminders, setReminders] = useState<MeasurementReminderDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadReminders = async (profileId: string): Promise<void> => {
    try {
      const items = await remindersApi.list(profileId)
      setReminders(items)
    } catch (cause) {
      void Taro.showToast({
        title: cause instanceof Error ? cause.message : '加载提醒失败',
        icon: 'none',
      })
    }
  }

  useDidShow(() => {
    void (async () => {
      setLoading(true)
      try {
        const profileList = await profilesApi.list()
        setProfiles(profileList)
        const storedId = useActiveProfileStore.getState().activeProfileId
        const index = storedId ? profileList.findIndex((item) => item.id === storedId) : -1
        const targetIndex = index >= 0 ? index : 0
        setProfileIndex(targetIndex)
        const targetId = profileList[targetIndex]?.id
        if (targetId) await loadReminders(targetId)
      } catch (cause) {
        void Taro.showToast({
          title: cause instanceof Error ? cause.message : '加载失败，请稍后重试',
          icon: 'none',
        })
      } finally {
        setLoading(false)
      }
    })()
  })

  const switchProfile = (index: number): void => {
    setProfileIndex(index)
    const targetId = profiles[index]?.id
    if (targetId) {
      const target = profiles[index]
      if (target) useActiveProfileStore.getState().selectProfile(target.familyId, target.id)
      void loadReminders(targetId)
    }
  }

  const toggleReminder = async (reminder: MeasurementReminderDTO, enabled: boolean): Promise<void> => {
    try {
      await remindersApi.update(reminder.id, { enabled })
      setReminders((current) =>
        current.map((item) => (item.id === reminder.id ? { ...item, enabled } : item)),
      )
    } catch (cause) {
      void Taro.showToast({
        title: cause instanceof Error ? cause.message : '更新失败',
        icon: 'none',
      })
    }
  }

  const addReminder = async (timeOfDay: string): Promise<void> => {
    const profile = profiles[profileIndex]
    if (!profile) {
      void Taro.showToast({ title: '请先选择测量对象', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const created = await remindersApi.create({
        profileId: profile.id,
        title: '测量血压提醒',
        timeOfDay,
        repeatType: 'daily',
        enabled: true,
      })
      setReminders((current) => [...current, created])
    } catch (cause) {
      void Taro.showToast({
        title: cause instanceof Error ? cause.message : '添加失败',
        icon: 'none',
      })
    } finally {
      setSaving(false)
    }
  }

  const removeReminder = async (reminder: MeasurementReminderDTO): Promise<void> => {
    try {
      await remindersApi.remove(reminder.id)
      setReminders((current) => current.filter((item) => item.id !== reminder.id))
    } catch (cause) {
      void Taro.showToast({
        title: cause instanceof Error ? cause.message : '删除失败',
        icon: 'none',
      })
    }
  }

  return (
    <View className="page page--plain reminder-page">
      <View className="card reminder-page__profile">
        <Text className="reminder-page__profile-label">提醒对象</Text>
        <Picker
          mode="selector"
          range={profiles.map((item) => item.name)}
          value={Math.min(profileIndex, Math.max(profiles.length - 1, 0))}
          onChange={(event) => switchProfile(Number(event.detail.value))}
        >
          <View className="reminder-page__profile-value">
            <Text>{profiles[profileIndex]?.name ?? '请选择'}</Text>
            <Text className="reminder-page__profile-arrow">›</Text>
          </View>
        </Picker>
      </View>

      <Text className="section-title">提醒时间</Text>
      {loading ? (
        <Text className="reminder-page__empty">加载中…</Text>
      ) : reminders.length === 0 ? (
        <Text className="reminder-page__empty">
          暂无提醒，点击下方时间添加固定时段的测量提醒。
        </Text>
      ) : (
        <View className="card reminder-page__slots">
          {reminders.map((reminder) => (
            <View key={reminder.id} className="reminder-page__slot">
              <View className="reminder-page__slot-info">
                <Text className="reminder-page__slot-label">{reminder.title}</Text>
                <Text className="reminder-page__slot-time">{reminder.timeOfDay}</Text>
              </View>
              <View className="reminder-page__slot-actions">
                <Text
                  className="reminder-page__remove"
                  onClick={() => void removeReminder(reminder)}
                >
                  删除
                </Text>
                <Switch
                  checked={reminder.enabled}
                  color="#1fa97a"
                  onChange={(event) => void toggleReminder(reminder, Boolean(event.detail.value))}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <Text className="section-title">添加提醒</Text>
      <View className="reminder-page__quick">
        {QUICK_TIMES.map((time) => (
          <PrimaryButton key={time} disabled={saving} onClick={() => void addReminder(time)}>
            每天 {time}
          </PrimaryButton>
        ))}
      </View>

      <Text className="safe-hint">
        提醒按所选成员保存到服务端，后续将按档案权限与时间发送提醒。
      </Text>
    </View>
  )
}
