import { Button, View } from '@tarojs/components'
import './index.scss'

type SegmentOption<T extends string> = { label: string; value: T; disabled?: boolean }
type SegmentedControlProps<T extends string> = {
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
}

export function SegmentedControl<T extends string>({ value, options, onChange, ariaLabel }: SegmentedControlProps<T>): JSX.Element {
  return (
    <View className="segmented-control" aria-label={ariaLabel}>
      {options.map((option) => (
        <Button
          key={option.value}
          className={`segmented-control__item ${value === option.value ? 'is-active' : ''}`}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </View>
  )
}
