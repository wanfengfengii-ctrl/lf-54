<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useRecipeStore } from '../stores/recipe'
import type { ExperimentRecord } from '../types'

const store = useRecipeStore()

const showAddModal = ref(false)
const selectedRecipeId = ref('')
const selectedVersionId = ref('')
const selectedTemplateId = ref('')
const newRecord = ref({
  conditions: '',
  observations: '',
  result: '',
  rating: 0,
  date: Date.now(),
  tags: [] as string[]
})

const showDetailModal = ref(false)
const detailRecord = ref<ExperimentRecord | null>(null)

const filterStatus = ref<'all' | 'active' | 'archived'>('all')
const filterRecipeId = ref<string>('')
const filterTag = ref<string>('')
const showStats = ref(false)
const statsChartRef = ref<HTMLDivElement | null>(null)
let statsChartInstance: echarts.ECharts | null = null

const availableVersions = computed(() => {
  if (!selectedRecipeId.value) return []
  const recipe = store.getRecipeById(selectedRecipeId.value)
  if (!recipe) return []
  return recipe.versions.map(v => ({
    id: v.id,
    name: `v${v.version} - ${v.changeNote}`
  }))
})

const allRecords = computed(() => {
  let records = store.experimentRecords.slice().sort((a, b) => b.date - a.date)
  if (filterStatus.value === 'active') {
    records = records.filter(r => !r.archivedAt)
  } else if (filterStatus.value === 'archived') {
    records = records.filter(r => r.archivedAt)
  }
  if (filterRecipeId.value) {
    records = records.filter(r => r.recipeId === filterRecipeId.value)
  }
  if (filterTag.value) {
    records = records.filter(r => r.tags?.includes(filterTag.value))
  }
  return records
})

const allTags = computed(() => {
  const tagSet = new Set<string>()
  store.experimentRecords.forEach(r => r.tags?.forEach(t => tagSet.add(t)))
  return Array.from(tagSet)
})

const recipeOptions = computed(() => {
  return store.recipes.map(r => ({ id: r.id, name: r.name }))
})

const experimentStats = computed(() => {
  const total = store.experimentRecords.length
  const active = store.experimentRecords.filter(r => !r.archivedAt).length
  const archived = store.experimentRecords.filter(r => r.archivedAt).length
  const avgRating = total > 0
    ? store.experimentRecords.reduce((sum, r) => sum + r.rating, 0) / total
    : 0
  const ratingDist = [0, 0, 0, 0, 0]
  store.experimentRecords.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDist[r.rating - 1]++
    }
  })
  const monthlyStats: Array<{ month: string; count: number; avgRating: number }> = []
  const monthMap = new Map<string, { count: number; totalRating: number }>()
  store.experimentRecords.forEach(r => {
    const d = new Date(r.date)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const existing = monthMap.get(month) || { count: 0, totalRating: 0 }
    existing.count++
    existing.totalRating += r.rating
    monthMap.set(month, existing)
  })
  Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([month, data]) => {
    monthlyStats.push({
      month,
      count: data.count,
      avgRating: data.count > 0 ? data.totalRating / data.count : 0
    })
  })
  return { total, active, archived, avgRating, ratingDist, monthlyStats }
})

function openAddModal() {
  selectedRecipeId.value = store.recipes.length > 0 ? store.recipes[0].id : ''
  selectedVersionId.value = ''
  selectedTemplateId.value = ''
  newRecord.value = {
    conditions: '',
    observations: '',
    result: '',
    rating: 0,
    date: Date.now(),
    tags: []
  }
  showAddModal.value = true
}

function applyTemplate(templateId: string) {
  const template = store.experimentTemplates.find(t => t.id === templateId)
  if (template) {
    newRecord.value.conditions = template.defaultConditions
    newRecord.value.observations = template.defaultObservations
    newRecord.value.tags = [...template.defaultTags]
  }
}

watch(selectedTemplateId, (newVal) => {
  if (newVal) {
    applyTemplate(newVal)
  }
})

