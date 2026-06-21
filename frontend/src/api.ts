import type { CalculationInput, CalculationResult, ApiError } from './types'

export class CalculationError extends Error {
  fields?: Record<string, string>
  constructor(message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'CalculationError'
    this.fields = fields
  }
}

export async function calculate(input: CalculationInput): Promise<CalculationResult> {
  let res: Response
  try {
    res = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    throw new CalculationError('Could not reach the server. Is the backend running?')
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new CalculationError('The server returned an unexpected response.')
  }

  if (!res.ok) {
    const err = data as ApiError
    throw new CalculationError(err.error ?? 'Something went wrong.', err.fields)
  }

  return data as CalculationResult
}
