import { Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import type { AttentionLevel } from '@bp/contracts'
import { PrimaryButton } from '../../components/PrimaryButton'
import { StatusPill } from '../../components/StatusPill'
import './index.scss'

const tips = [
  { title: '规律作息', desc: '保证睡眠，避免连续熬夜后再测量。' },
  { title: '清淡饮食', desc: '少盐少油，记录饮食前后的读数变化。' },
  { title: '适度活动', desc: '保持日常活动，测量前先休息片刻。' },
  { title: '持续记录', desc: '固定时间测量，更方便观察趋势。' },
]

function resolveLevel(value?: string): AttentionLevel {
  if (value === 'attention' || value === 'recheck' || value === 'normal') {
    return value
  }
  return 'normal'
}

const messageByCode: Record<string, string> = {
  BP_NORMAL: '本次读数暂无特殊提示，可继续按日常节奏记录。',
  BP_ATTENTION: '本次读数建议多留意后续变化，必要时咨询医生。',
  BP_RECHECK: '建议休息后复测一次，并关注后续记录变化。',
}

export default function RecordResultPage(): JSX.Element {
  const router = useRouter()
  const level = resolveLevel(router.params.level)
  const messageCode = router.params.messageCode ?? ''
  const systolic = router.params.systolic ?? '128'
  const diastolic = router.params.diastolic ?? '82'

  const message = messageByCode[messageCode] ?? '记录已保存，可继续按日常节奏记录。'

  return (
    <View className="page page--plain result-page">
      <View className={`card result-page__hero result-page__hero--${level}`}>
        <View className="result-page__face">
          <Text className="result-page__face-mark">{level === 'normal' ? '好' : '看'}</Text>
        </View>
        <StatusPill level={level} />
        <Text className="result-page__bp">
          {systolic}/{diastolic} mmHg
        </Text>
        <Text className="result-page__message">{message}</Text>
        <Text className="safe-hint">
          以上为产品关注提示，不构成医疗诊断或用药建议。
        </Text>
      </View>

      <View className="result-page__section">
        <Text className="section-title">日常建议</Text>
        <View className="card result-page__tips">
          {tips.map((tip) => (
            <View key={tip.title} className="result-page__tip">
              <Text className="result-page__tip-title">{tip.title}</Text>
              <Text className="result-page__tip-desc">{tip.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="result-page__actions">
        <PrimaryButton onClick={() => void Taro.switchTab({ url: '/pages/home/index' })}>
          返回首页
        </PrimaryButton>
        <View
          className="result-page__secondary"
          onClick={() => void Taro.navigateTo({ url: '/pages/reminder/index' })}
        >
          <Text className="result-page__secondary-text">设置复测提醒</Text>
        </View>
      </View>
    </View>
  )
}
