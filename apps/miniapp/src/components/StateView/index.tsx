import { Text, View } from '@tarojs/components'
import { PrimaryButton } from '../PrimaryButton'
import './index.scss'

type StateViewProps = {
  state: 'loading' | 'empty' | 'error'
  title?: string
  description?: string
  onRetry?: () => void
}

export function StateView({ state, title, description, onRetry }: StateViewProps): JSX.Element {
  if (state === 'loading') {
    return <View className="state-view state-view--loading"><View className="state-view__skeleton" /><View className="state-view__skeleton is-short" /></View>
  }
  return (
    <View className={`state-view state-view--${state}`}>
      <Text className="state-view__title">{title ?? (state === 'empty' ? '暂时没有内容' : '加载失败')}</Text>
      {description ? <Text className="state-view__description">{description}</Text> : null}
      {state === 'error' && onRetry ? <PrimaryButton variant="secondary" block={false} onClick={onRetry}>重新加载</PrimaryButton> : null}
    </View>
  )
}
