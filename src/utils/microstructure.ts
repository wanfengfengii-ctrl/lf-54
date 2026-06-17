import type { FiberRatio, ProcessParams, MicrostructureResult, PredictionIndicators } from '../types'

function fiberLengthWeight(ratio: FiberRatio): number {
  const weights: Record<keyof FiberRatio, number> = {
    chuPi: 5.6,
    hemp: 20.0,
    bamboo: 2.3,
    straw: 1.0
  }
  const total = ratio.chuPi + ratio.hemp + ratio.bamboo + ratio.straw
  if (total === 0) return 1.0
  let avg = 0
  const keys: Array<keyof FiberRatio> = ['chuPi', 'hemp', 'bamboo', 'straw']
  for (const k of keys) {
    avg += weights[k] * (ratio[k] / total)
  }
  return avg
}

function bastFiberRatio(ratio: FiberRatio): number {
  const total = ratio.chuPi + ratio.hemp + ratio.bamboo + ratio.straw
  if (total === 0) return 0
  return (ratio.chuPi + ratio.hemp) / total
}

export function simulateMicrostructure(
  ratio: FiberRatio,
  params: ProcessParams
): MicrostructureResult {
  const avgLen = fiberLengthWeight(ratio)
  const bastRatio = bastFiberRatio(ratio)
  const bd = params.beatingDegree
  const thick = params.sheetThickness
  const press = params.pressingIntensity
  const dryTemp = params.dryingTemperature
  const dryDur = params.dryingDuration

  const bdFactor = bd / 50.0
  const lenFactor = avgLen / 5.0
  const bastFactor = bastRatio

  const fiberInterweaving = Math.min(
    100,
    Math.max(
      0,
      30 + bastFactor * 25 + bdFactor * 20 + lenFactor * 10 + (press / 10) * 15
    )
  )

  const poreSize = Math.max(
    0.5,
    25 - bastFactor * 8 - bdFactor * 5 - (press / 10) * 6 + (thick / 200) * 4
  )

  const poreDistribution = Math.min(
    100,
    Math.max(
      0,
      40 + bdFactor * 20 + bastFactor * 15 + (press / 10) * 15 - (thick / 200) * 10
    )
  )

  const uniformity = Math.min(
    100,
    Math.max(
      0,
      35 + bdFactor * 20 + (press / 10) * 20 + bastFactor * 10 - Math.abs(dryTemp - 60) * 0.3 - (thick / 200) * 5
    )
  )

  const layerCount = Math.max(2, Math.round(thick / 25 + press * 0.5 + 1))

  const layerBonding = Math.min(
    100,
    Math.max(
      0,
      30 + bdFactor * 25 + (press / 10) * 20 + bastFactor * 10 + (dryDur / 60) * 10 - (dryTemp > 80 ? (dryTemp - 80) * 0.5 : 0)
    )
  )

  return {
    fiberInterweaving: Math.round(fiberInterweaving * 10) / 10,
    poreSize: Math.round(poreSize * 100) / 100,
    poreDistribution: Math.round(poreDistribution * 10) / 10,
    uniformity: Math.round(uniformity * 10) / 10,
    layerCount,
    layerBonding: Math.round(layerBonding * 10) / 10
  }
}