function setRecordRating(rating: number) {
  newRecord.value.rating = newRecord.value.rating === rating ? 0 : rating
}

function toggleTag(tag: string) {
  const idx = newRecord.value.tags.indexOf(tag)
  if (idx > -1) {
    newRecord.value.tags.splice(idx, 1)
  } else {
    newRecord.value.tags.push(tag)
  }
}

function submitRecord() {
  if (!selectedRecipeId.value) return
  const result = store.addExperimentRecord(selectedRecipeId.value, {
    date: newRecord.value.date,
    conditions: newRecord.value.conditions,
    observations: newRecord.value.observations,
    result: newRecord.value.result,
    rating: newRecord.value.rating,
    recipeVersionId: selectedVersionId.value || undefined,
    templateId: selectedTemplateId.value || undefined,
    tags: newRecord.value.tags.length > 0 ? [...newRecord.value.tags] : undefined
  })
  if (result.success) {
    showAddModal.value = false
  }
}

function initStatsChart() {
  if (!statsChartRef.value) return
  statsChartInstance = echarts.init(statsChartRef.value)
  updateStatsChart()
}

function updateStatsChart() {
  if (!statsChartInstance) return

  const stats = experimentStats.value
  const xData = stats.monthlyStats.map(s => s.month)
  const countData = stats.monthlyStats.map(s => s.count)
  const ratingData = stats.monthlyStats.map(s => s.avgRating.toFixed(1))

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      top: '2%',
      data: ['实验次数', '平均评级'],
      textStyle: { fontSize: 12, color: '#666' }
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
      axisLabel: { fontSize: 11, color: '#666', rotate: 30 },
      axisLine: { lineStyle: { color: '#e8e8e8' } }
    },
    yAxis: [
      {
        type: 'value',
        name: '次数',
        min: 0,
        axisLabel: { fontSize: 11, color: '#666' },
        splitLine: { lineStyle: { color: '#f0f0f0' } }
      },
      {
        type: 'value',
        name: '评级',
        min: 0,
        max: 5,
        axisLabel: { fontSize: 11, color: '#666' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '实验次数',
        type: 'bar',
        data: countData,
        itemStyle: { color: '#1890ff', borderRadius: [4, 4, 0, 0] },
        barWidth: '40%'
      },
      {
        name: '平均评级',
        type: 'line',
        yAxisIndex: 1,
        data: ratingData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { color: '#faad14', width: 2 },
        itemStyle: { color: '#faad14' }
      }
    ]
  }

  statsChartInstance.setOption(option, true)
}

watch(showStats, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      if (!statsChartInstance) {
        initStatsChart()
      } else {
        updateStatsChart()
      }
    }, 50)
  }
})

function handleResize() {
  statsChartInstance?.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  statsChartInstance?.dispose()
})

function getVersionName(recipeId: string, versionId: string | undefined): string {
  if (!versionId) return '未指定'
  const recipe = store.getRecipeById(recipeId)
  if (!recipe) return '未知'
  const version = recipe.versions.find(v => v.id === versionId)
  return version ? `v${version.version}` : '未知版本'
}

function archiveRecord(recordId: string) {
  store.archiveExperimentRecord(recordId)
}

function deleteRecord(recordId: string) {
  if (confirm('确定要删除此实验记录吗？')) {
    store.deleteExperimentRecord(recordId)
  }
}

function viewDetail(record: ExperimentRecord) {
  detailRecord.value = record
  showDetailModal.value = true
}

function getRecipeName(recipeId: string): string {
  const recipe = store.getRecipeById(recipeId)
  return recipe ? recipe.name : '未知配方'
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}
</script>

