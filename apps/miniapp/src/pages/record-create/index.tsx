import { Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import type { HealthProfileSummary } from '@bp/contracts'
import { PrimaryButton } from '../../components/PrimaryButton'
import { profilesApi } from '../../services/api/profiles.api'
import { recordsApi } from '../../services/api/records.api'
import { useActiveProfileStore } from '../../store/active-profile.store'
import './index.scss'

type InputMode = 'manual' | 'device'

export default function RecordCreatePage(): JSX.Element {
  const [mode, setMode] = useState<InputMode>('manual')
  const [systolic, setSystolic] = useState('128')
  const [diastolic, setDiastolic] = useState('82')
  const [pulse, setPulse] = useState('72')
  const [profiles, setProfiles] = useState<HealthProfileSummary[]>([])
  const [profileIndex, setProfileIndex] = useState(0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [profilesLoaded, setProfilesLoaded] = useState(false)
  const activeProfileId = useActiveProfileStore((state) => state.activeProfileId)

  const measuredAtLabel = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')} ${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`
  }, [])

  useDidShow(() => {
    void (async () => {
      try {
        const profileList = await profilesApi.list()
        setProfiles(profileList)
        const storedId = useActiveProfileStore.getState().activeProfileId
        const index = storedId ? profileList.findIndex((item) => item.id === storedId) : -1
        if (index >= 0) setProfileIndex(index)
      } catch (cause) {
        void Taro.showToast({
          title: cause instanceof Error ? cause.message : '加载测量对象失败',
          icon: 'none',
        })
      } finally {
        setProfilesLoaded(true)
      }
    })()
  })

  useEffect(() => {
    const index = activeProfileId
      ? profiles.findIndex((profile) => profile.id === activeProfileId)
      : -1
    setProfileIndex(index)
  }, [activeProfileId, profiles])

  const selectedProfile =
    activeProfileId === null
      ? null
      : (profiles.find((profile) => profile.id === activeProfileId) ?? null)

  const canSubmit = Boolean(systolic && diastolic) && Boolean(selectedProfile) && !saving

  const handleSave = async (): Promise<void> => {
    if (!systolic || !diastolic) {
      void Taro.showToast({ title: '请填写收缩压和舒张压', icon: 'none' })
      return
    }
    const profile = selectedProfile
    if (!profile) {
      void Taro.showToast({ title: '请先选择测量对象', icon: 'none' })
      return
    }

    setSaving(true)
    try {
      const result = await recordsApi.create({
        profileId: profile.id,
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        ...(pulse ? { pulse: Number(pulse) } : {}),
        measuredAt: new Date().toISOString(),
        source: 'family',
        note: note || null,
      })
      const level = result.attention.level
      const messageCode = result.attention.messageCode
      void Taro.navigateTo({
        url: `/pages/record-result/index?level=${level}&messageCode=${encodeURIComponent(messageCode)}&systolic=${systolic}&diastolic=${diastolic}`,
      })
    } catch (cause) {
      void Taro.showToast({
        title: cause instanceof Error ? cause.message : '保存失败，请稍后重试',
        icon: 'none',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="page record-page">
      <View className="record-page__tabs">
        <View
          className={`record-page__tab ${mode === 'manual' ? 'is-active' : ''}`}
          onClick={() => setMode('manual')}
        >
          <Text>手动输入</Text>
        </View>
        <View
          className={`record-page__tab ${mode === 'device' ? 'is-active' : ''}`}
          onClick={() => setMode('device')}
        >
          <Text>设备同步</Text>
        </View>
      </View>

      {profilesLoaded && !selectedProfile ? (
        <View className="card record-page__device">
          <Text className="record-page__device-title">请先选择一位成员</Text>
          <Text className="safe-hint">选择成员后，记录会保存到对应的健康档案。</Text>
          <View className="record-page__device-action">
            <PrimaryButton onClick={() => void Taro.switchTab({ url: '/pages/family/index' })}>去选择成员</PrimaryButton>
          </View>
        </View>
      ) : mode === 'device' ? (
        <View className="card record-page__device">
          <Text className="record-page__device-title">设备同步即将开放</Text>
          <Text className="safe-hint">
            V1 暂不接入蓝牙血压计，仅为后续设备数据源预留入口。请先使用手动输入完成记录。
          </Text>
          <View className="record-page__device-action">
            <PrimaryButton onClick={() => setMode('manual')}>改用手动输入</PrimaryButton>
          </View>
        </View>
      ) : (
        <>
          <View className="card record-page__inputs">
            <View className="record-page__field">
              <Text className="record-page__label">收缩压（高压）</Text>
              <Input
                className="record-page__input"
                type="number"
                value={systolic}
                placeholder="例如 120"
                onInput={(event) => setSystolic(event.detail.value)}
              />
              <Text className="record-page__unit">mmHg</Text>
            </View>
            <View className="record-page__field">
              <Text className="record-page__label">舒张压（低压）</Text>
              <Input
                className="record-page__input"
                type="number"
                value={diastolic}
                placeholder="例如 80"
                onInput={(event) => setDiastolic(event.detail.value)}
              />
              <Text className="record-page__unit">mmHg</Text>
            </View>
            <View className="record-page__field">
              <Text className="record-page__label">脉搏（可选）</Text>
              <Input
                className="record-page__input"
                type="number"
                value={pulse}
                placeholder="例如 72"
                onInput={(event) => setPulse(event.detail.value)}
              />
              <Text className="record-page__unit">bpm</Text>
            </View>
          </View>

          <View className="card record-page__meta">
            <View className="record-page__meta-row">
              <Text className="record-page__meta-label">测量时间</Text>
              <Text className="record-page__meta-value">{measuredAtLabel}</Text>
            </View>
            <Picker
              mode="selector"
              range={profiles.map((item) => item.name)}
              value={Math.max(profileIndex, 0)}
              onChange={(event) => {
                const profile = profiles[Number(event.detail.value)]
                if (profile) {
                  useActiveProfileStore.getState().selectProfile(profile.familyId, profile.id)
                }
              }}
            >
              <View className="record-page__meta-row">
                <Text className="record-page__meta-label">测量对象</Text>
                <Text className="record-page__meta-value">
                  {selectedProfile?.name ?? '请选择'}
                </Text>
              </View>
            </Picker>
            <View className="record-page__note">
              <Text className="record-page__meta-label">备注（可选）</Text>
              <Textarea
                className="record-page__textarea"
                maxlength={120}
                placeholder="例如：早餐前、运动后"
                value={note}
                onInput={(event) => setNote(event.detail.value)}
              />
            </View>
          </View>

          <PrimaryButton disabled={!canSubmit} loading={saving} onClick={() => void handleSave()}>
            保存记录
          </PrimaryButton>
          <Text className="safe-hint record-page__tip">
            建议静坐休息 5 分钟后再测量，结果更稳定。提示仅供日常参考，不能替代医生诊断。
          </Text>
        </>
      )}
    </View>
  )
}
