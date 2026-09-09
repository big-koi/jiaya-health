import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useMemo, useState } from 'react'
import type { BloodPressureRecordDTO, BloodPressureSummaryDTO } from '@bp/contracts'
import { PrimaryButton } from '../../components/PrimaryButton'
import { StatusPill } from '../../components/StatusPill'
import { formatMeasuredAt } from '../../mocks/demo-data'
import { recordsApi, type BloodPressureSummaryRange } from '../../services/api/records.api'
import { useActiveProfileStore } from '../../store/active-profile.store'
import './index.scss'

const ranges: Array<{ key: BloodPressureSummaryRange; label: string }> = [
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
]

export default function RecordHistoryPage(): JSX.Element {
  const [range, setRange] = useState<BloodPressureSummaryRange>('7d')
  const [records, setRecords] = useState<BloodPressureRecordDTO[]>([])
  const [summary, setSummary] = useState<BloodPressureSummaryDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeProfileId = useActiveProfileStore((state) => state.activeProfileId)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      if (!activeProfileId) {
        setRecords([])
        setSummary(null)
        setLoading(false)
        return
      }
      try {
        const days = range === '7d' ? 7 : 30
        const to = new Date()
        const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
        const [recordData, summaryData] = await Promise.all([
          recordsApi.list({
            profileId: activeProfileId,
            from: from.toISOString(),
            to: to.toISOString(),
            limit: 50,
          }),
          recordsApi.summary(activeProfileId, range),
        ])
        if (cancelled) return
        setRecords(recordData.items)
        setSummary(summaryData)
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '加载失败，请稍后重试')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [activeProfileId, range])

  const switchRange = (targetRange: BloodPressureSummaryRange): void => {
    setRange(targetRange)
  }

  const displayValues = useMemo(() => {
    const systolicValues = records.map((item) => item.systolic)
    const diastolicValues = records.map((item) => item.diastolic)
    if (systolicValues.length === 0) return null
    return {
      avg:
        summary?.avgSystolic === null || summary?.avgSystolic === undefined ||
        summary.avgDiastolic === null || summary.avgDiastolic === undefined
          ? '--/--'
          : `${summary.avgSystolic}/${summary.avgDiastolic}`,
      max: `${Math.max(...systolicValues)}/${Math.max(...diastolicValues)}`,
      min: `${Math.min(...systolicValues)}/${Math.min(...diastolicValues)}`,
    }
  }, [records, summary])

  const chartPoints = useMemo(() => {
    if (records.length === 0) return []
    const max = Math.max(...records.map((item) => item.systolic))
    const min = Math.min(...records.map((item) => item.diastolic))
    const span = Math.max(max - min, 1)

    return records
      .slice()
      .reverse()
      .map((record, index, list) => {
        const x = list.length === 1 ? 50 : (index / (list.length - 1)) * 100
        const systolicY = 100 - ((record.systolic - min) / span) * 70 - 10
        const diastolicY = 100 - ((record.diastolic - min) / span) * 70 - 10
        return { id: record.id, x, systolicY, diastolicY }
      })
  }, [records])

  return (
    <View className="page page--plain history-page">
      <View className="history-page__ranges">
        {ranges.map((item) => (
          <View
            key={item.key}
            className={`history-page__range ${range === item.key ? 'is-active' : ''}`}
            onClick={() => switchRange(item.key)}
          >
            <Text>{item.label}</Text>
          </View>
        ))}
      </View>

      {!activeProfileId ? (
        <View className="card history-page__chart">
          <Text>请先选择一位成员</Text>
          <PrimaryButton onClick={() => void Taro.switchTab({ url: '/pages/family/index' })}>去选择成员</PrimaryButton>
        </View>
      ) : loading ? (
        <Text className="safe-hint">加载中…</Text>
      ) : error ? (
        <Text className="safe-hint">{error}</Text>
      ) : records.length === 0 ? (
        <Text className="safe-hint">暂无血压记录，去记录第一条吧</Text>
      ) : (
        <>
          <View className="card history-page__chart">
            <Text className="history-page__chart-title">血压趋势</Text>
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
              <Text className="history-page__stat-value">
                {displayValues?.avg ?? '--/--'}
              </Text>
            </View>
            <View className="history-page__stat">
              <Text className="history-page__stat-label">最高</Text>
              <Text className="history-page__stat-value">
                {displayValues?.max ?? '--/--'}
              </Text>
            </View>
            <View className="history-page__stat">
              <Text className="history-page__stat-label">最低</Text>
              <Text className="history-page__stat-value">
                {displayValues?.min ?? '--/--'}
              </Text>
            </View>
          </View>

          <Text className="section-title">
            历史记录
            {summary ? `（${summary.recordCount} 条）` : ''}
          </Text>
          <View className="card history-page__list">
            {records.map((record) => (
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
        </>
      )}
    </View>
  )
}
