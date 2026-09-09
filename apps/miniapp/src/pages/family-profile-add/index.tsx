import { Input, Picker, Switch, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useRef, useState } from 'react'

import { PrimaryButton } from '../../components/PrimaryButton'
import { profilesApi } from '../../services/api/profiles.api'
import { useActiveProfileStore } from '../../store/active-profile.store'
import './index.scss'

const RELATIONSHIPS = [
  { label: '未设置', value: '' },
  { label: '本人', value: 'self' },
  { label: '父亲', value: 'father' },
  { label: '母亲', value: 'mother' },
  { label: '伴侣', value: 'partner' },
  { label: '其他家人', value: 'family' },
]

export default function FamilyProfileAddPage(): JSX.Element {
  const { params } = useRouter()
  const familyId = params.familyId ?? ''
  const [name, setName] = useState('')
  const [relationshipIndex, setRelationshipIndex] = useState(0)
  const [birthday, setBirthday] = useState('')
  const [elderMode, setElderMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitInFlight = useRef(false)

  const submit = async (): Promise<void> => {
    if (submitInFlight.current) return
    const normalizedName = name.trim()
    if (!familyId) {
      setError('未找到要添加成员的家庭，请返回重试')
      return
    }
    if (!normalizedName) {
      setError('请填写成员姓名')
      return
    }
    submitInFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      const relationship = RELATIONSHIPS[relationshipIndex]?.value ?? ''
      const profile = await profilesApi.create({
        familyId,
        name: normalizedName,
        ...(relationship ? { relationship } : {}),
        ...(birthday ? { birthday } : {}),
        elderMode,
      })
      useActiveProfileStore.getState().selectProfile(familyId, profile.id)
      await Taro.showToast({ title: '成员添加成功', icon: 'success' })
      await Taro.navigateBack()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '添加失败，请稍后重试')
    } finally {
      submitInFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <View className="page page--plain family-form-page">
      <View className="family-form-page__intro">
        <Text className="family-form-page__title">添加一位家庭成员</Text>
        <Text className="family-form-page__desc">未绑定微信账号也可以先建立健康档案。</Text>
      </View>
      <View className="card family-form-page__form">
        <Text className="family-form-page__label">姓名</Text>
        <Input
          className="family-form-page__input"
          value={name}
          maxlength={20}
          placeholder="请输入姓名"
          onInput={(event) => setName(event.detail.value)}
        />
        <Text className="family-form-page__label">关系（可选）</Text>
        <Picker
          mode="selector"
          range={RELATIONSHIPS.map((item) => item.label)}
          value={relationshipIndex}
          onChange={(event) => setRelationshipIndex(Number(event.detail.value))}
        >
          <View className="family-form-page__picker">{RELATIONSHIPS[relationshipIndex]?.label}</View>
        </Picker>
        <Text className="family-form-page__label">生日（可选）</Text>
        <Picker
          mode="date"
          value={birthday}
          end={new Date().toISOString().slice(0, 10)}
          onChange={(event) => setBirthday(event.detail.value)}
        >
          <View className="family-form-page__picker">{birthday || '请选择生日'}</View>
        </Picker>
        <View className="family-form-page__toggle">
          <View>
            <Text className="family-form-page__label">长辈模式</Text>
            <Text className="family-form-page__toggle-desc">为长辈使用场景提供更清晰的提示</Text>
          </View>
          <Switch
            checked={elderMode}
            color="#1fa97a"
            onChange={(event) => setElderMode(Boolean(event.detail.value))}
          />
        </View>
        {error ? <Text className="family-form-page__error">{error}</Text> : null}
        <PrimaryButton
          disabled={submitting}
          loading={submitting}
          onClick={() => void submit()}
        >
          保存成员
        </PrimaryButton>
      </View>
    </View>
  )
}
