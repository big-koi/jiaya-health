import { Text, View } from '@tarojs/components'

import { ProfileAvatar } from '../../components/ProfileAvatar'
import { StatusPill } from '../../components/StatusPill'
import type { FamilyMemberOverview } from './family.service'

type FamilyMemberCardProps = FamilyMemberOverview & {
  tone: string
  onSelect: () => void
  onEdit: () => void
}

export function FamilyMemberCard({
  profile,
  dashboard,
  canManageProfile,
  tone,
  onSelect,
  onEdit,
}: FamilyMemberCardProps): JSX.Element {
  const latest = dashboard?.latestRecord ?? null
  const attentionLevel = dashboard?.attention?.level ?? latest?.attentionLevel ?? 'normal'
  const measuredToday = dashboard?.measuredToday ?? false

  return (
    <View
      className="family-member-card"
      data-profile-id={profile.id}
      onClick={onSelect}
    >
      <ProfileAvatar
        name=""
        initial={profile.name.slice(0, 1) || '家'}
        tone={tone}
        size="sm"
      />
      <View className="family-member-card__body">
        <View className="family-member-card__heading">
          <Text className="family-member-card__name">{profile.name}</Text>
          <Text className="family-member-card__relation">
            {profile.elderMode ? '长辈' : '家庭成员'}
          </Text>
          {profile.elderMode ? (
            <Text className="family-member-card__elder">长辈模式</Text>
          ) : null}
        </View>
        {dashboard ? (
          <>
            <Text className="family-member-card__reading">
              {latest ? `${latest.systolic}/${latest.diastolic} mmHg` : '暂无最近测量'}
            </Text>
            <View className="family-member-card__status-row">
              <Text
                className={`family-member-card__today ${measuredToday ? 'is-complete' : ''}`}
              >
                {measuredToday ? '今日已测' : '今日待测'}
              </Text>
              <StatusPill level={attentionLevel} />
            </View>
          </>
        ) : (
          <Text className="family-member-card__reading">摘要暂不可用</Text>
        )}
      </View>
      {canManageProfile ? (
        <Text
          className="family-member-card__edit"
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
        >
          编辑成员
        </Text>
      ) : null}
      <Text className="family-member-card__chevron">›</Text>
    </View>
  )
}
