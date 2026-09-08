import { Text, View } from '@tarojs/components'
import type { AttentionLevel } from '@bp/contracts'
import { attentionLabelMap } from '../../mocks/demo-data'
import './index.scss'

type StatusPillProps = {
  level: AttentionLevel
}

export function StatusPill({ level }: StatusPillProps): JSX.Element {
  return (
    <View className={`status-pill status-pill--${level}`}>
      <Text className="status-pill__text">{attentionLabelMap[level]}</Text>
    </View>
  )
}
