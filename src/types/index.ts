export interface FiberRatio {
  chuPi: number
  hemp: number
  bamboo: number
  straw: number
}

export interface PaperPerformance {
  strength: number
  waterAbsorption: number
  texture: number
  durability: number
  whiteness: number
}

export type RecipeStatus = 'draft' | 'finalized' | 'verified'

export interface Recipe {
  id: string
  name: string
  fiberRatio: FiberRatio
  performance: PaperPerformance
  status: RecipeStatus
  conclusion: string
  rating: number
  createdAt: number
  updatedAt: number
}

export interface FiberInfo {
  key: keyof FiberRatio
  name: string
  color: string
  basePerformance: PaperPerformance
}

export const FIBER_INFO_LIST: FiberInfo[] = [
  {
    key: 'chuPi',
    name: '楮皮',
    color: '#D4A574',
    basePerformance: {
      strength: 90,
      waterAbsorption: 60,
      texture: 95,
      durability: 85,
      whiteness: 70
    }
  },
  {
    key: 'hemp',
    name: '麻',
    color: '#8B7355',
    basePerformance: {
      strength: 85,
      waterAbsorption: 75,
      texture: 70,
      durability: 90,
      whiteness: 65
    }
  },
  {
    key: 'bamboo',
    name: '竹',
    color: '#7CB342',
    basePerformance: {
      strength: 70,
      waterAbsorption: 85,
      texture: 60,
      durability: 65,
      whiteness: 80
    }
  },
  {
    key: 'straw',
    name: '稻草',
    color: '#FDD835',
    basePerformance: {
      strength: 55,
      waterAbsorption: 90,
      texture: 50,
      durability: 50,
      whiteness: 85
    }
  }
]

export const PERFORMANCE_KEYS: Array<{ key: keyof PaperPerformance; name: string }> = [
  { key: 'strength', name: '强度' },
  { key: 'waterAbsorption', name: '吸水性' },
  { key: 'texture', name: '纹理表现' },
  { key: 'durability', name: '耐久性' },
  { key: 'whiteness', name: '白度' }
]
