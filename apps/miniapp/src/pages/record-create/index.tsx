import { Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { demoMembers } from '../../mocks/demo-data'
import './index.scss'

type InputMode = 'manual' | 'device'

export default function RecordCreatePage(): JSX.Element {
  const [mode, setMode] = useState<InputMode>('manual')
  const [systolic, setSystolic] = useState('128')
  const [diastolic, setDiastolic] = useState('82')
  const [pulse, setPulse] = useState('72')
  const [profileIndex, setProfileIndex] = useState(0)
  const [note, setNote] = useState('')
  const measuredAtLabel = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')} ${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`
  }, [])

  const canSubmit = Boolean(systolic && diastolic)

  const handleSave = (): void => {
    if (!canSubmit) {
      void Taro.showToast({ title: '请填写收缩压和舒张压', icon: 'none' })
      return
    }

    void Taro.navigateTo({
      url: `/pages/record-result/index?level=normal&systolic=${systolic}&diastolic=${diastolic}`,
    })
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

      {mode === 'device' ? (
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
              range={demoMembers.map((member) => member.name)}
              value={profileIndex}
              onChange={(event) => setProfileIndex(Number(event.detail.value))}
            >
              <View className="record-page__meta-row">
                <Text className="record-page__meta-label">测量对象</Text>
                <Text className="record-page__meta-value">
                  {demoMembers[profileIndex]?.name ?? '本人'}
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

          <PrimaryButton disabled={!canSubmit} onClick={handleSave}>
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
