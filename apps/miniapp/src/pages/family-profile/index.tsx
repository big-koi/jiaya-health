import { Input, Switch, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { useRef, useState } from 'react'

import { PrimaryButton } from '../../components/PrimaryButton'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import { profileService, type ProfileDetail } from '../../features/profile/profile.service'
import { profilesApi } from '../../services/api/profiles.api'
import { useActiveProfileStore } from '../../store/active-profile.store'
import { useSessionStore } from '../../store/session.store'
import './index.scss'

export default function FamilyProfilePage(): JSX.Element {
  const { params } = useRouter()
  const profileId = params.profileId ?? ''
  const [detail, setDetail] = useState<ProfileDetail | null>(null)
  const [editing, setEditing] = useState(params.edit === '1')
  const [name, setName] = useState('')
  const [elderMode, setElderMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitInFlight = useRef(false)

  const load = async (): Promise<void> => {
    if (!profileId) {
      setError('未找到成员档案')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const userId = useSessionStore.getState().currentUser?.userId ?? null
      const result = await profileService.loadDetail(profileId, userId)
      setDetail(result)
      setName(result.profile.name)
      setElderMode(result.profile.elderMode)
      if (!result.canManageProfile) setEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '加载成员详情失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void load()
  })

  const save = async (): Promise<void> => {
    if (submitInFlight.current || !detail?.canManageProfile) return
    const normalizedName = name.trim()
    if (!normalizedName) {
      setError('请填写成员姓名')
      return
    }
    submitInFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      const profile = await profilesApi.update(profileId, {
        name: normalizedName,
        elderMode,
      })
      setDetail({ ...detail, profile })
      setEditing(false)
      await Taro.showToast({ title: '成员资料已更新', icon: 'success' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败，请稍后重试')
    } finally {
      submitInFlight.current = false
      setSubmitting(false)
    }
  }

  const switchToProfile = (): void => {
    if (!detail) return
    useActiveProfileStore
      .getState()
      .selectProfile(detail.profile.familyId, detail.profile.id)
    void Taro.switchTab({ url: '/pages/home/index' })
  }

  if (loading) {
    return <View className="page page--plain profile-detail-page"><Text>正在加载成员详情…</Text></View>
  }
  if (error && !detail) {
    return (
      <View className="page page--plain profile-detail-page">
        <View className="card profile-detail-page__state">
          <Text>{error}</Text>
          <PrimaryButton onClick={() => void load()}>重新加载</PrimaryButton>
        </View>
      </View>
    )
  }
  if (!detail) return <View className="page page--plain profile-detail-page" />

  const { profile, canManageProfile } = detail
  return (
    <View className="page page--plain profile-detail-page">
      <View className="profile-detail-page__hero">
        <ProfileAvatar name="" initial={profile.name.slice(0, 1)} tone="#1fa97a" size="lg" />
        <Text className="profile-detail-page__name">{profile.name}</Text>
        {profile.elderMode ? <Text className="profile-detail-page__elder">长辈模式</Text> : null}
      </View>
      <View className="card profile-detail-page__card">
        {editing ? (
          <>
            <Text className="profile-detail-page__label">姓名</Text>
            <Input className="profile-detail-page__input" value={name} onInput={(event) => setName(event.detail.value)} />
            <View className="profile-detail-page__toggle">
              <Text>长辈模式</Text>
              <Switch checked={elderMode} color="#1fa97a" onChange={(event) => setElderMode(Boolean(event.detail.value))} />
            </View>
            {error ? <Text className="profile-detail-page__error">{error}</Text> : null}
            <PrimaryButton disabled={submitting} loading={submitting} onClick={() => void save()}>保存修改</PrimaryButton>
          </>
        ) : (
          <>
            <View className="profile-detail-page__row"><Text>关系</Text><Text>{profile.relationship || '未设置'}</Text></View>
            <View className="profile-detail-page__row"><Text>生日</Text><Text>{profile.birthday?.slice(0, 10) || '未设置'}</Text></View>
            <View className="profile-detail-page__row"><Text>账号状态</Text><Text>{profile.linkedUserId ? '已绑定账号' : '未绑定账号'}</Text></View>
            {canManageProfile ? <Text className="profile-detail-page__edit" onClick={() => setEditing(true)}>编辑成员</Text> : null}
          </>
        )}
      </View>
      {!editing ? <PrimaryButton onClick={switchToProfile}>切换到这位成员</PrimaryButton> : null}
    </View>
  )
}
