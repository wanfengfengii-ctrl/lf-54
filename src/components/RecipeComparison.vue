<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useRecipeStore } from '../stores/recipe'
import { FIBER_INFO_LIST, PERFORMANCE_KEYS, RATING_DIMENSIONS } from '../types'
import type { ComparisonMode } from '../types'

const store = useRecipeStore()
const radarChartRef = ref<HTMLDivElement | null>(null)
const heatmapChartRef = ref<HTMLDivElement | null>(null)
const trendChartRef = ref<HTMLDivElement | null>(null)
let radarChartInstance: echarts.ECharts | null = null
let heatmapChartInstance: echarts.ECharts | null = null
let trendChartInstance: echarts.ECharts | null = null
const activeView = ref<'table' | 'radar' | 'heatmap' | 'trend'>('table')
const comparisonMode = ref<ComparisonMode>('recipes')

const allRecipesForComparison = computed(() => {
  const list: Array<{ id: string; name: string; isCurrent: boolean; fiberRatio: any; performance: any; status?: string; ratingDetail?: any; createdAt?: number }> = [
    {
      id: '__current__',
      name: store.loadedRecipe ? store.loadedRecipe.name : '当前配方',
      isCurrent: true,
      fiberRatio: store.currentRatio,
      performance: store.currentPerformance,
      ratingDetail: store.currentRatingDetail,
      createdAt: Date.now()
    }
  ]

  if (comparisonMode.value === 'recipes') {
    store.selectedRecipes.forEach(recipe => {
      list.push({
        id: recipe.id,
        name: recipe.name,
        isCurrent: false,
        fiberRatio: recipe.fiberRatio,
        performance: recipe.performance,
        status: store.getStatusText(recipe.status),
        ratingDetail: recipe.ratingDetail,
        createdAt: recipe.createdAt
      })
    })
  } else if (comparisonMode.value === 'versions' && store.loadedRecipe) {
    store.loadedRecipe.versions.forEach(version => {
      list.push({
        id: version.id,
        name: `v${version.version} - ${version.changeNote}`,
        isCurrent: false,
        fiberRatio: version.fiberRatio,
        performance: version.performance,
        status: '历史版本',
        ratingDetail: { overall: 0, strength: 0, appearance: 0, feel: 0, durability: 0, cost: 0 },
        createdAt: version.changedAt
      })
    })
  }

  return list
})

const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2']

const performanceDiff = computed(() => {
  if (allRecipesForComparison.value.length < 2) return []
  const base = allRecipesForComparison.value[0]
  return allRecipesForComparison.value.slice(1).map(recipe => {
    const diffs: Array<{ name: string; diff: number; direction: 'up' | 'down' | 'same' }> = []
    for (const perf of PERFORMANCE_KEYS) {
      const diff = recipe.performance[perf.key] - base.performance[perf.key]
      diffs.push({
        name: perf.name,
        diff: Math.round(diff * 10) / 10,
        direction: diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'same'
      })
    }
    return { name: recipe.name, diffs }
  })
})

function initRadarChart() {
  if (!radarChartRef.value) return
  radarChartInstance = echarts.init(radarChartRef.value)
  updateRadarChart()
}

function updateRadarChart() {
  if (!radarChartInstance) return

  const indicator = PERFORMANCE_KEYS.map(key => ({
    name: key.name,
    max: 100
  }))

  const seriesData = allRecipesForComparison.value.map((recipe, index) => ({
    value: PERFORMANCE_KEYS.map(key => recipe.performance[key.key]),
    name: recipe.name,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: { width: 2, color: colors[index] },
    areaStyle: { opacity: 0.12, color: colors[index] },
    itemStyle: { color: colors[index] }
  }))

  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      data: allRecipesForComparison.value.map(r => r.name),
      textStyle: { fontSize: 12, color: '#666' }
    },
    radar: {
      indicator,
      shape: 'polygon',
      splitNumber: 5,
      axisName: { color: '#333', fontSize: 12 },
      splitLine: { lineStyle: { color: '#e8e8e8' } },
      splitArea: {
        show: true,
        areaStyle: { color: ['#fafafa', '#f5f5f5'] }
      },
      axisLine: { lineStyle: { color: '#d9d9d9' } }
    },
    series: [
      {
        name: '性能对比',
        type: 'radar',
        data: seriesData
      }
    ]
  }

  radarChartInstance.setOption(option, true)
}

