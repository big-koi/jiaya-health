import { Text, View } from '@tarojs/components'
import './index.scss'

type ProfileAvatarProps = {
  name: string
  initial: string
  tone: string
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProfileAvatar({
  name,
  initial,
  tone,
  active = false,
  size = 'md',
}: ProfileAvatarProps): JSX.Element {
  return (
    <View className={`profile-avatar profile-avatar--${size} ${active ? 'is-active' : ''}`}>
      <View className="profile-avatar__circle" style={{ background: tone }}>
        <Text className="profile-avatar__initial">{initial}</Text>
      </View>
      {name ? <Text className="profile-avatar__name">{name}</Text> : null}
    </View>
  )
}
