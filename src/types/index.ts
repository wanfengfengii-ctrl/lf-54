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
  defaultObservations: string
  resultTemplate: string
  defaultTags: string[]
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
  description: string
  fiberLength: string
  origin: string
  processingMethod: string
  usageTips: string
  basePerformance: PaperPerformance
}

export const FIBER_INFO_LIST: FiberInfo[] = [
  {
    key: 'chuPi',
    name: '楮皮',
    color: '#D4A574',
    description: '楮皮（构树皮）是传统手工纸最主要的原料之一，纤维细长柔韧，成纸后具有极佳的韧性和耐久性，是制作高级书画纸的首选材料。楮皮纸素有"纸寿千年"的美誉，是历代书画名家的挚爱。',
    fiberLength: '6-12mm',
    origin: '中国北方、长江流域',
    processingMethod: '剥皮→浸泡→蒸煮→漂洗→打浆',
    usageTips: '建议配比在30%-70%之间。高配比适合制作耐久的档案纸、书画纸；低配比可改善纸张韧性。与竹浆搭配可在成本与性能间取得良好平衡。打浆时宜采用轻打，以保持纤维长度。',
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
    description: '麻纤维（包括苎麻、亚麻）是最早被用于造纸的植物纤维之一，纤维粗长，强度高，成纸手感厚实，具有独特的纹理质感。麻纸在古代广泛用于文书、典籍的抄写。',
    fiberLength: '20-200mm',
    origin: '全国各地均有种植',
    processingMethod: '剥皮→浸沤→晾晒→蒸煮→漂洗→打浆',
    usageTips: '麻纤维强度高，适合需要高耐破度的纸张。建议配比20%-50%。高配比会使纸面纹理明显，适合仿古纸、艺术纸；低配比可增强纸张的撕裂强度。需要较长时间打浆才能获得良好的匀度。',
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
    description: '竹浆是中国南方地区传统手工纸的重要原料，纤维长度适中，成纸匀度好，吸墨性佳，是制作书法、绘画用纸的理想材料。竹纸自宋代以来成为主流纸张，极大地促进了文化传播。',
    fiberLength: '1.5-3.0mm',
    origin: '中国南方各省（浙江、福建、四川等）',
    processingMethod: '砍竹→切段→浸泡→蒸煮→漂洗→捣浆→抄纸',
    usageTips: '竹浆吸墨性好，适合书画创作。建议配比20%-60%。高配比适合书法练习纸、国画用纸；低配比可改善纸张的印刷适应性。竹浆需充分打浆以获得良好的纤维结合力，注意控制打浆度避免纸张变脆。',
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
    description: '稻草浆是最经济的造纸原料，纤维细短，成纸柔软，白度较高，但强度较低。稻草纸在民间广泛用于包装、裱糊、练习用纸等，是传统社会中最普及的纸张类型。',
    fiberLength: '0.5-1.5mm',
    origin: '全国各水稻产区',
    processingMethod: '收割→晾晒→切段→浸泡→蒸煮→漂洗→打浆→抄纸',
    usageTips: '稻草浆成本低，适合大量生产。建议配比10%-40%。高配比适合练习纸、包装纸；低配比可调节纸张的柔软度和白度。稻草纤维较短，需与长纤维搭配使用以保证纸张强度，打浆时应避免过度切断。',
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

export interface ProcessParams {
  beatingDegree: number
  sheetThickness: number
  pressingIntensity: number
  dryingTemperature: number
  dryingDuration: number
}

export interface MicrostructureResult {
  fiberInterweaving: number
  poreSize: number
  poreDistribution: number
  uniformity: number
  layerCount: number
  layerBonding: number
}

export interface PredictionIndicators {
  strength: number
  inkDiffusion: number
  lightTransmittance: number
  surfaceFineness: number
  durability: number
}

export interface SimulationSnapshot {
  id: string
  params: ProcessParams
  fiberRatio: FiberRatio
  microstructure: MicrostructureResult
  prediction: PredictionIndicators
  poreHistogram: Array<{ range: string; count: number }>
  fiberPaths: Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }>
  layerInfo: Array<{ index: number; thickness: number; density: number; fiberMix: FiberRatio; isTop: boolean; isBottom: boolean }>
  createdAt: number
  note: string
}

export const PROCESS_PARAM_RANGES: Record<keyof ProcessParams, { min: number; max: number; step: number; unit: string; label: string }> = {
  beatingDegree: { min: 10, max: 90, step: 1, unit: '°SR', label: '打浆度' },
  sheetThickness: { min: 20, max: 200, step: 5, unit: 'μm', label: '抄纸厚度' },
  pressingIntensity: { min: 1, max: 10, step: 0.5, unit: 'MPa', label: '压榨强度' },
  dryingTemperature: { min: 20, max: 120, step: 5, unit: '℃', label: '干燥温度' },
  dryingDuration: { min: 1, max: 60, step: 1, unit: 'min', label: '干燥时长' }
}

export const PREDICTION_KEYS: Array<{ key: keyof PredictionIndicators; name: string; unit: string; description: string; color: string }> = [
  { key: 'strength', name: '强度', unit: 'kN/m', description: '抗拉与抗撕裂强度预测', color: '#1890ff' },
  { key: 'inkDiffusion', name: '吸墨扩散', unit: 'mm', description: '墨水在纸面扩散半径预测', color: '#722ed1' },
  { key: 'lightTransmittance', name: '透光性', unit: '%', description: '光线透过纸张的比例预测', color: '#13c2c2' },
  { key: 'surfaceFineness', name: '表面细腻度', unit: 'μm', description: '纸面粗糙度R预测（越低越细腻）', color: '#faad14' },
  { key: 'durability', name: '耐久性', unit: '年', description: '预估安全保存年限', color: '#52c41a' }
]

export const MICROSTRUCTURE_KEYS: Array<{ key: keyof MicrostructureResult; name: string; unit: string; description: string; color: string; max: number; format: 'int' | 'float' }> = [
  { key: 'fiberInterweaving', name: '纤维交织度', unit: '', description: '纤维相互缠绕交织的程度，越高表示纤维结合越紧密', color: '#1890ff', max: 100, format: 'float' },
  { key: 'poreSize', name: '平均孔径', unit: 'μm', description: '纸页内部孔隙的平均直径，影响吸墨性和透气性', color: '#722ed1', max: 50, format: 'float' },
  { key: 'poreDistribution', name: '孔径分布', unit: '', description: '孔隙大小的均匀程度，越高表示孔径越一致', color: '#13c2c2', max: 100, format: 'float' },
  { key: 'uniformity', name: '纸页匀度', unit: '', description: '纤维在纸页中的分布均匀性，越高表示成纸越均匀', color: '#faad14', max: 100, format: 'float' },
  { key: 'layerCount', name: '层次数量', unit: '层', description: '纸页截面的纤维分层数量，影响层次感和强度', color: '#52c41a', max: 15, format: 'int' },
  { key: 'layerBonding', name: '层间结合', unit: '', description: '各纤维层之间的结合强度，影响纸张抗分层能力', color: '#eb2f96', max: 100, format: 'float' }
]

export const RATING_DIMENSIONS: Array<{ key: keyof RatingDetail; name: string; description: string }> = [
  { key: 'strength', name: '强度', description: '纸张抗拉、抗撕裂能力' },
  { key: 'appearance', name: '外观', description: '色泽、均匀度、外观质感' },
  { key: 'feel', name: '手感', description: '触感、柔韧度、书写体验' },
  { key: 'durability', name: '耐久性', description: '抗老化、耐腐蚀能力' },
  { key: 'cost', name: '经济性', description: '原料获取成本与加工难度' },
  { key: 'overall', name: '综合', description: '整体评价' }
]
