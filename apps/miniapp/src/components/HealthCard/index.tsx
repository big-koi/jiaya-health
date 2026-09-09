import { View } from '@tarojs/components'
import type { ReactNode } from 'react'
import './index.scss'

type HealthCardProps = { children: ReactNode; tone?: 'plain' | 'healthy'; className?: string }

export function HealthCard({ children, tone = 'plain', className = '' }: HealthCardProps): JSX.Element {
  return <View className={`health-card health-card--${tone} ${className}`}>{children}</View>
}
