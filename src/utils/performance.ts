import type { FiberRatio, PaperPerformance } from '../types'
import { FIBER_INFO_LIST } from '../types'

export function calculatePerformance(ratio: FiberRatio): PaperPerformance {
  const total = ratio.chuPi + ratio.hemp + ratio.bamboo + ratio.straw
  if (total === 0) {
    return {
      strength: 0,
      waterAbsorption: 0,
      texture: 0,
      durability: 0,
      whiteness: 0
    }
  }

  const result: PaperPerformance = {
    strength: 0,
    waterAbsorption: 0,
    texture: 0,
    durability: 0,
    whiteness: 0
  }

  for (const fiber of FIBER_INFO_LIST) {
    const weight = ratio[fiber.key] / total
    result.strength += fiber.basePerformance.strength * weight
    result.waterAbsorption += fiber.basePerformance.waterAbsorption * weight
    result.texture += fiber.basePerformance.texture * weight
    result.durability += fiber.basePerformance.durability * weight
    result.whiteness += fiber.basePerformance.whiteness * weight
  }

  return result
}

export function validateRatio(ratio: FiberRatio): { valid: boolean; message?: string } {
  const total = ratio.chuPi + ratio.hemp + ratio.bamboo + ratio.straw

  if (ratio.chuPi < 0 || ratio.hemp < 0 || ratio.bamboo < 0 || ratio.straw < 0) {
    return { valid: false, message: '原料比例不能为负数' }
  }

  if (Math.abs(total - 100) > 0.01) {
    return { valid: false, message: `原料比例合计必须为100%，当前为 ${total.toFixed(2)}%` }
  }

  return { valid: true }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}