function initHeatmapChart() {
  if (!heatmapChartRef.value) return
  heatmapChartInstance = echarts.init(heatmapChartRef.value)
  updateHeatmapChart()
}

function updateHeatmapChart() {
  if (!heatmapChartInstance || allRecipesForComparison.value.length < 2) return

  const recipes = allRecipesForComparison.value
  const xData = recipes.map(r => r.name)
  const yData = PERFORMANCE_KEYS.map(k => k.name)

  const data: any[] = []
  recipes.forEach((recipe, xIdx) => {
    PERFORMANCE_KEYS.forEach((perf, yIdx) => {
      data.push([xIdx, yIdx, recipe.performance[perf.key]])
    })
  })

  const option: echarts.EChartsOption = {
    tooltip: {
      position: 'top',
      formatter: function(params: any) {
        const [x, y, value] = params.value
        return `${xData[x]}<br/>${yData[y]}: ${value.toFixed(1)}`
      }
    },
    grid: {
      top: '8%',
      left: '18%',
      right: '8%',
      bottom: '15%'
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        fontSize: 11,
        color: '#666',
        rotate: 30
      },
      axisLine: { lineStyle: { color: '#e8e8e8' } }
    },
    yAxis: {
      type: 'category',
      data: yData,
      axisLabel: {
        fontSize: 11,
        color: '#666'
      },
      axisLine: { lineStyle: { color: '#e8e8e8' } }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      text: ['高', '低'],
      textStyle: { fontSize: 11, color: '#666' },
      inRange: {
        color: ['#f0f5ff', '#91d5ff', '#1890ff', '#096dd9', '#003a8c']
      }
    },
    series: [
      {
        name: '性能热力',
        type: 'heatmap',
        data: data,
        label: {
          show: true,
          fontSize: 10,
          formatter: function(params: any) {
            return params.value[2].toFixed(0)
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }
    ]
  }

  heatmapChartInstance.setOption(option, true)
}

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChartInstance = echarts.init(trendChartRef.value)
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChartInstance || allRecipesForComparison.value.length < 2) return

  const recipes = [...allRecipesForComparison.value].sort((a, b) =>
    (a.createdAt || 0) - (b.createdAt || 0)
  )
  const xData = recipes.map(r => r.name)

  const series = PERFORMANCE_KEYS.map(perf => ({
    name: perf.name,
    type: 'line' as const,
    smooth: true,
    symbol: 'circle',
    symbolSize: 7,
    data: recipes.map(r => r.performance[perf.key]),
    lineStyle: { width: 2 },
    emphasis: { focus: 'series' as const }
  }))

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      top: '2%',
      data: PERFORMANCE_KEYS.map(k => k.name),
      textStyle: { fontSize: 11, color: '#666' }
    },
    grid: {
      top: '15%',
      left: '5%',
      right: '5%',
      bottom: '12%'
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLabel: {
        fontSize: 11,
        color: '#666',
        rotate: 30
      },
      axisLine: { lineStyle: { color: '#e8e8e8' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: {
        fontSize: 11,
        color: '#666'
      },
      splitLine: {
        lineStyle: { color: '#f0f0f0' }
      }
    },
    series: series
  }

  trendChartInstance.setOption(option, true)
}

function handleResize() {
  radarChartInstance?.resize()
  heatmapChartInstance?.resize()
  trendChartInstance?.resize()
}

watch(
  () => [allRecipesForComparison.value, activeView.value, comparisonMode.value],
  () => {
    setTimeout(() => {
      if (activeView.value === 'radar') {
        if (!radarChartInstance) {
          initRadarChart()
        } else {
          updateRadarChart()
        }
      } else if (activeView.value === 'heatmap') {
        if (!heatmapChartInstance) {
          initHeatmapChart()
        } else {
          updateHeatmapChart()
        }
      } else if (activeView.value === 'trend') {
        if (!trendChartInstance) {
          initTrendChart()
        } else {
          updateTrendChart()
        }
      }
    }, 50)
  },
  { deep: true }
)

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  radarChartInstance?.dispose()
  heatmapChartInstance?.dispose()
  trendChartInstance?.dispose()
})
</script>

