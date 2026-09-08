import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import { PrimaryButton } from '../../components/PrimaryButton'
import { demoMembers } from '../../mocks/demo-data'
import './index.scss'

export default function FamilyPage(): JSX.Element {
  return (
    <View className="page family-page">
      <View className="family-page__header">
        <Text className="family-page__title">家庭管理</Text>
        <Text className="family-page__subtitle">一个账号，关心全家人的血压记录</Text>
      </View>

      <View className="card family-page__list">
        {demoMembers.map((member) => (
          <View key={member.id} className="family-page__row">
            <ProfileAvatar
              name=""
              initial={member.initial}
              tone={member.tone}
              size="sm"
            />
            <View className="family-page__info">
              <View className="family-page__name-row">
                <Text className="family-page__name">{member.name}</Text>
                {member.role === 'creator' ? (
                  <Text className="family-page__role">创建者</Text>
                ) : null}
                {member.elderMode ? (
                  <Text className="family-page__elder">长辈模式</Text>
                ) : null}
              </View>
              <Text className="family-page__meta">
                {member.relationship} · {member.ageLabel}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <PrimaryButton
        onClick={() => void Taro.showToast({ title: '添加成员即将接入', icon: 'none' })}
      >
        + 邀请家人
      </PrimaryButton>

      <View
        className="card family-page__permission"
        onClick={() => void Taro.showToast({ title: '权限管理即将接入', icon: 'none' })}
      >
        <Text className="family-page__permission-title">权限管理</Text>
        <Text className="family-page__permission-desc">
          设置谁可以查看、代录和配置提醒
        </Text>
      </View>
    </View>
  )
}
