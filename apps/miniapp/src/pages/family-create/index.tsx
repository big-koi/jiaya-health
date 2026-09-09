import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRef, useState } from 'react'

import { PrimaryButton } from '../../components/PrimaryButton'
import { familiesApi } from '../../services/api/families.api'
import { useActiveProfileStore } from '../../store/active-profile.store'
import './index.scss'

export default function FamilyCreatePage(): JSX.Element {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitInFlight = useRef(false)

  const submit = async (): Promise<void> => {
    if (submitInFlight.current) return
    const normalizedName = name.trim()
    if (!normalizedName) {
      setError('请填写家庭名称')
      return
    }
    submitInFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      const family = await familiesApi.create({ name: normalizedName })
      useActiveProfileStore.getState().selectFamily(family.id)
      await Taro.showToast({ title: '家庭创建成功', icon: 'success' })
      await Taro.navigateBack()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建失败，请稍后重试')
    } finally {
      submitInFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <View className="page page--plain family-form-page">
      <View className="family-form-page__intro">
        <Text className="family-form-page__title">给家人的健康留一个位置</Text>
        <Text className="family-form-page__desc">创建家庭后，就可以逐个添加需要关心的成员。</Text>
      </View>
      <View className="card family-form-page__form">
        <Text className="family-form-page__label">家庭名称</Text>
        <Input
          className="family-form-page__input"
          value={name}
          maxlength={24}
          placeholder="例如：温暖小家"
          onInput={(event) => setName(event.detail.value)}
        />
        {error ? <Text className="family-form-page__error">{error}</Text> : null}
        <PrimaryButton
          disabled={submitting}
          loading={submitting}
          onClick={() => void submit()}
        >
          创建家庭
        </PrimaryButton>
      </View>
    </View>
  )
}
