import { Text, View } from '@tarojs/components'
import type { ServiceStatus } from '@bp/contracts'

const status: ServiceStatus = {
  status: 'ok',
  service: 'jiaya-health-miniapp',
}

export default function HomePage(): JSX.Element {
  return (
    <View className="home-page">
      <Text className="home-page__title">嘉雅健康</Text>
      <Text className="home-page__subtitle">{status.service} 基础工程已就绪</Text>
    </View>
  )
}
