<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useRecipeStore } from '../stores/recipe'
import { RATING_DIMENSIONS } from '../types'
import type { RatingDetail } from '../types'

const store = useRecipeStore()

const selectedRecipeId = ref<string | null>(null)
const editingRating = ref<RatingDetail | null>(null)
const ratingNote = ref('')
const linkExperimentId = ref<string | null>(null)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const showHistory = ref(false)
const showTrend = ref(false)
const trendChartRef = ref<HTMLDivElement | null>(null)
let trendChartInstance: echarts.ECharts | null = null

const targetRecipe = computed(() => {
  if (selectedRecipeId.value) {
    return store.getRecipeById(selectedRecipeId.value)
  }
  return store.loadedRecipe
})

const displayRating = computed(() => {
  if (editingRating.value) return editingRating.value
  if (targetRecipe.value) return targetRecipe.value.ratingDetail
  return store.currentRatingDetail
})

const ratingHistory = computed(() => {
  if (!targetRecipe.value) return []
  return store.getRatingHistoryForRecipe(targetRecipe.value.id)
})

const linkedExperiments = computed(() => {
  if (!targetRecipe.value) return []
  return store.experimentRecords.filter(r => r.recipeId === targetRecipe.value?.id)
})

const ratingStats = computed(() => {
  const allRatings = store.recipes
    .filter(r => r.ratingDetail.overall > 0)
    .map(r => r.ratingDetail)

  if (allRatings.length === 0) return null

  const avgByDim: Record<string, number> = {}
  for (const dim of RATING_DIMENSIONS) {
    if (dim.key === 'overall') continue
    const values = allRatings.map(r => r[dim.key]).filter(v => v > 0)
    avgByDim[dim.key] = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0
  }

  return {
    totalRated: allRatings.length,
    avgOverall: allRatings.reduce((a, b) => a + b.overall, 0) / allRatings.length,
    avgByDim
  }
})

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChartInstance = echarts.init(trendChartRef.value)
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChartInstance || !targetRecipe.value) return

  const history = store.getRatingHistoryForRecipe(targetRecipe.value.id)
  if (history.length < 2) return

  const xData = history.map(h => {
    const d = new Date(h.createdAt)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })

  const series = RATING_DIMENSIONS.filter(d => d.key !== 'overall').map(dim => ({
    name: dim.name,
    type: 'line' as const,
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    data: history.map(h => h.ratingDetail[dim.key] || null),
    lineStyle: { width: 2 },
    emphasis: { focus: 'series' as const }
  }))

  series.push({
    name: '综合',
    type: 'line' as const,
    smooth: true,
    symbol: 'diamond',
    symbolSize: 8,
    data: history.map(h => h.ratingDetail.overall || null),
    lineStyle: { width: 3, type: 'dashed' as const },
    emphasis: { focus: 'series' as const }
  })

  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: {
      top: '2%',
      data: [...RATING_DIMENSIONS.filter(d => d.key !== 'overall').map(d => d.name), '综合'],
      textStyle: { fontSize: 11, color: '#666' }
    },
    grid: {
      top: '18%',
      left: '5%',
      right: '5%',
      bottom: '10%'
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { fontSize: 10, color: '#666' },
      axisLine: { lineStyle: { color: '#e8e8e8' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 5,
      axisLabel: { fontSize: 10, color: '#666' },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    series: series
  }

  trendChartInstance.setOption(option, true)
}

watch(showTrend, (newVal) => {
  if (newVal && targetRecipe.value) {
    setTimeout(() => {
      if (!trendChartInstance) {
        initTrendChart()
      } else {
        updateTrendChart()
      }
    }, 50)
  }
})

function handleResize() {
  trendChartInstance?.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose()
})

function startEditing() {
  const source = targetRecipe.value
  if (source) {
    editingRating.value = { ...source.ratingDetail }
  } else {
    editingRating.value = { ...store.currentRatingDetail }
  }
  ratingNote.value = ''
  linkExperimentId.value = null
}

function cancelEditing() {
  editingRating.value = null
  ratingNote.value = ''
  linkExperimentId.value = null
}

function setDimensionRating(dimKey: keyof RatingDetail, value: number) {
  if (!editingRating.value) return
  if (dimKey === 'overall') {
    editingRating.value.overall = editingRating.value.overall === value ? 0 : value
  } else {
    editingRating.value[dimKey] = editingRating.value[dimKey] === value ? 0 : value
  }
}

