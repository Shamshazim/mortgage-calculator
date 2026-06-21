import { useState } from 'react'
import type { ScheduleRow } from '../types'
import { formatCurrency } from '../format'

interface Props {
  schedule: ScheduleRow[]
}

const PREVIEW_ROWS = 12

export default function AmortizationTable({ schedule }: Props) {
  const [expanded, setExpanded] = useState(false)
  const rows = expanded ? schedule : schedule.slice(0, PREVIEW_ROWS)

  return (
    <div>
      <div className={'table-scroll' + (expanded ? ' expanded' : '')}>
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="num">#</th>
              <th className="num">Payment</th>
              <th className="num">Principal</th>
              <th className="num">Interest</th>
              <th className="num">Remaining balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}>
                <td className="num muted">{row.month}</td>
                <td className="num">{formatCurrency(row.payment)}</td>
                <td className="num principal">{formatCurrency(row.principalPaid)}</td>
                <td className="num interest">{formatCurrency(row.interestPaid)}</td>
                <td className="num">{formatCurrency(row.remainingBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {schedule.length > PREVIEW_ROWS && (
        <button
          type="button"
          className="link-button"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Show fewer' : `Show all ${schedule.length} payments`}
        </button>
      )}
    </div>
  )
}