export function predictIndicators(
  ratio: FiberRatio,
  params: ProcessParams,
  micro: MicrostructureResult
): PredictionIndicators {
  const bastRatio = bastFiberRatio(ratio)
  const bd = params.beatingDegree
  const press = params.pressingIntensity
  const thick = params.sheetThickness
  const dryTemp = params.dryingTemperature
  const dryDur = params.dryingDuration

  const interFactor = micro.fiberInterweaving / 100
  const bondFactor = micro.layerBonding / 100
  const uniformFactor = micro.uniformity / 100

  const strength = Math.max(
    0.5,
    2.0 + interFactor * 3.5 + bastRatio * 2.0 + (bd / 90) * 1.5 + bondFactor * 1.0 - (1 - uniformFactor) * 0.8
  )

  const inkDiffusion = Math.max(
    0.5,
    6.0 - interFactor * 2.5 - bondFactor * 1.0 - (press / 10) * 1.0 + (1 - bastRatio) * 1.5 + (thick / 200) * 0.8
  )

  const lightTransmittance = Math.max(
    5,
    Math.min(
      85,
      70 - thick / 200 * 30 - interFactor * 15 + (bd / 90) * 8 - bastRatio * 10 + (press / 10) * 5
    )
  )

  const surfaceFineness = Math.max(
    1.0,
    15.0 - interFactor * 5 - (bd / 90) * 3 - (press / 10) * 3 + (1 - uniformFactor) * 3 + (1 - bastRatio) * 2
  )

  const durability = Math.max(
    50,
    200 + bastRatio * 400 + interFactor * 200 + bondFactor * 150 + (dryDur / 60) * 50 - Math.abs(dryTemp - 60) * 1.5 - (bd > 70 ? (bd - 70) * 5 : 0)
  )

  return {
    strength: Math.round(strength * 100) / 100,
    inkDiffusion: Math.round(inkDiffusion * 100) / 100,
    lightTransmittance: Math.round(lightTransmittance * 10) / 10,
    surfaceFineness: Math.round(surfaceFineness * 100) / 100,
    durability: Math.round(durability)
  }
}

export function generatePoreHistogram(micro: MicrostructureResult): Array<{ range: string; count: number }> {
  const baseSize = micro.poreSize
  const dist = micro.poreDistribution / 100
  const spread = 1.0 - dist * 0.7

  const ranges = [
    { range: '0-5', min: 0, max: 5 },
    { range: '5-10', min: 5, max: 10 },
    { range: '10-15', min: 10, max: 15 },
    { range: '15-20', min: 15, max: 20 },
    { range: '20-30', min: 20, max: 30 },
    { range: '30-50', min: 30, max: 50 }
  ]

  return ranges.map(r => {
    const mid = (r.min + r.max) / 2
    const diff = (mid - baseSize) / (baseSize * spread + 1)
    const gaussian = Math.exp(-0.5 * diff * diff)
    const count = Math.round(gaussian * 100 * (0.8 + Math.random() * 0.4))
    return { range: r.range, count }
  })
}

export function generateFiberPaths(
  ratio: FiberRatio,
  params: ProcessParams,
  width: number,
  height: number
): Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }> {
  const fibers: Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }> = []

  const fiberConfig: Array<{ key: keyof FiberRatio; color: string; baseLen: number; baseW: number }> = [
    { key: 'chuPi', color: '#D4A574', baseLen: 40, baseW: 2.0 },
    { key: 'hemp', color: '#8B7355', baseLen: 60, baseW: 2.5 },
    { key: 'bamboo', color: '#7CB342', baseLen: 20, baseW: 1.5 },
    { key: 'straw', color: '#FDD835', baseLen: 12, baseW: 1.0 }
  ]

  const bd = params.beatingDegree
  const lenScale = 1.0 - (bd - 10) / 80 * 0.5
  const total = ratio.chuPi + ratio.hemp + ratio.bamboo + ratio.straw
  if (total === 0) return fibers

  for (const fc of fiberConfig) {
    const proportion = ratio[fc.key] / total
    const count = Math.round(proportion * 80)
    if (count === 0) continue

    for (let i = 0; i < count; i++) {
      const startX = Math.random() * width
      const startY = Math.random() * height
      const len = fc.baseLen * lenScale * (0.6 + Math.random() * 0.8)
      const angle = (Math.random() - 0.5) * Math.PI * 0.6
      const segments = 6
      const points: Array<{ x: number; y: number }> = []

      for (let s = 0; s <= segments; s++) {
        const t = s / segments
        const baseX = startX + Math.cos(angle) * len * t
        const baseY = startY + Math.sin(angle) * len * t
        const wobbleX = (Math.random() - 0.5) * 4
        const wobbleY = (Math.random() - 0.5) * 4
        points.push({
          x: Math.max(0, Math.min(width, baseX + wobbleX)),
          y: Math.max(0, Math.min(height, baseY + wobbleY))
        })
      }

      fibers.push({
        points,
        color: fc.color,
        width: fc.baseW * (0.7 + proportion * 0.6)
      })
    }
  }

  return fibers
}
