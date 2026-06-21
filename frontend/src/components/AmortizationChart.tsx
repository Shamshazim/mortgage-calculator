import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { CalculationResult } from '../types'
import { formatCurrency } from '../format'

interface Props {
  result: CalculationResult
}

const COLORS = {
  principal: '#1F6F54',
  principalFill: '#E3EFE9',
  interest: '#C9883B',
  interestFill: '#F4E7D2',
  balance: '#3A4A43',
  baseline: '#A9A293',
}

function compactCurrency(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`
  return `$${Math.round(value)}`
}

export default function AmortizationChart({ result }: Props) {
  const active = result.prepayment.active
  // The baseline schedule is the longer one — use it as the time spine so the
  // accelerated payoff visibly "drops to zero" early against it.
  const spine = result.baseline.schedule
  const accByMonth = new Map(result.accelerated.schedule.map((r) => [r.month, r]))
  const accLast = result.accelerated.schedule[result.accelerated.schedule.length - 1]

  const data = spine.map((b) => {
    const a = accByMonth.get(b.month)
    return {
      year: b.month / 12,
      month: b.month,
      // Accelerated (realized) series — flat-line at the terminal values after payoff.
      cumulativePrincipal: a ? a.cumulativePrincipal : accLast.cumulativePrincipal,
      cumulativeInterest: a ? a.cumulativeInterest : accLast.cumulativeInterest,
      remainingBalance: a ? a.remainingBalance : 0,
      baselineBalance: b.remainingBalance,
    }
  })

  const totalYears = result.baseline.numberOfPayments / 12
  const step = totalYears > 15 ? 5 : totalYears > 7 ? 2 : 1
  const ticks: number[] = []
  for (let y = 0; y <= totalYears; y += step) ticks.push(y)
  if (ticks[ticks.length - 1] !== totalYears) ticks.push(totalYears)

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
          <defs>
            <linearGradient id="fillPrincipal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.principalFill} stopOpacity={0.95} />
              <stop offset="100%" stopColor={COLORS.principalFill} stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="fillInterest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.interestFill} stopOpacity={0.95} />
              <stop offset="100%" stopColor={COLORS.interestFill} stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E4E0D7" vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0, totalYears]}
            ticks={ticks}
            tickFormatter={(y: number) => `${Math.round(y)}y`}
            tick={{ fill: '#5E6B64', fontSize: 12 }}
            stroke="#E4E0D7"
          />
          <YAxis
            tickFormatter={compactCurrency}
            tick={{ fill: '#5E6B64', fontSize: 12 }}
            stroke="#E4E0D7"
            width={56}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            verticalAlign="top"
            height={32}
            iconType="plainline"
            wrapperStyle={{ fontSize: 13, color: '#5E6B64' }}
          />
          <Area
            type="monotone"
            name="Cumulative principal"
            dataKey="cumulativePrincipal"
            stackId="paid"
            stroke={COLORS.principal}
            strokeWidth={1.5}
            fill="url(#fillPrincipal)"
          />
          <Area
            type="monotone"
            name="Cumulative interest"
            dataKey="cumulativeInterest"
            stackId="paid"
            stroke={COLORS.interest}
            strokeWidth={1.5}
            fill="url(#fillInterest)"
          />
          {active && (
            <Line
              type="monotone"
              name="Balance · no extra"
              dataKey="baselineBalance"
              stroke={COLORS.baseline}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
            />
          )}
          <Line
            type="monotone"
            name={active ? 'Balance · with extra' : 'Remaining balance'}
            dataKey="remainingBalance"
            stroke={COLORS.balance}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const month = payload[0]?.payload?.month as number
  const year = month / 12
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">
        Year {Math.floor(year)} · Month {month}
      </div>
      {payload.map((p) => (
        <div className="chart-tooltip-row" key={p.name}>
          <span className="swatch" style={{ background: p.color }} />
          <span className="chart-tooltip-label">{p.name}</span>
          <span className="chart-tooltip-value">{formatCurrency(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}