<template>
  <div class="comparison-panel">
    <div class="section-header">
      <h3 class="section-title">配方对照分析</h3>
      <div class="header-right">
        <div class="mode-switch">
          <button
            class="view-btn"
            :class="{ active: comparisonMode === 'recipes' }"
            @click="comparisonMode = 'recipes'"
          >跨配方对比</button>
          <button
            class="view-btn"
            :class="{ active: comparisonMode === 'versions' }"
            @click="comparisonMode = 'versions'"
            :disabled="!store.loadedRecipe || store.loadedRecipe.versions.length < 2"
          >版本内对比</button>
        </div>
        <div class="view-switch">
          <button
            class="view-btn"
            :class="{ active: activeView === 'table' }"
            @click="activeView = 'table'"
          >表格</button>
          <button
            class="view-btn"
            :class="{ active: activeView === 'radar' }"
            @click="activeView = 'radar'"
          >雷达</button>
          <button
            class="view-btn"
            :class="{ active: activeView === 'heatmap' }"
            @click="activeView = 'heatmap'"
          >热力图</button>
          <button
            class="view-btn"
            :class="{ active: activeView === 'trend' }"
            @click="activeView = 'trend'"
          >趋势</button>
        </div>
        <span class="section-tip">选择最多5个配方/版本进行对比</span>
      </div>
    </div>

    <div v-if="allRecipesForComparison.length <= 1" class="empty-comparison">
      <svg class="empty-icon" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="8" width="48" height="48" rx="4" stroke="#d9d9d9" stroke-width="2" stroke-dasharray="4 4"/>
        <path d="M24 28L32 36L40 24" stroke="#d9d9d9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="empty-text">请在右侧选择配方进行对比</p>
      <p class="empty-sub">当前仅展示「当前配方」，选择更多配方查看详细对比</p>
    </div>

    <template v-else>
      <div v-if="activeView === 'table'" class="comparison-content">
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

        <div v-if="performanceDiff.length > 0" class="comparison-section">
          <h4 class="comparison-subtitle">性能差异（相对于当前配方）</h4>
          <div class="diff-grid">
            <div v-for="diffItem in performanceDiff" :key="diffItem.name" class="diff-card">
              <div class="diff-card-title">{{ diffItem.name }}</div>
              <div class="diff-items">
                <div
                  v-for="d in diffItem.diffs"
                  :key="d.name"
                  class="diff-item"
                  :class="'diff-' + d.direction"
                >
                  <span class="diff-name">{{ d.name }}</span>
                  <span class="diff-value">
                    <span v-if="d.direction === 'up'" class="diff-arrow">▲</span>
                    <span v-if="d.direction === 'down'" class="diff-arrow">▼</span>
                    <span v-if="d.direction === 'same'" class="diff-arrow">━</span>
                    {{ d.diff > 0 ? '+' : '' }}{{ d.diff }}
                  </span>
                </div>
              </div>
            </div>
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

      <div v-if="activeView === 'radar'" class="chart-view">
        <div ref="radarChartRef" class="chart-container"></div>
      </div>

      <div v-if="activeView === 'heatmap'" class="chart-view">
        <div ref="heatmapChartRef" class="chart-container"></div>
      </div>

      <div v-if="activeView === 'trend'" class="chart-view">
        <div ref="trendChartRef" class="chart-container"></div>
      </div>
    </template>
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-switch,
.mode-switch {
  display: flex;
  gap: 2px;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 2px;
}

.view-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  color: #666;
  transition: all 0.2s;
  font-family: inherit;
}

.view-btn:hover:not(:disabled) {
  color: #333;
}

.view-btn.active {
  background: #fff;
  color: #333;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.view-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mode-switch .view-btn {
  padding: 4px 10px;
  font-size: 11px;
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

.diff-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.diff-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
}

.diff-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.diff-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diff-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.diff-name {
  color: #666;
}

.diff-value {
  font-weight: 600;
}

.diff-up .diff-value {
  color: #52c41a;
}

.diff-up .diff-arrow {
  color: #52c41a;
}

.diff-down .diff-value {
  color: #ff4d4f;
}

.diff-down .diff-arrow {
  color: #ff4d4f;
}

.diff-same .diff-value {
  color: #8c8c8c;
}

.diff-same .diff-arrow {
  color: #8c8c8c;
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

.chart-view {
  min-height: 350px;
}

.chart-container {
  width: 100%;
  height: 420px;
}
</style>