<template>
  <div class="archive-panel">
    <div class="panel-header">
      <h3 class="panel-title">实验记录归档</h3>
      <div class="header-buttons">
        <button class="btn btn-toggle btn-small" :class="{ active: showStats }" @click="showStats = !showStats">
          📊 统计分析
        </button>
        <button class="btn btn-primary btn-small" @click="openAddModal">+ 新增记录</button>
      </div>
    </div>

    <div v-if="showStats" class="stats-panel">
      <div class="stats-summary">
        <div class="stat-card">
          <span class="stat-label">总记录</span>
          <span class="stat-value">{{ experimentStats.total }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">进行中</span>
          <span class="stat-value stat-blue">{{ experimentStats.active }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">已归档</span>
          <span class="stat-value stat-gray">{{ experimentStats.archived }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">平均评级</span>
          <span class="stat-value stat-orange">{{ experimentStats.avgRating.toFixed(1) }} ★</span>
        </div>
      </div>
      <div class="rating-dist">
        <span class="dist-label">评级分布</span>
        <div class="dist-bars">
          <div v-for="i in 5" :key="i" class="dist-item">
            <span class="dist-star">{{ '★'.repeat(i) }}</span>
            <div class="dist-bar-wrap">
              <div
                class="dist-bar"
                :style="{ width: experimentStats.total > 0 ? (experimentStats.ratingDist[i-1] / experimentStats.total * 100) + '%' : '0%' }"
              ></div>
            </div>
            <span class="dist-count">{{ experimentStats.ratingDist[i-1] }}</span>
          </div>
        </div>
      </div>
      <div ref="statsChartRef" class="stats-chart"></div>
    </div>

    <div class="filter-bar">
      <button
        class="filter-btn"
        :class="{ active: filterStatus === 'all' }"
        @click="filterStatus = 'all'"
      >全部</button>
      <button
        class="filter-btn"
        :class="{ active: filterStatus === 'active' }"
        @click="filterStatus = 'active'"
      >进行中</button>
      <button
        class="filter-btn"
        :class="{ active: filterStatus === 'archived' }"
        @click="filterStatus = 'archived'"
      >已归档</button>
      <select v-model="filterRecipeId" class="filter-select">
        <option value="">全部配方</option>
        <option v-for="opt in recipeOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
      </select>
      <select v-model="filterTag" class="filter-select">
        <option value="">全部标签</option>
        <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
      </select>
      <span class="record-count">共 {{ allRecords.length }} 条</span>
    </div>

    <div v-if="allRecords.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="8" width="48" height="48" rx="4" stroke="#d9d9d9" stroke-width="2" stroke-dasharray="4 4"/>
        <path d="M22 32H42M32 22V42" stroke="#d9d9d9" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="empty-text">暂无实验记录</p>
      <p class="empty-sub">点击「新增记录」开始记录实验过程</p>
    </div>

    <div v-else class="records-list">
      <div
        v-for="record in allRecords"
        :key="record.id"
        class="record-card"
        :class="{ archived: !!record.archivedAt }"
      >
        <div class="record-header">
          <div class="record-title-row">
            <span class="record-recipe-name">{{ getRecipeName(record.recipeId) }}</span>
            <span v-if="record.recipeVersionId" class="version-badge">{{ getVersionName(record.recipeId, record.recipeVersionId) }}</span>
            <span v-if="record.archivedAt" class="archived-badge">已归档</span>
          </div>
          <span class="record-date">{{ formatDate(record.date) }}</span>
        </div>
        <div v-if="record.tags && record.tags.length > 0" class="record-tags">
          <span v-for="tag in record.tags" :key="tag" class="record-tag">{{ tag }}</span>
        </div>
        <div class="record-body">
          <div class="record-field">
            <span class="field-label">实验条件：</span>
            <span class="field-value">{{ record.conditions || '未填写' }}</span>
          </div>
          <div class="record-field">
            <span class="field-label">观察记录：</span>
            <span class="field-value">{{ record.observations || '未填写' }}</span>
          </div>
          <div class="record-field">
            <span class="field-label">实验结果：</span>
            <span class="field-value">{{ record.result || '未填写' }}</span>
          </div>
        </div>
        <div class="record-footer">
          <span v-if="record.rating > 0" class="record-stars">{{ renderStars(record.rating) }}</span>
          <div class="record-actions">
            <button class="btn-link" @click="viewDetail(record)">详情</button>
            <button v-if="!record.archivedAt" class="btn-link" @click="archiveRecord(record.id)">归档</button>
            <button class="btn-link btn-link-danger" @click="deleteRecord(record.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <h4 class="modal-title">新增实验记录</h4>
        <div class="form-group">
          <label class="form-label">关联配方</label>
          <select v-model="selectedRecipeId" class="form-select">
            <option v-for="opt in recipeOptions" :key="opt.id" :value="opt.id">
              {{ opt.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">配方版本</label>
          <select v-model="selectedVersionId" class="form-select" :disabled="availableVersions.length === 0">
            <option value="">不指定版本</option>
            <option v-for="v in availableVersions" :key="v.id" :value="v.id">
              {{ v.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">实验模板</label>
          <select v-model="selectedTemplateId" class="form-select">
            <option value="">不使用模板</option>
            <option v-for="t in store.experimentTemplates" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
          <span v-if="store.experimentTemplates.length === 0" class="form-tip">暂无模板，可在设置中创建</span>
        </div>
        <div class="form-group">
          <label class="form-label">实验条件</label>
          <textarea
            v-model="newRecord.conditions"
            class="form-textarea"
            rows="3"
            placeholder="描述实验环境、温度、湿度等条件..."
          ></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">观察记录</label>
          <textarea
            v-model="newRecord.observations"
            class="form-textarea"
            rows="3"
            placeholder="记录实验过程中的观察和发现..."
          ></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">实验结果</label>
          <textarea
            v-model="newRecord.result"
            class="form-textarea"
            rows="3"
            placeholder="总结实验结果..."
          ></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">标签</label>
          <div class="tag-selector">
            <button
              v-for="tag in allTags"
              :key="tag"
              class="tag-chip"
              :class="{ active: newRecord.tags.includes(tag) }"
              @click="toggleTag(tag)"
              type="button"
            >
              {{ tag }}
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">评级</label>
          <div class="rating-stars">
            <span
              v-for="i in 5"
              :key="i"
              class="star"
              :class="{ active: i <= newRecord.rating }"
              @click="setRecordRating(i)"
            >★</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-default" @click="showAddModal = false">取消</button>
          <button
            class="btn btn-primary"
            @click="submitRecord"
            :disabled="!selectedRecipeId || !newRecord.result"
          >保存记录</button>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal && detailRecord" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-content">
        <h4 class="modal-title">实验记录详情</h4>
        <div class="detail-section">
          <span class="detail-label">关联配方</span>
          <span class="detail-value">{{ getRecipeName(detailRecord.recipeId) }}</span>
        </div>
        <div v-if="detailRecord.recipeVersionId" class="detail-section">
          <span class="detail-label">配方版本</span>
          <span class="detail-value">{{ getVersionName(detailRecord.recipeId, detailRecord.recipeVersionId) }}</span>
        </div>
        <div v-if="detailRecord.tags && detailRecord.tags.length > 0" class="detail-section">
          <span class="detail-label">标签</span>
          <div class="detail-tags">
            <span v-for="tag in detailRecord.tags" :key="tag" class="detail-tag">{{ tag }}</span>
          </div>
        </div>
        <div class="detail-section">
          <span class="detail-label">记录时间</span>
          <span class="detail-value">{{ formatDate(detailRecord.date) }}</span>
        </div>
        <div class="detail-section">
          <span class="detail-label">实验条件</span>
          <p class="detail-text">{{ detailRecord.conditions || '未填写' }}</p>
        </div>
        <div class="detail-section">
          <span class="detail-label">观察记录</span>
          <p class="detail-text">{{ detailRecord.observations || '未填写' }}</p>
        </div>
        <div class="detail-section">
          <span class="detail-label">实验结果</span>
          <p class="detail-text">{{ detailRecord.result || '未填写' }}</p>
        </div>
        <div class="detail-section">
          <span class="detail-label">评级</span>
          <span class="detail-stars">{{ renderStars(detailRecord.rating) }}</span>
        </div>
        <div v-if="detailRecord.archivedAt" class="detail-section">
          <span class="detail-label">归档时间</span>
          <span class="detail-value">{{ formatDate(detailRecord.archivedAt) }}</span>
        </div>
        <div class="modal-actions">
          <button class="btn btn-default" @click="showDetailModal = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.archive-panel {
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

.btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-small {
  padding: 4px 10px;
  font-size: 12px;
}

.btn-primary {
  background: #1890ff;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #40a9ff;
}

.btn-primary:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
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

.filter-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 4px;
  background: #f5f5f5;
  border-radius: 8px;
}

.filter-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  background: transparent;
  color: #666;
  transition: all 0.2s;
  font-family: inherit;
}

.filter-btn.active {
  background: #fff;
  color: #333;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.record-count {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}

.empty-state {
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

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.record-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px;
  transition: all 0.2s;
}

.record-card.archived {
  background: #fafafa;
  opacity: 0.8;
}

.record-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.record-recipe-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.archived-badge {
  padding: 1px 6px;
  font-size: 11px;
  background: #f0f0f0;
  color: #8c8c8c;
  border-radius: 3px;
}

.record-date {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}

.record-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.record-field {
  font-size: 12px;
  line-height: 1.5;
}

.field-label {
  color: #999;
}

.field-value {
  color: #555;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.record-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-stars {
  color: #faad14;
  font-size: 13px;
  letter-spacing: 1px;
}

.record-actions {
  display: flex;
  gap: 10px;
}

.btn-link {
  background: none;
  border: none;
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}

.btn-link:hover {
  color: #40a9ff;
}

.btn-link-danger {
  color: #ff4d4f;
}

.btn-link-danger:hover {
  color: #ff7875;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.modal-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.form-group {
  margin-bottom: 14px;
}

.form-label {
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

.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
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

.rating-stars {
  display: flex;
  gap: 4px;
}

.star {
  font-size: 24px;
  color: #d9d9d9;
  cursor: pointer;
  transition: all 0.2s;
}

.star:hover {
  transform: scale(1.1);
}

.star.active {
  color: #faad14;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.detail-section {
  margin-bottom: 14px;
}

.detail-label {
  font-size: 12px;
  color: #999;
  display: block;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 14px;
  color: #333;
}

.detail-text {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin: 0;
}

.detail-stars {
  font-size: 16px;
  color: #faad14;
  letter-spacing: 2px;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-tag {
  padding: 2px 10px;
  background: #f0f5ff;
  color: #1890ff;
  border-radius: 10px;
  font-size: 12px;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.btn-toggle {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
}

.btn-toggle:hover,
.btn-toggle.active {
  background: #e6f7ff;
  color: #1890ff;
  border-color: #1890ff;
}

.stats-panel {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #f0f0f0;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.stat-blue {
  color: #1890ff;
}

.stat-gray {
  color: #8c8c8c;
}

.stat-orange {
  color: #faad14;
}

.rating-dist {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.dist-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 10px;
}

.dist-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dist-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dist-star {
  width: 60px;
  font-size: 12px;
  color: #faad14;
}

.dist-bar-wrap {
  flex: 1;
  height: 12px;
  background: #f5f5f5;
  border-radius: 6px;
  overflow: hidden;
}

.dist-bar {
  height: 100%;
  background: linear-gradient(90deg, #91d5ff, #1890ff);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.dist-count {
  width: 30px;
  text-align: right;
  font-size: 12px;
  color: #666;
}

.stats-chart {
  width: 100%;
  height: 260px;
}

.filter-select {
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  font-family: inherit;
}

.filter-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.record-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.version-badge {
  padding: 1px 6px;
  font-size: 11px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 3px;
}

.record-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.record-tag {
  padding: 1px 8px;
  background: #f0f0f0;
  color: #666;
  border-radius: 10px;
  font-size: 11px;
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  padding: 3px 12px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
  font-family: inherit;
}

.tag-chip:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.tag-chip.active {
  background: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

.form-tip {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #999;
}
</style>
