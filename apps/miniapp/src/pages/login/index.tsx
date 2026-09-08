import { Button, Checkbox, CheckboxGroup, Label, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'

import { authService } from '../../features/auth/auth.service'
import { useSessionStore } from '../../store/session.store'
import './index.scss'

export default function LoginPage(): JSX.Element {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const currentUser = useSessionStore((state) => state.currentUser)

  useEffect(() => {
    if (currentUser) void Taro.switchTab({ url: '/pages/home/index' })
  }, [currentUser])

  const handleLogin = async (): Promise<void> => {
    if (!agreed) {
      void Taro.showToast({ title: '请先同意用户协议', icon: 'none' })
      return
    }

    setLoading(true)
    setErrorMessage(null)
    try {
      await authService.loginWithWechat()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="login-page">
      <View className="login-page__content">
        <View className="login-page__brand-row">
          <View className="login-page__brand-mark">
            <Text className="login-page__brand-mark-text">家</Text>
          </View>
          <Text className="login-page__brand">家压</Text>
        </View>

        <View className="login-page__intro">
          <Text className="login-page__title">记录血压，陪伴家人</Text>
          <Text className="login-page__desc">把每次测量和提醒放在一起，让家人及时了解健康变化。</Text>
        </View>

        <View className="login-page__notice">
          <Text className="login-page__notice-title">安心记录</Text>
          <Text className="login-page__notice-text">健康数据仅用于家庭记录与共享，不替代专业医疗建议。</Text>
        </View>
      </View>

      <View className="login-page__footer">
        {errorMessage ? <Text className="login-page__error">{errorMessage}</Text> : null}
        <Button
          className="login-page__button"
          disabled={loading}
          loading={loading}
          onClick={() => void handleLogin()}
        >
          {loading ? '正在登录' : '微信登录'}
        </Button>
        <CheckboxGroup
          className="login-page__agreement"
          onChange={(event) => setAgreed(event.detail.value.includes('agreed'))}
        >
          <Label className="login-page__agreement-label">
            <Checkbox className="login-page__checkbox" value="agreed" checked={agreed} color="#0f7653" />
            <Text className="login-page__agree-text">我已阅读并同意《用户协议》和《隐私政策》</Text>
          </Label>
        </CheckboxGroup>
      </View>
    </View>
  )
}
