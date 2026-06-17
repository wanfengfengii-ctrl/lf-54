import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  FiberRatio,
  PaperPerformance,
  Recipe,
  RecipeStatus,
  ExperimentRecord,
  RatingDetail,
  RecipeVersion,
  RecipeTag,
  RatingHistoryEntry,
  ResearchNote,
  ExperimentTemplate,
  AdvancedFilter,
  RecipeRecommendation
} from '../types'
import { FIBER_INFO_LIST, PERFORMANCE_KEYS } from '../types'
import { calculatePerformance, validateRatio, generateId } from '../utils/performance'

const DEFAULT_RATING_DETAIL: RatingDetail = {
  overall: 0,
  strength: 0,
  appearance: 0,
  feel: 0,
  durability: 0,
  cost: 0
}

export const useRecipeStore = defineStore('recipe', () => {
  const currentRatio = ref<FiberRatio>({
    chuPi: 40,
    hemp: 30,
    bamboo: 20,
    straw: 10
  })

  const currentName = ref('新配方')
  const currentConclusion = ref('')
  const currentRating = ref(0)
  const currentRatingDetail = ref<RatingDetail>({ ...DEFAULT_RATING_DETAIL })

  const recipes = ref<Recipe[]>([
    {
      id: generateId(),
      name: '传统楮皮纸配方',
      fiberRatio: { chuPi: 70, hemp: 20, bamboo: 5, straw: 5 },
      performance: calculatePerformance({ chuPi: 70, hemp: 20, bamboo: 5, straw: 5 }),
      status: 'verified',
      conclusion: '该配方纸张强度高，纹理细腻，适合书画创作。楮皮纤维占主导，提供了优良的韧性和手感。',
      rating: 5,
      createdAt: Date.now() - 86400000 * 7,
      updatedAt: Date.now() - 86400000 * 3,
      versions: [
        {
          id: generateId(),
          version: 1,
          fiberRatio: { chuPi: 70, hemp: 20, bamboo: 5, straw: 5 },
          performance: calculatePerformance({ chuPi: 70, hemp: 20, bamboo: 5, straw: 5 }),
          changedAt: Date.now() - 86400000 * 7,
          changeNote: '初始版本'
        }
      ],
      ratingDetail: { overall: 5, strength: 5, appearance: 4, feel: 5, durability: 5, cost: 3 },
      experimentRecordIds: [],
      tags: ['经典配方', '书画用纸'],
      ratingHistoryIds: [],
      researchNoteIds: []
    },
    {
      id: generateId(),
      name: '竹浆混合配方',
      fiberRatio: { chuPi: 30, hemp: 10, bamboo: 40, straw: 20 },
      performance: calculatePerformance({ chuPi: 30, hemp: 10, bamboo: 40, straw: 20 }),
      status: 'finalized',
      conclusion: '',
      rating: 0,
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 86400000 * 1,
      versions: [
        {
          id: generateId(),
          version: 1,
          fiberRatio: { chuPi: 30, hemp: 10, bamboo: 40, straw: 20 },
          performance: calculatePerformance({ chuPi: 30, hemp: 10, bamboo: 40, straw: 20 }),
          changedAt: Date.now() - 86400000 * 3,
          changeNote: '初始版本'
        }
      ],
      ratingDetail: { ...DEFAULT_RATING_DETAIL },
      experimentRecordIds: [],
      tags: ['日常用纸'],
      ratingHistoryIds: [],
      researchNoteIds: []
    },
    {
      id: generateId(),
      name: '麻纤维强化配方',
      fiberRatio: { chuPi: 25, hemp: 45, bamboo: 15, straw: 15 },
      performance: calculatePerformance({ chuPi: 25, hemp: 45, bamboo: 15, straw: 15 }),
      status: 'draft',
      conclusion: '',
      rating: 0,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
      versions: [
        {
          id: generateId(),
          version: 1,
          fiberRatio: { chuPi: 25, hemp: 45, bamboo: 15, straw: 15 },
          performance: calculatePerformance({ chuPi: 25, hemp: 45, bamboo: 15, straw: 15 }),
          changedAt: Date.now() - 86400000,
          changeNote: '初始版本'
        }
      ],
      ratingDetail: { ...DEFAULT_RATING_DETAIL },
      experimentRecordIds: [],
      tags: ['高强度', '耐久'],
      ratingHistoryIds: [],
      researchNoteIds: []
    }
  ])

  const experimentRecords = ref<ExperimentRecord[]>([])
  const tags = ref<RecipeTag[]>([
    { id: 'tag-1', name: '经典配方', color: '#1890ff', description: '经过长期验证的传统配方' },
    { id: 'tag-2', name: '书画用纸', color: '#722ed1', description: '适合书法绘画创作' },
    { id: 'tag-3', name: '日常用纸', color: '#52c41a', description: '日常使用的通用纸张' },
    { id: 'tag-4', name: '高强度', color: '#fa8c16', description: '强度性能突出' },
    { id: 'tag-5', name: '耐久', color: '#eb2f96', description: '耐久性优秀' },
    { id: 'tag-6', name: '高白度', color: '#13c2c2', description: '白度表现优秀' },
    { id: 'tag-7', name: '实验中', color: '#f5222d', description: '正在实验验证的配方' }
  ])

  const ratingHistory = ref<RatingHistoryEntry[]>([])
  const researchNotes = ref<ResearchNote[]>([])
  const experimentTemplates = ref<ExperimentTemplate[]>([
    {
      id: 'tpl-1',
      name: '标准抄纸实验',
      description: '标准手工纸抄造实验记录模板',
      defaultConditions: '室温：25℃，湿度：60%，抄纸工具：竹帘\n浆料浓度：0.5%，抄纸速度：匀速\n压榨压力：5kg，干燥温度：40℃',
      observationGuide: '1. 浆料分散状态\n2. 抄纸时纤维交织情况\n3. 湿纸页成型质量\n4. 压榨后水分含量\n5. 干燥后外观变化\n6. 成纸匀度观察',
      resultTemplate: '## 实验结果总结\n\n### 外观\n- 颜色：\n- 匀度：\n- 纹理：\n\n### 物理性能\n- 手感：\n- 韧性：\n- 强度初步评估：\n\n### 与预期对比\n- 符合预期的方面：\n- 需要改进的方面：\n\n### 下一步计划\n',
      createdAt: Date.now() - 86400000 * 30,
      isDefault: true
    },
    {
      id: 'tpl-2',
      name: '耐久性测试',
      description: '加速老化测试记录模板',
      defaultConditions: '老化设备：UV加速老化箱\n温度：60℃，湿度：50%\nUV强度：0.89W/m²@340nm\n测试周期：72小时',
      observationGuide: '1. 初始状态记录（颜色、强度）\n2. 24小时后观察\n3. 48小时后观察\n4. 72小时后观察\n5. 黄变程度对比\n6. 强度损失评估',
      resultTemplate: '## 耐久性测试结果\n\n### 测试前后对比\n| 指标 | 测试前 | 测试后 | 变化率 |\n|------|--------|--------|--------|\n| 白度 | | | |\n| 强度 | | | |\n| 外观 | | | |\n\n### 综合评估\n- 耐久性等级：\n- 适用场景：\n- 改进建议：\n',
      createdAt: Date.now() - 86400000 * 20
    }
  ])

  const advancedFilter = ref<AdvancedFilter>({
    status: 'all',
    tags: [],
    minRating: 0,
    maxRating: 5,
    dateFrom: null,
    dateTo: null,
    performanceRange: {}
  })

  const selectedVersionIds = ref<string[]>([])

  const selectedRecipeIds = ref<string[]>([])
  const loadedRecipeId = ref<string | null>(null)

  const currentPerformance = computed<PaperPerformance>(() => {
    return calculatePerformance(currentRatio.value)
  })

  const totalRatio = computed(() => {
    return currentRatio.value.chuPi + currentRatio.value.hemp + currentRatio.value.bamboo + currentRatio.value.straw
  })

  const isRatioValid = computed(() => {
    return validateRatio(currentRatio.value).valid
  })

  const ratioErrorMessage = computed(() => {
    return validateRatio(currentRatio.value).message || ''
  })

  const loadedRecipe = computed(() => {
    if (!loadedRecipeId.value) return null
    return recipes.value.find(r => r.id === loadedRecipeId.value) || null
  })

  const canEditRatio = computed(() => {
    if (!loadedRecipe.value) return true
    return loadedRecipe.value.status === 'draft'
  })

  const selectedRecipes = computed(() => {
    return recipes.value.filter(r => selectedRecipeIds.value.includes(r.id))
  })

  const getExperimentRecordsForRecipe = computed(() => {
    return (recipeId: string) => {
      return experimentRecords.value.filter(r => r.recipeId === recipeId)
    }
  })

  const recipeTimeline = computed(() => {
    return recipes.value
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        status: recipe.status,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
        versionCount: recipe.versions.length,
        performance: recipe.performance
      }))
  })

  const advancedFilteredRecipes = computed(() => {
    let list = recipes.value.slice()
    const filter = advancedFilter.value

    if (filter.status !== 'all') {
      list = list.filter(r => r.status === filter.status)
    }

    if (filter.tags.length > 0) {
      list = list.filter(r => filter.tags.some(tag => r.tags.includes(tag)))
    }

    if (filter.minRating > 0) {
      list = list.filter(r => r.rating >= filter.minRating)
    }

    if (filter.maxRating < 5) {
      list = list.filter(r => r.rating <= filter.maxRating)
    }

    if (filter.dateFrom) {
      list = list.filter(r => r.createdAt >= filter.dateFrom!)
    }

    if (filter.dateTo) {
      list = list.filter(r => r.createdAt <= filter.dateTo!)
    }

    if (Object.keys(filter.performanceRange).length > 0) {
      list = list.filter(r => {
        for (const [key, range] of Object.entries(filter.performanceRange)) {
          const perfKey = key as keyof PaperPerformance
          const val = r.performance[perfKey]
          if (val < range.min || val > range.max) return false
        }
        return true
      })
    }

    return list
  })

  const selectedVersions = computed(() => {
    const recipe = recipes.value.find(r => r.id === loadedRecipeId.value)
    if (!recipe) return []
    return recipe.versions.filter(v => selectedVersionIds.value.includes(v.id))
  })

  const getRatingHistoryForRecipe = computed(() => {
    return (recipeId: string) => {
      return ratingHistory.value
        .filter(h => h.recipeId === recipeId)
        .sort((a, b) => b.ratedAt - a.ratedAt)
    }
  })

  const getResearchNotesForRecipe = computed(() => {
    return (recipeId: string) => {
      return researchNotes.value
        .filter(n => n.recipeId === recipeId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    }
  })

  const recipeRecommendations = computed((): RecipeRecommendation[] => {
    const currentRatio = currentRatio.value
    const currentPerf = currentPerformance.value
    const recs: RecipeRecommendation[] = []
    const now = Date.now()

    const similarRecipes = recipes.value
      .filter(r => r.id !== loadedRecipeId.value)
      .map(recipe => {
        let similarity = 0
        const fiberKeys: Array<keyof FiberRatio> = ['chuPi', 'hemp', 'bamboo', 'straw']
        fiberKeys.forEach(key => {
          similarity += 100 - Math.abs(currentRatio[key] - recipe.fiberRatio[key])
        })
        similarity = similarity / 4

        const improvements: string[] = []
        PERFORMANCE_KEYS.forEach(perf => {
          const diff = recipe.performance[perf.key] - currentPerf[perf.key]
          if (diff > 5) {
            improvements.push(`${perf.name}可提升${diff.toFixed(1)}`)
          }
        })

        let reason = ''
        if (similarity > 80) {
          reason = '配方组成高度相似，可作为优化参考'
        } else if (improvements.length >= 2) {
          reason = `在${improvements.slice(0, 2).join('、')}方面有优势`
        } else {
          reason = '性能表现较为均衡'
        }

        return { recipe, similarity, improvements, reason }
      })
      .filter(r => r.similarity > 60)
      .sort((a, b) => b.similarity - a.similarity)

    if (similarRecipes.length > 0) {
      const top = similarRecipes[0]
      recs.push({
        id: `rec-imp-1`,
        type: 'improvement',
        recipeId: top.recipe.id,
        title: `${top.recipe.name} 优化参考`,
        description: top.reason,
        confidence: Math.min(95, top.similarity + 10),
        similarity: top.similarity,
        improvements: top.improvements,
        suggestedRatio: { ...top.recipe.fiberRatio },
        expectedPerformance: { ...top.recipe.performance },
        generatedAt: now
      })
    }

    if (recipes.value.length > 0) {
      const topRated = [...recipes.value]
        .filter(r => r.ratingDetail.overall >= 80)
        .sort((a, b) => b.ratingDetail.overall - a.ratingDetail.overall)
        .slice(0, 2)

      topRated.forEach((recipe, i) => {
        recs.push({
          id: `rec-classic-${i}`,
          type: 'classic',
          recipeId: recipe.id,
          title: `经典配方：${recipe.name}`,
          description: `评级 ${recipe.ratingDetail.overall} 分，经过充分验证`,
          confidence: Math.min(98, 85 + recipe.experimentRecordIds.length * 3),
          suggestedRatio: { ...recipe.fiberRatio },
          expectedPerformance: { ...recipe.performance },
          generatedAt: now
        })
      })
    }

    if (recipes.value.length >= 5) {
      recs.push({
        id: `rec-exp-1`,
        type: 'exploration',
        title: '探索方向：高楮皮配比',
        description: '尝试提升楮皮比例至 55% 以上，以增强纸张强度和耐久性',
        confidence: 72,
        suggestedRatio: { chuPi: 60, hemp: 20, bamboo: 15, straw: 5 },
        expectedPerformance: { strength: 85, smoothness: 70, inkAbsorption: 65, durability: 88, flexibility: 72 },
        generatedAt: now
      })

      recs.push({
        id: `rec-exp-2`,
        type: 'exploration',
        title: '探索方向：多纤维均衡',
        description: '尝试四种纤维均衡配比，观察综合性能表现',
        confidence: 65,
        suggestedRatio: { chuPi: 30, hemp: 25, bamboo: 25, straw: 20 },
        expectedPerformance: { strength: 75, smoothness: 75, inkAbsorption: 75, durability: 72, flexibility: 78 },
        generatedAt: now
      })
    }

    return recs.slice(0, 6)
  })

  function applyRecommendation(rec: RecipeRecommendation): boolean {
    if (!rec.suggestedRatio) return false
    const validation = validateRatio(rec.suggestedRatio)
    if (!validation.valid) return false
    loadedRecipeId.value = null
    currentRatio.value = { ...rec.suggestedRatio }
    currentName.value = `参考推荐：${rec.title}`
    currentConclusion.value = ''
    currentRating.value = 0
    return true
  }

  const experimentStats = computed(() => {
    const records = experimentRecords.value
    const total = records.length
    const archived = records.filter(r => r.archivedAt).length
    const active = total - archived
    const avgRating = total > 0
      ? records.reduce((sum, r) => sum + r.rating, 0) / total
      : 0

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    records.forEach(r => {
      if (r.rating > 0) ratingDistribution[r.rating]++
    })

    return { total, archived, active, avgRating, ratingDistribution }
  })

  function loadRecipeVersion(versionId: string) {
    if (!loadedRecipe.value) return false
    const version = loadedRecipe.value.versions.find(v => v.id === versionId)
    if (!version) return false

    currentRatio.value = { ...version.fiberRatio }
    return true
  }

  function toggleSelectVersion(versionId: string) {
    const index = selectedVersionIds.value.indexOf(versionId)
    if (index === -1) {
      if (selectedVersionIds.value.length < 3) {
        selectedVersionIds.value.push(versionId)
      }
    } else {
      selectedVersionIds.value.splice(index, 1)
    }
  }

  function addTagToRecipe(recipeId: string, tagName: string) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }

    let tag = tags.value.find(t => t.name === tagName)
    if (!tag) {
      tag = {
        id: generateId(),
        name: tagName,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
      }
      tags.value.push(tag)
    }

    if (!recipe.tags.includes(tagName)) {
      recipe.tags.push(tagName)
      recipe.updatedAt = Date.now()
    }
    return { success: true, message: '标签已添加', tag }
  }

  function removeTagFromRecipe(recipeId: string, tagName: string) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }

    const index = recipe.tags.indexOf(tagName)
    if (index > -1) {
      recipe.tags.splice(index, 1)
      recipe.updatedAt = Date.now()
    }
    return { success: true, message: '标签已移除' }
  }

  function addRatingHistory(
    recipeId: string,
    ratingDetail: RatingDetail,
    note?: string,
    experimentRecordId?: string,
    recipeVersionId?: string
  ) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }

    const entry: RatingHistoryEntry = {
      id: generateId(),
      recipeId,
      recipeVersionId,
      ratingDetail: { ...ratingDetail },
      ratedAt: Date.now(),
      note,
      experimentRecordId
    }

    ratingHistory.value.push(entry)
    recipe.ratingHistoryIds.push(entry.id)
    recipe.updatedAt = Date.now()

    return { success: true, message: '评级历史已记录', entry }
  }

  function addResearchNote(note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>) {
    const recipe = recipes.value.find(r => r.id === note.recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }

    const newNote: ResearchNote = {
      id: generateId(),
      ...note,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    researchNotes.value.push(newNote)
    recipe.researchNoteIds.push(newNote.id)
    recipe.updatedAt = Date.now()

    return { success: true, message: '研究笔记已添加', note: newNote }
  }

  function updateResearchNote(noteId: string, updates: Partial<ResearchNote>) {
    const note = researchNotes.value.find(n => n.id === noteId)
    if (!note) return { success: false, message: '笔记不存在' }

    Object.assign(note, updates)
    note.updatedAt = Date.now()

    return { success: true, message: '笔记已更新' }
  }

  function deleteResearchNote(noteId: string) {
    const note = researchNotes.value.find(n => n.id === noteId)
    if (!note) return false

    const recipe = recipes.value.find(r => r.id === note.recipeId)
    if (recipe) {
      recipe.researchNoteIds = recipe.researchNoteIds.filter(id => id !== noteId)
    }

    const index = researchNotes.value.findIndex(n => n.id === noteId)
    if (index > -1) researchNotes.value.splice(index, 1)
    return true
  }

  function addExperimentTemplate(template: Omit<ExperimentTemplate, 'id' | 'createdAt'>) {
    const newTemplate: ExperimentTemplate = {
      id: generateId(),
      ...template,
      createdAt: Date.now()
    }
    experimentTemplates.value.push(newTemplate)
    return newTemplate
  }

  function exportAnalysisReport(recipeId: string): string {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return ''

    const history = getRatingHistoryForRecipe.value(recipeId)
    const experiments = getExperimentRecordsForRecipe.value(recipeId)
    const notes = getResearchNotesForRecipe.value(recipeId)

    const report = `# 配方分析报告 - ${recipe.name}

## 基本信息
- 创建时间：${new Date(recipe.createdAt).toLocaleString()}
- 最后更新：${new Date(recipe.updatedAt).toLocaleString()}
- 状态：${store.getStatusText(recipe.status)}
- 标签：${recipe.tags.join('、') || '无'}

## 纤维配比
| 原料 | 比例 |
|------|------|
${FIBER_INFO_LIST.map(f => `| ${f.name} | ${recipe.fiberRatio[f.key].toFixed(1)}% |`).join('\n')}

## 性能指标
| 指标 | 数值 |
|------|------|
${PERFORMANCE_KEYS.map(p => `| ${p.name} | ${recipe.performance[p.key].toFixed(1)} |`).join('\n')}

## 评级详情
- 综合评级：${'★'.repeat(recipe.rating)}${'☆'.repeat(5 - recipe.rating)}
- 强度：${recipe.ratingDetail.strength}/5
- 外观：${recipe.ratingDetail.appearance}/5
- 手感：${recipe.ratingDetail.feel}/5
- 耐久性：${recipe.ratingDetail.durability}/5
- 经济性：${recipe.ratingDetail.cost}/5

## 版本历史（共${recipe.versions.length}个版本）
${recipe.versions.map(v => `- v${v.version}: ${v.changeNote} (${new Date(v.changedAt).toLocaleString()})`).join('\n')}

## 实验记录（共${experiments.length}条）
${experiments.slice(0, 5).map(e => `- ${new Date(e.date).toLocaleString()}: ${e.result.substring(0, 50)}...`).join('\n')}

## 研究笔记（共${notes.length}条）
${notes.slice(0, 3).map(n => `- ${n.title}: ${n.content.substring(0, 50)}...`).join('\n')}

## 评级历史（共${history.length}条）
${history.slice(0, 5).map(h => `- ${new Date(h.ratedAt).toLocaleString()}: 综合${h.ratingDetail.overall}星${h.note ? ` - ${h.note}` : ''}`).join('\n')}

## 实验结论
${recipe.conclusion || '暂无结论'}

---
*报告生成时间：${new Date().toLocaleString()}*
`

    return report
  }

  function downloadAnalysisReport(recipeId: string) {
    const report = exportAnalysisReport(recipeId)
    if (!report) return false

    const recipe = recipes.value.find(r => r.id === recipeId)
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${recipe?.name || '配方'}_分析报告.md`
    a.click()
    URL.revokeObjectURL(url)
    return true
  }

  function batchUpdateRecipes(recipeIds: string[], updates: Partial<Recipe>) {
    recipeIds.forEach(id => {
      const recipe = recipes.value.find(r => r.id === id)
      if (recipe) {
        Object.assign(recipe, updates)
        recipe.updatedAt = Date.now()
      }
    })
    return { success: true, message: `已更新${recipeIds.length}个配方` }
  }

  function batchDeleteRecipes(recipeIds: string[]) {
    recipeIds.forEach(id => {
      store.deleteRecipe(id)
    })
    return { success: true, message: `已删除${recipeIds.length}个配方` }
  }

  function batchAddTag(recipeIds: string[], tagName: string) {
    recipeIds.forEach(id => {
      addTagToRecipe(id, tagName)
    })
    return { success: true, message: `已为${recipeIds.length}个配方添加标签` }
  }

  function setFiberRatio(key: keyof FiberRatio, value: number) {
    if (!canEditRatio.value) return

    if (loadedRecipeId.value) {
      loadedRecipeId.value = null
      currentName.value = '新配方（未保存）'
    }

    const clampedValue = Math.max(0, Math.min(100, value))
    const others = FIBER_INFO_LIST.filter(f => f.key !== key)
    const othersTotal = others.reduce((sum, f) => sum + currentRatio.value[f.key], 0)
    const remaining = 100 - clampedValue

    if (remaining < 0) {
      currentRatio.value[key] = 100
      for (const fiber of others) {
        currentRatio.value[fiber.key] = 0
      }
      return
    }

    currentRatio.value[key] = clampedValue

    if (othersTotal > 0) {
      const scale = remaining / othersTotal
      for (const fiber of others) {
        currentRatio.value[fiber.key] = Math.round(currentRatio.value[fiber.key] * scale * 100) / 100
      }
    } else {
      const each = remaining / others.length
      for (const fiber of others) {
        currentRatio.value[fiber.key] = Math.round(each * 100) / 100
      }
    }

    const diff = 100 - Object.values(currentRatio.value).reduce((a, b) => a + b, 0)
    if (Math.abs(diff) > 0.001) {
      const lastKey = others[others.length - 1].key
      currentRatio.value[lastKey] = Math.round((currentRatio.value[lastKey] + diff) * 100) / 100
    }
  }

  function saveAsNewVersion() {
    if (!isRatioValid.value) {
      return { success: false, message: ratioErrorMessage.value }
    }

    const newRecipe: Recipe = {
      id: generateId(),
      name: currentName.value,
      fiberRatio: { ...currentRatio.value },
      performance: { ...currentPerformance.value },
      status: 'draft',
      conclusion: currentConclusion.value,
      rating: currentRating.value,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [
        {
          id: generateId(),
          version: 1,
          fiberRatio: { ...currentRatio.value },
          performance: { ...currentPerformance.value },
          changedAt: Date.now(),
          changeNote: '初始版本'
        }
      ],
      ratingDetail: { ...currentRatingDetail.value },
      experimentRecordIds: [],
      tags: [],
      ratingHistoryIds: [],
      researchNoteIds: []
    }

    recipes.value.unshift(newRecipe)
    return { success: true, message: '配方保存成功', recipe: newRecipe }
  }

  function updateCurrentRecipe(recipeId: string, changeNote?: string) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }
    if (recipe.status === 'finalized' || recipe.status === 'verified') {
      return { success: false, message: '已定版或已验证的配方不能编辑比例' }
    }

    if (!isRatioValid.value) {
      return { success: false, message: ratioErrorMessage.value }
    }

    const oldRatioStr = JSON.stringify(recipe.fiberRatio)
    const newRatioStr = JSON.stringify(currentRatio.value)
    const hasRatioChange = oldRatioStr !== newRatioStr

    if (hasRatioChange) {
      const newVersion: RecipeVersion = {
        id: generateId(),
        version: recipe.versions.length + 1,
        fiberRatio: { ...currentRatio.value },
        performance: { ...currentPerformance.value },
        changedAt: Date.now(),
        changeNote: changeNote || `版本 ${recipe.versions.length + 1} 更新`
      }
      recipe.versions.push(newVersion)
    }

    recipe.fiberRatio = { ...currentRatio.value }
    recipe.performance = { ...currentPerformance.value }
    recipe.name = currentName.value
    recipe.conclusion = currentConclusion.value
    recipe.rating = currentRating.value
    recipe.ratingDetail = { ...currentRatingDetail.value }
    recipe.updatedAt = Date.now()

    return { success: true, message: '配方更新成功' }
  }

  function loadRecipe(recipeId: string) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return false

    loadedRecipeId.value = recipeId
    currentRatio.value = { ...recipe.fiberRatio }
    currentName.value = recipe.name
    currentConclusion.value = recipe.conclusion
    currentRating.value = recipe.rating
    currentRatingDetail.value = { ...recipe.ratingDetail }

    return true
  }

  function resetToNewRecipe() {
    loadedRecipeId.value = null
    currentRatio.value = { chuPi: 40, hemp: 30, bamboo: 20, straw: 10 }
    currentName.value = '新配方'
    currentConclusion.value = ''
    currentRating.value = 0
    currentRatingDetail.value = { ...DEFAULT_RATING_DETAIL }
  }

  function finalizeRecipe(recipeId: string) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }
    if (recipe.status !== 'draft') {
      return { success: false, message: '只有草稿状态的配方可以定版' }
    }

    const validation = validateRatio(recipe.fiberRatio)
    if (!validation.valid) {
      return { success: false, message: validation.message }
    }

    recipe.status = 'finalized'
    recipe.updatedAt = Date.now()
    return { success: true, message: '配方已定版' }
  }

  function verifyRecipe(recipeId: string) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }
    if (recipe.status !== 'finalized') {
      return { success: false, message: '只有定版状态的配方可以验证' }
    }
    if (!recipe.conclusion || recipe.conclusion.trim() === '') {
      return { success: false, message: '缺少实验结论，不能标记为已验证' }
    }

    recipe.status = 'verified'
    recipe.updatedAt = Date.now()
    return { success: true, message: '配方已验证' }
  }

  function deleteRecipe(recipeId: string) {
    const index = recipes.value.findIndex(r => r.id === recipeId)
    if (index === -1) return false
    recipes.value.splice(index, 1)
    selectedRecipeIds.value = selectedRecipeIds.value.filter(id => id !== recipeId)
    experimentRecords.value = experimentRecords.value.filter(r => r.recipeId !== recipeId)
    return true
  }

  function toggleSelectRecipe(recipeId: string) {
    const index = selectedRecipeIds.value.indexOf(recipeId)
    if (index === -1) {
      if (selectedRecipeIds.value.length < 3) {
        selectedRecipeIds.value.push(recipeId)
      }
    } else {
      selectedRecipeIds.value.splice(index, 1)
    }
  }

  function importRecipe(recipeData: Partial<Recipe> & { fiberRatio: FiberRatio }) {
    const validation = validateRatio(recipeData.fiberRatio)
    if (!validation.valid) {
      return { success: false, message: `导入失败：${validation.message}` }
    }

    loadedRecipeId.value = null
    currentRatio.value = { ...recipeData.fiberRatio }
    if (recipeData.name) currentName.value = recipeData.name
    if (recipeData.conclusion !== undefined) currentConclusion.value = recipeData.conclusion
    if (recipeData.rating !== undefined) currentRating.value = recipeData.rating

    return { success: true, message: '配方导入成功' }
  }

  function updateRecipeConclusion(recipeId: string, conclusion: string, rating: number) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }

    recipe.conclusion = conclusion
    recipe.rating = rating
    recipe.updatedAt = Date.now()

    return { success: true, message: '实验结论已更新' }
  }

  function updateRecipeRatingDetail(recipeId: string, ratingDetail: RatingDetail) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }

    recipe.ratingDetail = { ...ratingDetail }
    recipe.rating = ratingDetail.overall
    recipe.updatedAt = Date.now()

    return { success: true, message: '评级已更新' }
  }

  function addExperimentRecord(recipeId: string, record: Omit<ExperimentRecord, 'id' | 'recipeId' | 'archivedAt'>) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }

    const newRecord: ExperimentRecord = {
      id: generateId(),
      recipeId,
      date: record.date,
      conditions: record.conditions,
      observations: record.observations,
      result: record.result,
      rating: record.rating,
      archivedAt: null
    }

    experimentRecords.value.push(newRecord)
    recipe.experimentRecordIds.push(newRecord.id)
    recipe.updatedAt = Date.now()

    return { success: true, message: '实验记录已添加', record: newRecord }
  }

  function archiveExperimentRecord(recordId: string) {
    const record = experimentRecords.value.find(r => r.id === recordId)
    if (!record) return { success: false, message: '记录不存在' }
    if (record.archivedAt) return { success: false, message: '该记录已归档' }

    record.archivedAt = Date.now()
    return { success: true, message: '实验记录已归档' }
  }

  function deleteExperimentRecord(recordId: string) {
    const record = experimentRecords.value.find(r => r.id === recordId)
    if (!record) return false

    const recipe = recipes.value.find(r => r.id === record.recipeId)
    if (recipe) {
      recipe.experimentRecordIds = recipe.experimentRecordIds.filter(id => id !== recordId)
    }

    const index = experimentRecords.value.findIndex(r => r.id === recordId)
    if (index !== -1) experimentRecords.value.splice(index, 1)
    return true
  }

  function getStatusText(status: RecipeStatus): string {
    const map: Record<RecipeStatus, string> = {
      draft: '草稿',
      finalized: '已定版',
      verified: '已验证'
    }
    return map[status]
  }

  function getRecipeById(recipeId: string): Recipe | undefined {
    return recipes.value.find(r => r.id === recipeId)
  }

  return {
    currentRatio,
    currentName,
    currentConclusion,
    currentRating,
    currentRatingDetail,
    currentPerformance,
    totalRatio,
    isRatioValid,
    ratioErrorMessage,
    canEditRatio,
    loadedRecipeId,
    loadedRecipe,
    selectedRecipeIds,
    selectedRecipes,
    recipes,
    experimentRecords,
    recipeTimeline,
    getExperimentRecordsForRecipe,
    tags,
    ratingHistory,
    researchNotes,
    experimentTemplates,
    advancedFilter,
    selectedVersionIds,
    advancedFilteredRecipes,
    selectedVersions,
    getRatingHistoryForRecipe,
    getResearchNotesForRecipe,
    recipeRecommendations,
    experimentStats,
    setFiberRatio,
    saveAsNewVersion,
    updateCurrentRecipe,
    loadRecipe,
    resetToNewRecipe,
    finalizeRecipe,
    verifyRecipe,
    deleteRecipe,
    toggleSelectRecipe,
    importRecipe,
    updateRecipeConclusion,
    updateRecipeRatingDetail,
    addExperimentRecord,
    archiveExperimentRecord,
    deleteExperimentRecord,
    getStatusText,
    getRecipeById,
    loadRecipeVersion,
    toggleSelectVersion,
    addTagToRecipe,
    removeTagFromRecipe,
    addRatingHistory,
    addResearchNote,
    updateResearchNote,
    deleteResearchNote,
    addExperimentTemplate,
    exportAnalysisReport,
    downloadAnalysisReport,
    batchUpdateRecipes,
    batchDeleteRecipes,
    batchAddTag,
    applyRecommendation
  }
})
