import './styles/tokens.scss'
import './app.scss'

import type { PropsWithChildren, ReactElement } from 'react'

export default function App({ children }: PropsWithChildren): ReactElement {
  return <>{children}</>
}