function saveRating() {
  if (!editingRating.value) return

  if (targetRecipe.value) {
    store.addRatingHistory(targetRecipe.value.id, {
      ratingDetail: { ...editingRating.value },
      note: ratingNote.value || undefined,
      experimentRecordId: linkExperimentId.value || undefined
    })
    const result = store.updateRecipeRatingDetail(targetRecipe.value.id, editingRating.value)
    showMessage(result.message, result.success ? 'success' : 'error')
  } else {
    store.currentRatingDetail = { ...editingRating.value }
    store.currentRating = editingRating.value.overall
    showMessage('当前配方评级已更新')
  }
  editingRating.value = null
  ratingNote.value = ''
  linkExperimentId.value = null
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getExperimentSummary(experimentId: string | undefined): string {
  if (!experimentId) return ''
  const exp = store.experimentRecords.find(r => r.id === experimentId)
  return exp ? exp.result || exp.conditions || '已关联实验' : ''
}

function showMessage(msg: string, type: 'success' | 'error' = 'success') {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

function getRatingColor(value: number): string {
  if (value >= 4) return '#52c41a'
  if (value >= 3) return '#faad14'
  if (value >= 1) return '#fa8c16'
  return '#d9d9d9'
}
</script>

<template>
  <div class="rating-panel">
    <div class="panel-header">
      <h3 class="panel-title">结果评级管理</h3>
      <div class="panel-actions">
        <button
          v-if="targetRecipe"
          class="btn btn-toggle btn-small"
          :class="{ active: showHistory }"
          @click="showHistory = !showHistory"
          :disabled="ratingHistory.length === 0"
        >
          📜 历史记录
        </button>
        <button
          v-if="targetRecipe"
          class="btn btn-toggle btn-small"
          :class="{ active: showTrend }"
          @click="showTrend = !showTrend"
          :disabled="ratingHistory.length < 2"
        >
          📈 评级趋势
        </button>
      </div>
    </div>

    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>

    <div class="recipe-selector">
      <label class="selector-label">评级对象</label>
      <select
        class="form-select"
        :value="selectedRecipeId || ''"
        @change="selectedRecipeId = ($event.target as HTMLSelectElement).value || null; editingRating = null; showHistory = false; showTrend = false"
      >
        <option value="">当前编辑配方</option>
        <option v-for="recipe in store.recipes" :key="recipe.id" :value="recipe.id">
          {{ recipe.name }}
        </option>
      </select>
    </div>

    <div v-if="showTrend && ratingHistory.length >= 2" class="trend-section">
      <div ref="trendChartRef" class="trend-chart"></div>
    </div>

    <div v-if="showHistory && ratingHistory.length > 0" class="history-section">
      <h4 class="history-title">评级历史记录</h4>
      <div class="history-list">
        <div v-for="entry in ratingHistory.slice().reverse()" :key="entry.id" class="history-item">
          <div class="history-header">
            <span class="history-date">{{ formatDate(entry.createdAt) }}</span>
            <span class="history-rating" :style="{ color: getRatingColor(entry.ratingDetail.overall) }">
              {{ renderStars(entry.ratingDetail.overall) }} {{ entry.ratingDetail.overall }}
            </span>
          </div>
          <div class="history-details">
            <span v-for="dim in RATING_DIMENSIONS.filter(d => d.key !== 'overall')" :key="dim.key" class="history-dim">
              <span class="dim-label">{{ dim.name }}:</span>
              <span :style="{ color: getRatingColor(entry.ratingDetail[dim.key]) }">{{ entry.ratingDetail[dim.key] || '-' }}</span>
            </span>
          </div>
          <div v-if="entry.note" class="history-note">📝 {{ entry.note }}</div>
          <div v-if="entry.experimentRecordId" class="history-exp">
            🔬 关联实验: {{ getExperimentSummary(entry.experimentRecordId) }}
          </div>
        </div>
      </div>
    </div>

    <div class="rating-display">
      <div class="overall-section">
        <div class="overall-score" :style="{ borderColor: getRatingColor(displayRating.overall) }">
          <span class="score-number" :style="{ color: getRatingColor(displayRating.overall) }">
            {{ displayRating.overall || '-' }}
          </span>
          <span class="score-label">综合评级</span>
        </div>
        <div class="overall-stars">
          <span
            v-for="i in 5"
            :key="i"
            class="big-star"
            :class="{ active: i <= displayRating.overall }"
          >★</span>
        </div>
      </div>

      <div class="dimensions-grid">
        <div
          v-for="dim in RATING_DIMENSIONS.filter(d => d.key !== 'overall')"
          :key="dim.key"
          class="dimension-item"
        >
          <div class="dim-header">
            <span class="dim-name">{{ dim.name }}</span>
            <span class="dim-value" :style="{ color: getRatingColor(displayRating[dim.key]) }">
              {{ displayRating[dim.key] || '-' }}
            </span>
          </div>
          <div class="dim-bar">
            <div
              class="dim-fill"
              :style="{
                width: (displayRating[dim.key] / 5 * 100) + '%',
                backgroundColor: getRatingColor(displayRating[dim.key])
              }"
            ></div>
          </div>
          <span class="dim-desc">{{ dim.description }}</span>
        </div>
      </div>
    </div>

    <div v-if="editingRating" class="editing-section">
      <h4 class="edit-title">编辑评级</h4>
      <div class="edit-dimensions">
        <div
          v-for="dim in RATING_DIMENSIONS"
          :key="dim.key"
          class="edit-dim-item"
        >
          <span class="edit-dim-name">{{ dim.name }}</span>
          <div class="edit-stars">
            <span
              v-for="i in 5"
              :key="i"
              class="edit-star"
              :class="{ active: i <= editingRating[dim.key] }"
              @click="setDimensionRating(dim.key, i)"
            >★</span>
          </div>
        </div>
      </div>

      <div v-if="targetRecipe" class="edit-extra">
        <div class="form-group">
          <label class="form-label">评级说明</label>
          <textarea
            v-model="ratingNote"
            class="form-textarea"
            rows="2"
            placeholder="描述评级依据、改进方向等..."
          ></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">关联实验记录</label>
          <select v-model="linkExperimentId" class="form-select">
            <option :value="null">不关联实验</option>
            <option v-for="exp in linkedExperiments" :key="exp.id" :value="exp.id">
              {{ formatDate(exp.date) }} - {{ exp.result || '无结果' }}
            </option>
          </select>
        </div>
      </div>

      <div class="edit-actions">
        <button class="btn btn-default" @click="cancelEditing">取消</button>
        <button class="btn btn-primary" @click="saveRating">保存评级</button>
      </div>
    </div>

    <div v-else class="edit-trigger">
      <button class="btn btn-primary btn-block" @click="startEditing">编辑评级</button>
    </div>

    <div v-if="ratingStats" class="stats-section">
      <h4 class="stats-title">评级统计</h4>
      <div class="stats-overview">
        <div class="stat-item">
          <span class="stat-label">已评级配方</span>
          <span class="stat-value">{{ ratingStats.totalRated }} 个</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">平均综合评级</span>
          <span class="stat-value" :style="{ color: getRatingColor(ratingStats.avgOverall) }">
            {{ ratingStats.avgOverall.toFixed(1) }} 星
          </span>
        </div>
      </div>
      <div class="stats-dims">
        <div
          v-for="dim in RATING_DIMENSIONS.filter(d => d.key !== 'overall')"
          :key="dim.key"
          class="stats-dim-item"
        >
          <span class="stats-dim-name">{{ dim.name }}</span>
          <div class="stats-dim-bar">
            <div
              class="stats-dim-fill"
              :style="{
                width: (ratingStats.avgByDim[dim.key] / 5 * 100) + '%',
                backgroundColor: getRatingColor(ratingStats.avgByDim[dim.key])
              }"
            ></div>
          </div>
          <span class="stats-dim-value">{{ ratingStats.avgByDim[dim.key].toFixed(1) }}</span>
        </div>
      </div>

      <div class="rating-ranking">
        <h5 class="ranking-title">配方评级排行</h5>
        <div
          v-for="recipe in store.recipes.filter(r => r.ratingDetail.overall > 0).sort((a, b) => b.ratingDetail.overall - a.ratingDetail.overall)"
          :key="recipe.id"
          class="ranking-item"
        >
          <span class="ranking-stars">{{ renderStars(recipe.ratingDetail.overall) }}</span>
          <span class="ranking-name">{{ recipe.name }}</span>
          <span class="ranking-score" :style="{ color: getRatingColor(recipe.ratingDetail.overall) }">
            {{ recipe.ratingDetail.overall }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rating-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.message {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 12px;
}

.message.success {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.message.error {
  background: #fff1f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.recipe-selector {
  margin-bottom: 16px;
}

.selector-label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
  box-sizing: border-box;
}

.form-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.rating-display {
  margin-bottom: 16px;
}

.overall-section {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 10px;
  margin-bottom: 16px;
}

.overall-score {
  width: 70px;
  height: 70px;
  border: 3px solid #d9d9d9;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.3s;
}

.score-number {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  transition: color 0.3s;
}

.score-label {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
}

.overall-stars {
  display: flex;
  gap: 4px;
}

.big-star {
  font-size: 28px;
  color: #e8e8e8;
  transition: color 0.2s;
}

.big-star.active {
  color: #faad14;
}

.dimensions-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dimension-item {
  padding: 8px 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.dim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.dim-name {
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.dim-value {
  font-size: 14px;
  font-weight: 600;
}

.dim-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 2px;
}

.dim-fill {
  height: 100%;
  border-radius: 3px;
  transition: all 0.3s;
}

.dim-desc {
  font-size: 11px;
  color: #999;
}

.editing-section {
  border: 1px solid #1890ff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  background: #f0f7ff;
}

.edit-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.edit-dimensions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.edit-dim-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-dim-name {
  width: 50px;
  font-size: 13px;
  color: #555;
  font-weight: 500;
  flex-shrink: 0;
}

.edit-stars {
  display: flex;
  gap: 2px;
}

.edit-star {
  font-size: 20px;
  color: #d9d9d9;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-star:hover {
  transform: scale(1.15);
}

.edit-star.active {
  color: #faad14;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.edit-trigger {
  margin-bottom: 16px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-block {
  width: 100%;
}

.btn-primary {
  background: #1890ff;
  color: #fff;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-default {
  background: #fff;
  color: #666;
  border: 1px solid #d9d9d9;
}

.btn-default:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.stats-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.stats-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.stats-overview {
  display: flex;
  gap: 20px;
  margin-bottom: 14px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.stats-dims {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.stats-dim-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-dim-name {
  width: 50px;
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
}

.stats-dim-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.stats-dim-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.stats-dim-value {
  width: 28px;
  font-size: 12px;
  text-align: right;
  color: #333;
  font-weight: 500;
  flex-shrink: 0;
}

.ranking-title {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  transition: background 0.2s;
}

.ranking-item:hover {
  background: #f5f5f5;
}

.ranking-stars {
  color: #faad14;
  font-size: 12px;
  letter-spacing: 1px;
}

.ranking-name {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.ranking-score {
  font-size: 16px;
  font-weight: 700;
}

.panel-actions {
  display: flex;
  gap: 6px;
}

.btn-toggle {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
  font-family: inherit;
}

.btn-toggle:hover:not(:disabled) {
  background: #e6f7ff;
  color: #1890ff;
  border-color: #1890ff;
}

.btn-toggle.active {
  background: #e6f7ff;
  color: #1890ff;
  border-color: #1890ff;
}

.btn-toggle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.trend-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
}

.trend-chart {
  width: 100%;
  height: 260px;
}

.history-section {
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
}

.history-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
}

.history-item {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-date {
  font-size: 12px;
  color: #999;
}

.history-rating {
  font-size: 14px;
  font-weight: 600;
}

.history-details {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 6px;
}

.history-dim {
  font-size: 11px;
  color: #666;
}

.history-dim .dim-label {
  color: #999;
  margin-right: 2px;
}

.history-note {
  font-size: 12px;
  color: #555;
  padding: 6px 8px;
  background: #fffbe6;
  border-radius: 4px;
  margin-top: 4px;
  line-height: 1.5;
}

.history-exp {
  font-size: 12px;
  color: #1890ff;
  padding: 6px 8px;
  background: #e6f7ff;
  border-radius: 4px;
  margin-top: 4px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.edit-extra {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #91d5ff;
}

.form-group {
  margin-bottom: 12px;
}

.form-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 13px;
  transition: border-color 0.2s;
  box-sizing: border-box;
  resize: vertical;
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  box-sizing: border-box;
  font-family: inherit;
}

.form-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.btn-small {
  padding: 4px 10px;
  font-size: 12px;
}
</style>
