import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { FamilyMemberCard } from '../../features/family/FamilyMemberCard'
import {
  familyService,
  type FamilyMemberOverview,
} from '../../features/family/family.service'
import { useActiveProfileStore } from '../../store/active-profile.store'
import { useSessionStore } from '../../store/session.store'
import './index.scss'

const PROFILE_TONES = ['#1fa97a', '#4db6ac', '#3d8bfd', '#e2a03f', '#9b59b6']

export default function FamilyPage(): JSX.Element {
  const [families, setFamilies] = useState<Awaited<ReturnType<typeof familyService.loadOverview>>['families']>([])
  const [members, setMembers] = useState<FamilyMemberOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOverview = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const userId = useSessionStore.getState().currentUser?.userId ?? null
      const overview = await familyService.loadOverview(userId)
      setFamilies(overview.families)
      setMembers(overview.members)
      const storedFamilyId = useActiveProfileStore.getState().activeFamilyId
      if (!storedFamilyId || !overview.families.some((family) => family.id === storedFamilyId)) {
        useActiveProfileStore.getState().selectFamily(overview.families[0]?.id ?? null)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '加载家庭信息失败')
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void loadOverview()
  })

  const activeFamilyId = useActiveProfileStore((state) => state.activeFamilyId)
  const selectedFamilyId =
    activeFamilyId && families.some((family) => family.id === activeFamilyId)
      ? activeFamilyId
      : (families[0]?.id ?? null)
  const visibleMembers = members.filter(
    (member) => member.profile.familyId === selectedFamilyId,
  )
  const familyIds = new Set(families.map((family) => family.id))
  const sharedMembers = members.filter(
    (member) => !familyIds.has(member.profile.familyId),
  )

  const selectMember = (member: FamilyMemberOverview): void => {
    useActiveProfileStore
      .getState()
      .selectProfile(member.profile.familyId, member.profile.id)
    void Taro.navigateTo({
      url: `/pages/family-profile/index?profileId=${member.profile.id}`,
    })
  }

  const openAddMember = (): void => {
    if (!selectedFamilyId) return
    void Taro.navigateTo({
      url: `/pages/family-profile-add/index?familyId=${selectedFamilyId}`,
    })
  }

  return (
    <View className="page family-page">
      <View className="family-page__header">
        <Text className="family-page__title">家庭管理</Text>
        <Text className="family-page__subtitle">一个账号，关心全家人的血压记录</Text>
      </View>

      {loading ? <Text className="family-page__empty">正在加载家庭信息…</Text> : null}
      {!loading && error ? (
        <View className="card family-page__state">
          <Text className="family-page__empty">{error}</Text>
          <PrimaryButton onClick={() => void loadOverview()}>重新加载</PrimaryButton>
        </View>
      ) : null}
      {!loading && !error && families.length === 0 ? (
        <View className="card family-page__state">
          <Text className="family-page__state-title">先建一个属于你们的家庭</Text>
          <Text className="family-page__state-desc">创建后就能添加家人并开始记录血压。</Text>
          <PrimaryButton
            onClick={() => void Taro.navigateTo({ url: '/pages/family-create/index' })}
          >
            创建家庭
          </PrimaryButton>
        </View>
      ) : null}
      {!loading && !error && families.length > 0 ? (
        <>
          <View className="family-page__families">
            {families.map((family) => (
              <View
                key={family.id}
                className={`family-page__family ${family.id === selectedFamilyId ? 'is-active' : ''}`}
                onClick={() => useActiveProfileStore.getState().selectFamily(family.id)}
              >
                <View>
                  <Text className="family-page__family-name">{family.name}</Text>
                  <Text className="family-page__family-meta">
                    {members.filter((member) => member.profile.familyId === family.id).length} 位健康成员
                  </Text>
                </View>
                <Text className="family-page__family-check">
                  {family.id === selectedFamilyId ? '当前家庭' : '切换'}
                </Text>
              </View>
            ))}
          </View>

          <View className="family-page__section-heading">
            <Text className="section-title">家庭成员</Text>
            <Text className="family-page__section-action" onClick={openAddMember}>添加成员</Text>
          </View>
          {visibleMembers.length === 0 ? (
            <View className="card family-page__state family-page__state--compact">
              <Text className="family-page__state-title">这个家庭还没有健康成员</Text>
              <Text className="family-page__state-desc">先添加一位家人，之后可随时补充资料。</Text>
              <PrimaryButton onClick={openAddMember}>添加成员</PrimaryButton>
            </View>
          ) : (
            <View className="card family-page__list">
              {visibleMembers.map((member, index) => (
                <FamilyMemberCard
                  key={member.profile.id}
                  {...member}
                  tone={PROFILE_TONES[index % PROFILE_TONES.length] ?? '#1fa97a'}
                  onSelect={() => selectMember(member)}
                  onEdit={() => void Taro.navigateTo({
                    url: `/pages/family-profile/index?profileId=${member.profile.id}&edit=1`,
                  })}
                />
              ))}
            </View>
          )}

          <PrimaryButton onClick={openAddMember}>添加成员</PrimaryButton>
        </>
      ) : null}
      {!loading && !error && sharedMembers.length > 0 ? (
        <View className="family-page__shared">
          <View className="family-page__section-heading">
            <Text className="section-title">共享给我的成员</Text>
          </View>
          <View className="card family-page__list">
            {sharedMembers.map((member, index) => (
              <FamilyMemberCard
                key={member.profile.id}
                {...member}
                tone={PROFILE_TONES[(visibleMembers.length + index) % PROFILE_TONES.length] ?? '#1fa97a'}
                onSelect={() => selectMember(member)}
                onEdit={() => void Taro.navigateTo({
                  url: `/pages/family-profile/index?profileId=${member.profile.id}&edit=1`,
                })}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}
