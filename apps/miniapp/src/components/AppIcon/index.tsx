import { Image } from '@tarojs/components'
import { ICONS, type IconName } from '../../assets/icons'
import './index.scss'

type AppIconProps = {
  name: IconName
  size?: number
  className?: string
}

export function AppIcon({ name, size = 48, className = '' }: AppIconProps): JSX.Element {
  return (
    <Image
      className={`app-icon ${className}`.trim()}
      src={ICONS[name]}
      mode="aspectFit"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}
