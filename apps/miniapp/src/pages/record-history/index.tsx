import { Text, View } from '@tarojs/components'
import { useMemo, useState } from 'react'
import { StatusPill } from '../../components/StatusPill'
import { demoRecords, formatMeasuredAt } from '../../mocks/demo-data'
import './index.scss'

type RangeKey = '7d' | '30d'

const ranges: Array<{ key: RangeKey; label: string }> = [
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
]

export default function RecordHistoryPage(): JSX.Element {
  const [range, setRange] = useState<RangeKey>('7d')

  const summary = useMemo(() => {
    const systolicValues = demoRecords.map((item) => item.systolic)
    const diastolicValues = demoRecords.map((item) => item.diastolic)
    const avg = (values: number[]): number =>
      Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)

    return {
      avg: `${avg(systolicValues)}/${avg(diastolicValues)}`,
      max: `${Math.max(...systolicValues)}/${Math.max(...diastolicValues)}`,
      min: `${Math.min(...systolicValues)}/${Math.min(...diastolicValues)}`,
    }
  }, [])

  const chartPoints = useMemo(() => {
    const max = Math.max(...demoRecords.map((item) => item.systolic))
    const min = Math.min(...demoRecords.map((item) => item.diastolic))
    const span = Math.max(max - min, 1)

    return demoRecords
      .slice()
      .reverse()
      .map((record, index, list) => {
        const x = list.length === 1 ? 50 : (index / (list.length - 1)) * 100
        const systolicY = 100 - ((record.systolic - min) / span) * 70 - 10
        const diastolicY = 100 - ((record.diastolic - min) / span) * 70 - 10
        return { id: record.id, x, systolicY, diastolicY }
      })
  }, [])

  return (
    <View className="page page--plain history-page">
      <View className="history-page__ranges">
        {ranges.map((item) => (
          <View
            key={item.key}
            className={`history-page__range ${range === item.key ? 'is-active' : ''}`}
            onClick={() => setRange(item.key)}
          >
            <Text>{item.label}</Text>
          </View>
        ))}
      </View>

      <View className="card history-page__chart">
        <Text className="history-page__chart-title">血压趋势（演示）</Text>
        <View className="history-page__plot">
          {chartPoints.map((point) => (
            <View key={point.id}>
              <View
                className="history-page__dot history-page__dot--sys"
                style={{ left: `${point.x}%`, top: `${point.systolicY}%` }}
              />
              <View
                className="history-page__dot history-page__dot--dia"
                style={{ left: `${point.x}%`, top: `${point.diastolicY}%` }}
              />
            </View>
          ))}
          <View className="history-page__line history-page__line--sys" />
          <View className="history-page__line history-page__line--dia" />
        </View>
        <View className="history-page__legend">
          <Text className="history-page__legend-item">收缩压</Text>
          <Text className="history-page__legend-item history-page__legend-item--dia">
            舒张压
          </Text>
        </View>
      </View>

      <View className="card history-page__stats">
        <View className="history-page__stat">
          <Text className="history-page__stat-label">平均</Text>
          <Text className="history-page__stat-value">{summary.avg}</Text>
        </View>
        <View className="history-page__stat">
          <Text className="history-page__stat-label">最高</Text>
          <Text className="history-page__stat-value">{summary.max}</Text>
        </View>
        <View className="history-page__stat">
          <Text className="history-page__stat-label">最低</Text>
          <Text className="history-page__stat-value">{summary.min}</Text>
        </View>
      </View>

      <Text className="section-title">历史记录</Text>
      <View className="card history-page__list">
        {demoRecords.map((record) => (
          <View key={record.id} className="history-page__row">
            <View>
              <Text className="history-page__time">{formatMeasuredAt(record.measuredAt)}</Text>
              <Text className="history-page__bp">
                {record.systolic}/{record.diastolic} mmHg · 脉搏 {record.pulse ?? '--'}
              </Text>
            </View>
            <StatusPill level={record.attentionLevel} />
          </View>
        ))}
      </View>
    </View>
  )
}
