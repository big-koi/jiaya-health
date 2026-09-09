import { Button, Text } from '@tarojs/components'
import type { ReactNode } from 'react'
import './index.scss'

type PrimaryButtonProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  block?: boolean
  variant?: 'primary' | 'secondary'
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  block = true,
  variant = 'primary',
}: PrimaryButtonProps): JSX.Element {
  return (
    <Button
      className={`primary-button primary-button--${variant} ${block ? 'is-block' : ''} ${disabled || loading ? 'is-disabled' : ''}`}
      disabled={disabled || loading}
      loading={loading}
      onClick={onClick}
    >
      <Text className="primary-button__text">{loading ? '处理中…' : children}</Text>
    </Button>
  )
}
