import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import { StatusPill } from '../../components/StatusPill'
import {
  demoMembers,
  demoRecords,
  formatMeasuredAt,
} from '../../mocks/demo-data'
import './index.scss'

const quickActions = [
  { key: 'record', label: '记录血压', path: '/pages/record-create/index', tab: true },
  { key: 'history', label: '历史数据', path: '/pages/record-history/index', tab: false },
  { key: 'tips', label: '关注提示', path: '/pages/record-result/index', tab: false },
  { key: 'reminder', label: '提醒设置', path: '/pages/reminder/index', tab: false },
] as const

export default function HomePage(): JSX.Element {
  const [activeId, setActiveId] = useState(demoMembers[0]?.id ?? '')
  const activeMember = useMemo(
    () => demoMembers.find((member) => member.id === activeId) ?? demoMembers[0],
    [activeId],
  )
  const latest = demoRecords[0]

  if (!activeMember || !latest) {
    return (
      <View className="page home-page">
        <Text className="home-page__greeting">暂无演示数据</Text>
      </View>
    )
  }

  const openAction = (path: string, tab: boolean): void => {
    if (tab) {
      void Taro.switchTab({ url: path })
      return
    }
    void Taro.navigateTo({ url: path })
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
        {demoMembers.map((member) => (
          <View key={member.id} onClick={() => setActiveId(member.id)}>
            <ProfileAvatar
              name={member.name}
              initial={member.initial}
              tone={member.tone}
              active={member.id === activeId}
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

      <View className="card home-page__latest">
        <View className="home-page__latest-top">
          <Text className="home-page__latest-name">{activeMember.name}的最近读数</Text>
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
          {demoRecords.map((record) => (
            <View key={record.id} className="home-page__row">
              <View>
                <Text className="home-page__row-time">{formatMeasuredAt(record.measuredAt)}</Text>
                <Text className="home-page__row-bp">
                  {record.systolic}/{record.diastolic} mmHg
                </Text>
              </View>
              <StatusPill level={record.attentionLevel} />
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
