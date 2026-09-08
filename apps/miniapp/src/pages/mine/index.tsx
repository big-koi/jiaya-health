import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import './index.scss'

const menus = [
  { key: 'family', label: '我的家庭', path: '/pages/family/index', tab: true },
  { key: 'reminder', label: '提醒设置', path: '/pages/reminder/index', tab: false },
  { key: 'history', label: '健康知识', path: '/pages/record-result/index', tab: false },
  { key: 'feedback', label: '意见反馈', path: '', tab: false },
  { key: 'about', label: '关于家压', path: '', tab: false },
] as const

export default function MinePage(): JSX.Element {
  const openMenu = (path: string, tab: boolean, label: string): void => {
    if (!path) {
      void Taro.showToast({ title: `${label}即将开放`, icon: 'none' })
      return
    }
    if (tab) {
      void Taro.switchTab({ url: path })
      return
    }
    void Taro.navigateTo({ url: path })
  }

  return (
    <View className="page mine-page">
      <View className="card mine-page__profile">
        <ProfileAvatar name="" initial="明" tone="#1fa97a" size="lg" />
        <View className="mine-page__profile-text">
          <Text className="mine-page__name">小明</Text>
          <Text className="mine-page__bio">用记录，守护家人的健康</Text>
        </View>
      </View>

      <View className="card mine-page__menu">
        {menus.map((item) => (
          <View
            key={item.key}
            className="mine-page__item"
            onClick={() => openMenu(item.path, item.tab, item.label)}
          >
            <Text className="mine-page__item-label">{item.label}</Text>
            <Text className="mine-page__item-arrow">›</Text>
          </View>
        ))}
      </View>

      <View className="mine-page__footer">
        <Text className="mine-page__logo">家压</Text>
        <Text className="mine-page__version">v0.1.0 · UI 演示版</Text>
      </View>
    </View>
  )
}
