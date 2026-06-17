import type {
  FiberRatio,
  ProcessParams,
  MicrostructureResult,
  PredictionIndicators,
  SimulationSnapshot
} from '../types'

export interface LayerInfo {
  index: number
  thickness: number
  density: number
  fiberMix: FiberRatio
  isTop: boolean
  isBottom: boolean
}

export interface FiberPath {
  points: Array<{ x: number; y: number }>
  color: string
  width: number
}

export interface PoreHistogramBin {
  range: string
  count: number
}

export interface FullSimulationResult {
  params: ProcessParams
  fiberRatio: FiberRatio
  microstructure: MicrostructureResult
  prediction: PredictionIndicators
  poreHistogram: PoreHistogramBin[]
  fiberPaths: FiberPath[]
  layerInfo: LayerInfo[]
  seed: number
  checksum: string
}

export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed >>> 0
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return this.seed / 0xffffffff
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  getState(): number {
    return this.seed
  }
}

export function generateDeterministicSeed(ratio: FiberRatio, params: ProcessParams, salt: number = 0): number {
  let hash = 2166136261
  const values = [
    ratio.chuPi, ratio.hemp, ratio.bamboo, ratio.straw,
    params.beatingDegree, params.sheetThickness, params.pressingIntensity,
    params.dryingTemperature, params.dryingDuration,
    salt
  ]
  for (const v of values) {
    hash ^= Math.round(v * 1000)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function computeSnapshotChecksum(snapshot: {
  params: ProcessParams
  fiberRatio: FiberRatio
  microstructure: MicrostructureResult
  prediction: PredictionIndicators
  seed: number
}): string {
  let hash = 2166136261
  const allValues = [
    snapshot.fiberRatio.chuPi, snapshot.fiberRatio.hemp,
    snapshot.fiberRatio.bamboo, snapshot.fiberRatio.straw,
    snapshot.params.beatingDegree, snapshot.params.sheetThickness,
    snapshot.params.pressingIntensity, snapshot.params.dryingTemperature,
    snapshot.params.dryingDuration,
    snapshot.microstructure.fiberInterweaving,
    snapshot.microstructure.poreSize,
    snapshot.microstructure.poreDistribution,
    snapshot.microstructure.uniformity,
    snapshot.microstructure.layerCount,
    snapshot.microstructure.layerBonding,
    snapshot.prediction.strength,
    snapshot.prediction.inkDiffusion,
    snapshot.prediction.lightTransmittance,
    snapshot.prediction.surfaceFineness,
    snapshot.prediction.durability,
    snapshot.seed
  ]
  for (const v of allValues) {
    hash ^= Math.round(v * 10000)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function generateSeed(ratio: FiberRatio, params: ProcessParams, salt: number = 0, customSeed?: number): number {
  if (customSeed !== undefined) {
    return customSeed + salt
  }
  return generateDeterministicSeed(ratio, params, salt)
}

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

export function generatePoreHistogram(
  micro: MicrostructureResult,
  ratio: FiberRatio,
  params: ProcessParams,
  customSeed?: number
): PoreHistogramBin[] {
  const baseSize = micro.poreSize
  const dist = micro.poreDistribution / 100
  const spread = 1.0 - dist * 0.7

  const rng = new SeededRandom(generateSeed(ratio, params, 1, customSeed))

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
    const count = Math.round(gaussian * 100 * (0.8 + rng.next() * 0.4))
    return { range: r.range, count }
  })
}

export function generateFiberPaths(
  ratio: FiberRatio,
  params: ProcessParams,
  width: number,
  height: number,
  customSeed?: number
): FiberPath[] {
  const fibers: FiberPath[] = []

  const fiberConfig: Array<{ key: keyof FiberRatio; color: string; baseLen: number; baseW: number }> = [
    { key: 'chuPi', color: '#D4A574', baseLen: 40, baseW: 2.0 },
    { key: 'hemp', color: '#8B7355', baseLen: 60, baseW: 2.5 },
    { key: 'bamboo', color: '#7CB342', baseLen: 20, baseW: 1.5 },
    { key: 'straw', color: '#FDD835', baseLen: 12, baseW: 1.0 }
  ]

  const rng = new SeededRandom(generateSeed(ratio, params, 2, customSeed))

  const bd = params.beatingDegree
  const lenScale = 1.0 - (bd - 10) / 80 * 0.5
  const total = ratio.chuPi + ratio.hemp + ratio.bamboo + ratio.straw
  if (total === 0) return fibers

  for (const fc of fiberConfig) {
    const proportion = ratio[fc.key] / total
    const count = Math.round(proportion * 80)
    if (count === 0) continue

    for (let i = 0; i < count; i++) {
      const startX = rng.next() * width
      const startY = rng.next() * height
      const len = fc.baseLen * lenScale * (0.6 + rng.next() * 0.8)
      const angle = (rng.next() - 0.5) * Math.PI * 0.6
      const segments = 6
      const points: Array<{ x: number; y: number }> = []

      for (let s = 0; s <= segments; s++) {
        const t = s / segments
        const baseX = startX + Math.cos(angle) * len * t
        const baseY = startY + Math.sin(angle) * len * t
        const wobbleX = (rng.next() - 0.5) * 4
        const wobbleY = (rng.next() - 0.5) * 4
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

export function generateLayerInfo(
  ratio: FiberRatio,
  params: ProcessParams,
  microstructure: MicrostructureResult,
  customSeed?: number
): LayerInfo[] {
  const count = microstructure.layerCount
  const layers: LayerInfo[] = []
  const totalThickness = params.sheetThickness
  const layerThickness = totalThickness / count
  const bondingFactor = microstructure.layerBonding / 100

  const rng = new SeededRandom(generateSeed(ratio, params, 3, customSeed))

  for (let i = 0; i < count; i++) {
    const randomFactor = 0.9 + rng.next() * 0.2
    const thickness = layerThickness * randomFactor
    const density = 0.6 + bondingFactor * 0.3 + rng.next() * 0.1
    const fiberMix: FiberRatio = {
      chuPi: ratio.chuPi * (0.9 + rng.next() * 0.2),
      hemp: ratio.hemp * (0.9 + rng.next() * 0.2),
      bamboo: ratio.bamboo * (0.9 + rng.next() * 0.2),
      straw: ratio.straw * (0.9 + rng.next() * 0.2)
    }
    const total = fiberMix.chuPi + fiberMix.hemp + fiberMix.bamboo + fiberMix.straw
    const keys: Array<keyof FiberRatio> = ['chuPi', 'hemp', 'bamboo', 'straw']
    keys.forEach(k => {
      fiberMix[k] = (fiberMix[k] / total) * 100
    })

    layers.push({
      index: i,
      thickness,
      density,
      fiberMix,
      isTop: i === 0,
      isBottom: i === count - 1
    })
  }

  return layers
}

export function runFullSimulation(
  ratio: FiberRatio,
  params: ProcessParams,
  canvasWidth: number = 600,
  canvasHeight: number = 300,
  customSeed?: number
): FullSimulationResult {
  const effectiveSeed = customSeed !== undefined
    ? customSeed
    : generateDeterministicSeed(ratio, params, 0)

  const microstructure = simulateMicrostructure(ratio, params)
  const prediction = predictIndicators(ratio, params, microstructure)
  const poreHistogram = generatePoreHistogram(microstructure, ratio, params, effectiveSeed)
  const fiberPaths = generateFiberPaths(ratio, params, canvasWidth, canvasHeight, effectiveSeed)
  const layerInfo = generateLayerInfo(ratio, params, microstructure, effectiveSeed)

  const partial = {
    params,
    fiberRatio: ratio,
    microstructure,
    prediction,
    seed: effectiveSeed
  }
  const checksum = computeSnapshotChecksum(partial)

  return {
    params,
    fiberRatio: ratio,
    microstructure,
    prediction,
    poreHistogram,
    fiberPaths,
    layerInfo,
    seed: effectiveSeed,
    checksum
  }
}

export function runReplaySimulation(
  original: SimulationSnapshot
): FullSimulationResult {
  return runFullSimulation(
    original.fiberRatio,
    original.params,
    600,
    300,
    original.seed
  )
}

export function generateRandomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff)
}
