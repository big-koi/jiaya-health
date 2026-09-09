import { Button, Text } from '@tarojs/components'
import type { ReactNode } from 'react'
import './index.scss'

type PrimaryButtonProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  block?: boolean
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  block = true,
}: PrimaryButtonProps): JSX.Element {
  return (
    <Button
      className={`primary-button ${block ? 'is-block' : ''} ${disabled ? 'is-disabled' : ''}`}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
    >
      <Text className="primary-button__text">{children}</Text>
    </Button>
  )
}
