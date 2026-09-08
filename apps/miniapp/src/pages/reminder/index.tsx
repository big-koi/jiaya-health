import { Input, Switch, Text, View } from '@tarojs/components'
import { useState } from 'react'
import { demoMembers } from '../../mocks/demo-data'
import './index.scss'

type ReminderSlot = {
  id: string
  label: string
  time: string
  enabled: boolean
}

export default function ReminderPage(): JSX.Element {
  const [masterEnabled, setMasterEnabled] = useState(true)
  const [slots, setSlots] = useState<ReminderSlot[]>([
    { id: 'morning', label: '早间提醒', time: '08:00', enabled: true },
    { id: 'evening', label: '晚间提醒', time: '20:00', enabled: true },
  ])
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const firstId = demoMembers[0]?.id
    return firstId ? [firstId] : []
  })
  const [message, setMessage] = useState('该测量血压啦，记得坐下来休息一会儿再测。')

  const toggleMember = (id: string): void => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  return (
    <View className="page page--plain reminder-page">
      <View className="card reminder-page__master">
        <View>
          <Text className="reminder-page__title">开启测量提醒</Text>
          <Text className="reminder-page__desc">固定时间提醒，帮助养成记录习惯</Text>
        </View>
        <Switch
          checked={masterEnabled}
          color="#1fa97a"
          onChange={(event) => setMasterEnabled(Boolean(event.detail.value))}
        />
      </View>

      <Text className="section-title">提醒时间</Text>
      <View className="card reminder-page__slots">
        {slots.map((slot) => (
          <View key={slot.id} className="reminder-page__slot">
            <View>
              <Text className="reminder-page__slot-label">{slot.label}</Text>
              <Text className="reminder-page__slot-time">{slot.time}</Text>
            </View>
            <Switch
              checked={masterEnabled && slot.enabled}
              disabled={!masterEnabled}
              color="#1fa97a"
              onChange={(event) => {
                const enabled = Boolean(event.detail.value)
                setSlots((current) =>
                  current.map((item) =>
                    item.id === slot.id ? { ...item, enabled } : item,
                  ),
                )
              }}
            />
          </View>
        ))}
      </View>

      <Text className="section-title">提醒对象</Text>
      <View className="card reminder-page__members">
        {demoMembers.map((member) => {
          const checked = selectedIds.includes(member.id)
          return (
            <View
              key={member.id}
              className={`reminder-page__member ${checked ? 'is-checked' : ''}`}
              onClick={() => toggleMember(member.id)}
            >
              <Text className="reminder-page__member-name">{member.name}</Text>
              <Text className="reminder-page__member-check">{checked ? '已选' : '选择'}</Text>
            </View>
          )
        })}
      </View>

      <Text className="section-title">提醒文案</Text>
      <View className="card reminder-page__message">
        <Input
          className="reminder-page__input"
          value={message}
          maxlength={40}
          onInput={(event) => setMessage(event.detail.value)}
        />
      </View>
      <Text className="safe-hint">
        当前为界面演示。正式版将按档案权限保存固定时间提醒，并接入服务端校验。
      </Text>
    </View>
  )
}
