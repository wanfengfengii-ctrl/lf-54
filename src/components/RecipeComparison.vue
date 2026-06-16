<script setup lang="ts">
import { computed } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import { FIBER_INFO_LIST, PERFORMANCE_KEYS } from '../types'

const store = useRecipeStore()

const allRecipesForComparison = computed(() => {
  const list: Array<{ id: string; name: string; isCurrent: boolean; fiberRatio: any; performance: any; status?: string }> = [
    {
      id: '__current__',
      name: store.loadedRecipe ? store.loadedRecipe.name : '当前配方',
      isCurrent: true,
      fiberRatio: store.currentRatio,
      performance: store.currentPerformance
    }
  ]

  store.selectedRecipes.forEach(recipe => {
    list.push({
      id: recipe.id,
      name: recipe.name,
      isCurrent: false,
      fiberRatio: recipe.fiberRatio,
      performance: recipe.performance,
      status: store.getStatusText(recipe.status)
    })
  })

  return list
})

const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d']
</script>

<template>
  <div class="comparison-panel">
    <div class="section-header">
      <h3 class="section-title">历史配方对比</h3>
      <span class="section-tip">在右侧选择最多3个配方进行对比</span>
    </div>

    <div v-if="allRecipesForComparison.length <= 1" class="empty-comparison">
      <svg class="empty-icon" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="8" width="48" height="48" rx="4" stroke="#d9d9d9" stroke-width="2" stroke-dasharray="4 4"/>
        <path d="M24 28L32 36L40 24" stroke="#d9d9d9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="empty-text">请在右侧选择配方进行对比</p>
      <p class="empty-sub">当前仅展示「当前配方」，选择更多配方查看详细对比</p>
    </div>

    <div v-else class="comparison-content">
      <div class="comparison-section">
        <h4 class="comparison-subtitle">纤维配比对比</h4>
        <div class="comparison-table-wrapper">
          <table class="comparison-table">
            <thead>
              <tr>
                <th class="first-col">原料</th>
                <th v-for="(recipe, idx) in allRecipesForComparison" :key="recipe.id" class="recipe-col">
                  <span class="col-color-dot" :style="{ backgroundColor: colors[idx] }"></span>
                  <span class="col-name">{{ recipe.name }}</span>
                  <span v-if="recipe.status" class="col-status">{{ recipe.status }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="fiber in FIBER_INFO_LIST" :key="fiber.key">
                <td class="first-col">
                  <span class="fiber-color-mark" :style="{ backgroundColor: fiber.color }"></span>
                  {{ fiber.name }}
                </td>
                <td v-for="(recipe, idx) in allRecipesForComparison" :key="recipe.id" class="value-cell">
                  <div class="cell-bar-wrapper">
                    <div
                      class="cell-bar"
                      :style="{
                        width: recipe.fiberRatio[fiber.key] + '%',
                        backgroundColor: colors[idx]
                      }"
                    ></div>
                  </div>
                  <span class="cell-value">{{ recipe.fiberRatio[fiber.key].toFixed(1) }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="comparison-section">
        <h4 class="comparison-subtitle">性能指标对比</h4>
        <div class="comparison-table-wrapper">
          <table class="comparison-table">
            <thead>
              <tr>
                <th class="first-col">指标</th>
                <th v-for="(recipe, idx) in allRecipesForComparison" :key="recipe.id" class="recipe-col">
                  <span class="col-color-dot" :style="{ backgroundColor: colors[idx] }"></span>
                  <span class="col-name">{{ recipe.name }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="perf in PERFORMANCE_KEYS" :key="perf.key">
                <td class="first-col">{{ perf.name }}</td>
                <td v-for="(recipe, idx) in allRecipesForComparison" :key="recipe.id" class="value-cell">
                  <div class="cell-bar-wrapper">
                    <div
                      class="cell-bar perf-bar"
                      :style="{
                        width: recipe.performance[perf.key] + '%',
                        backgroundColor: colors[idx]
                      }"
                    ></div>
                  </div>
                  <span class="cell-value">{{ recipe.performance[perf.key].toFixed(1) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="stacked-ratio-section">
        <h4 class="comparison-subtitle">纤维堆叠对比</h4>
        <div class="stacked-bars">
          <div v-for="recipe in allRecipesForComparison" :key="recipe.id" class="stacked-item">
            <span class="stacked-label">{{ recipe.name }}</span>
            <div class="stacked-bar">
              <div
                v-for="fiber in FIBER_INFO_LIST"
                :key="fiber.key"
                class="stacked-segment"
                :style="{
                  width: recipe.fiberRatio[fiber.key] + '%',
                  backgroundColor: fiber.color
                }"
                :title="`${fiber.name}: ${recipe.fiberRatio[fiber.key].toFixed(1)}%`"
              ></div>
            </div>
          </div>
        </div>
        <div class="stacked-legend">
          <div v-for="fiber in FIBER_INFO_LIST" :key="fiber.key" class="legend-item">
            <span class="legend-color" :style="{ backgroundColor: fiber.color }"></span>
            <span class="legend-text">{{ fiber.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comparison-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.section-tip {
  font-size: 12px;
  color: #999;
}

.empty-comparison {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
}

.empty-text {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #666;
}

.empty-sub {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.comparison-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.comparison-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comparison-subtitle {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.comparison-table-wrapper {
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.comparison-table th,
.comparison-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #f5f5f5;
}

.comparison-table th {
  background: #fafafa;
  font-weight: 600;
  color: #666;
  white-space: nowrap;
}

.first-col {
  width: 100px;
  min-width: 100px;
  font-weight: 500;
  color: #333;
}

.recipe-col {
  min-width: 140px;
}

.col-color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}

.col-name {
  font-size: 13px;
  color: #333;
  vertical-align: middle;
}

.col-status {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 11px;
  color: #8c8c8c;
  background: #f0f0f0;
  border-radius: 3px;
  vertical-align: middle;
}

.fiber-color-mark {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  margin-right: 6px;
  vertical-align: middle;
}

.value-cell {
  white-space: nowrap;
}

.cell-bar-wrapper {
  display: inline-block;
  width: 100px;
  height: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 8px;
  vertical-align: middle;
}

.cell-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
  opacity: 0.75;
}

.perf-bar {
  opacity: 0.6;
}

.cell-value {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  vertical-align: middle;
}

.stacked-ratio-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stacked-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stacked-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stacked-label {
  width: 100px;
  min-width: 100px;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stacked-bar {
  flex: 1;
  height: 24px;
  display: flex;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
}

.stacked-segment {
  height: 100%;
  transition: width 0.3s ease;
  cursor: help;
}

.stacked-legend {
  display: flex;
  gap: 20px;
  padding-left: 112px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
</style>
