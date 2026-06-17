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

export interface RecipeVersion {
  id: string
  version: number
  fiberRatio: FiberRatio
  performance: PaperPerformance
  changedAt: number
  changeNote: string
}

export interface RatingDetail {
  overall: number
  strength: number
  appearance: number
  feel: number
  durability: number
  cost: number
}

export interface ExperimentRecord {
  id: string
  recipeId: string
  recipeVersionId?: string
  date: number
  conditions: string
  observations: string
  result: string
  rating: number
  archivedAt: number | null
  templateId?: string
  tags?: string[]
}

export interface RecipeTag {
  id: string
  name: string
  color: string
  description?: string
}

export interface RatingHistoryEntry {
  id: string
  recipeId: string
  recipeVersionId?: string
  ratingDetail: RatingDetail
  ratedAt: number
  note?: string
  experimentRecordId?: string
}

export interface ResearchNote {
  id: string
  recipeId: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
  tags: string[]
  linkedExperimentIds: string[]
  linkedRecipeVersionIds: string[]
}

export interface ExperimentTemplate {
  id: string
  name: string
  description: string
  defaultConditions: string
  observationGuide: string
  resultTemplate: string
  createdAt: number
  isDefault?: boolean
}

export type ComparisonMode = 'recipes' | 'versions' | 'history'

export interface AdvancedFilter {
  status: RecipeStatus | 'all'
  tags: string[]
  minRating: number
  maxRating: number
  dateFrom: number | null
  dateTo: number | null
  performanceRange: Partial<Record<keyof PaperPerformance, { min: number; max: number }>>
}

export interface RecipeRecommendation {
  id: string
  type: 'improvement' | 'exploration' | 'classic'
  recipeId?: string
  title: string
  description: string
  confidence: number
  similarity?: number
  reason?: string
  improvements?: string[]
  suggestedRatio?: FiberRatio
  expectedPerformance?: PaperPerformance
  generatedAt: number
}

export interface FiberDescription {
  key: keyof FiberRatio
  origin: string
  fiberLength: string
  processingMethod: string
  characteristics: string
  suitableFor: string
  tips: string
}

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
  versions: RecipeVersion[]
  ratingDetail: RatingDetail
  experimentRecordIds: string[]
  tags: string[]
  ratingHistoryIds: string[]
  researchNoteIds: string[]
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

export const FIBER_DESCRIPTIONS: FiberDescription[] = [
  {
    key: 'chuPi',
    origin: '构树（Broussonetia papyrifera）内皮',
    fiberLength: '3.5-8.2mm（平均5.6mm）',
    processingMethod: '蒸煮→浸泡→灰腌→蒸煮→捶打→抄纸',
    characteristics: '纤维长且柔韧，细胞壁薄，具有极佳的交织力，成纸后强度高、韧性好、纹理细腻',
    suitableFor: '书画纸、修复用纸、高档信笺',
    tips: '楮皮含量越高，纸张韧性越强，但白度会略有下降；建议搭配少量麻纤维提升耐久性'
  },
  {
    key: 'hemp',
    origin: '苎麻（Boehmeria nivea）茎部韧皮',
    fiberLength: '20-260mm（超长纤维）',
    processingMethod: '剥皮→浸泡→碱煮→打麻→梳麻→切短→抄纸',
    characteristics: '纤维极长，抗拉强度极高，耐腐蚀耐老化，成纸后耐久性卓越，是传统文献用纸的核心原料',
    suitableFor: '档案纸、钞票纸、耐久文献纸、加固层',
    tips: '麻纤维过长需充分切短，否则易导致成纸均匀度下降；与楮皮搭配可兼顾强度与均匀性'
  },
  {
    key: 'bamboo',
    origin: '毛竹（Phyllostachys edulis）茎秆',
    fiberLength: '1.5-3.2mm（平均2.3mm）',
    processingMethod: '砍竹→浸沤→石灰腌制→蒸煮→漂洗→打浆→抄纸',
    characteristics: '纤维较短但吸墨性极佳，成纸白度较高，质地细腻，适合印刷与书写，但强度不如韧皮纤维',
    suitableFor: '印刷纸、书写纸、日常用纸',
    tips: '竹浆比例过高会降低纸张强度，建议搭配至少20%韧皮纤维（楮皮或麻）以维持基本强度'
  },
  {
    key: 'straw',
    origin: '稻草（Oryza sativa 秸秆）',
    fiberLength: '0.5-1.8mm（平均1.0mm）',
    processingMethod: '堆沤→石灰浸泡→蒸煮→漂洗→打浆→抄纸',
    characteristics: '纤维最短，但吸水性最强，成纸白度最高，成本低廉，适合作为填充原料提升纸张白度和吸墨性',
    suitableFor: '吸墨纸、练习纸、填充用纸',
    tips: '稻草纤维耐久性最差，不宜在高耐久需求配方中占比超过30%；适合用于调节白度和吸水性'
  }
]

export const PERFORMANCE_KEYS: Array<{ key: keyof PaperPerformance; name: string }> = [
  { key: 'strength', name: '强度' },
  { key: 'waterAbsorption', name: '吸水性' },
  { key: 'texture', name: '纹理表现' },
  { key: 'durability', name: '耐久性' },
  { key: 'whiteness', name: '白度' }
]

export const RATING_DIMENSIONS: Array<{ key: keyof RatingDetail; name: string; description: string }> = [
  { key: 'strength', name: '强度', description: '纸张抗拉、抗撕裂能力' },
  { key: 'appearance', name: '外观', description: '色泽、均匀度、外观质感' },
  { key: 'feel', name: '手感', description: '触感、柔韧度、书写体验' },
  { key: 'durability', name: '耐久性', description: '抗老化、耐腐蚀能力' },
  { key: 'cost', name: '经济性', description: '原料获取成本与加工难度' },
  { key: 'overall', name: '综合', description: '整体评价' }
]
