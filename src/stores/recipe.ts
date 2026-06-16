import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FiberRatio, PaperPerformance, Recipe, RecipeStatus } from '../types'
import { FIBER_INFO_LIST } from '../types'
import { calculatePerformance, validateRatio, generateId } from '../utils/performance'

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
      updatedAt: Date.now() - 86400000 * 3
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
      updatedAt: Date.now() - 86400000 * 1
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
      updatedAt: Date.now() - 86400000
    }
  ])

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
      updatedAt: Date.now()
    }

    recipes.value.unshift(newRecipe)
    return { success: true, message: '配方保存成功', recipe: newRecipe }
  }

  function updateCurrentRecipe(recipeId: string) {
    const recipe = recipes.value.find(r => r.id === recipeId)
    if (!recipe) return { success: false, message: '配方不存在' }
    if (recipe.status === 'finalized' || recipe.status === 'verified') {
      return { success: false, message: '已定版或已验证的配方不能编辑比例' }
    }

    if (!isRatioValid.value) {
      return { success: false, message: ratioErrorMessage.value }
    }

    recipe.fiberRatio = { ...currentRatio.value }
    recipe.performance = { ...currentPerformance.value }
    recipe.name = currentName.value
    recipe.conclusion = currentConclusion.value
    recipe.rating = currentRating.value
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

    return true
  }

  function resetToNewRecipe() {
    loadedRecipeId.value = null
    currentRatio.value = { chuPi: 40, hemp: 30, bamboo: 20, straw: 10 }
    currentName.value = '新配方'
    currentConclusion.value = ''
    currentRating.value = 0
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

  function getStatusText(status: RecipeStatus): string {
    const map: Record<RecipeStatus, string> = {
      draft: '草稿',
      finalized: '已定版',
      verified: '已验证'
    }
    return map[status]
  }

  return {
    currentRatio,
    currentName,
    currentConclusion,
    currentRating,
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
    getStatusText
  }
})
