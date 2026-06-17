<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useRecipeStore } from '../stores/recipe'
import { FIBER_INFO_LIST, FIBER_DESCRIPTIONS, PERFORMANCE_KEYS } from '../types'

const store = useRecipeStore()
const activeTab = ref<'fiber' | 'trend' | 'version'>('fiber')
const trendChartRef = ref<HTMLDivElement | null>(null)
const versionCompareChartRef = ref<HTMLDivElement | null>(null)
let trendChartInstance: echarts.ECharts | null = null
let versionCompareChartInstance: echarts.ECharts | null = null
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const fiberDetails = computed(() => {
  return FIBER_INFO_LIST.map(fiber => {
    const desc = FIBER_DESCRIPTIONS.find(d => d.key === fiber.key)!
    return {
      ...fiber,
      ...desc,
      currentValue: store.currentRatio[fiber.key]
    }
  })
})

const timelineData = computed(() => {
  return store.recipeTimeline
})

const loadedRecipeVersions = computed(() => {
  if (!store.loadedRecipe) return []
  return store.loadedRecipe.versions.slice().sort((a, b) => a.version - b.version)
})

const selectableVersions = computed(() => {
  return loadedRecipeVersions.value.filter(v => v.version < loadedRecipeVersions.value.length)
})

function showMessage(msg: string, type: 'success' | 'error' = 'success') {
  message.value = msg
  messageType.value = type
  setTimeout(() => { message.value = '' }, 3000)
}

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChartInstance = echarts.init(trendChartRef.value)
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChartInstance) return

  const timeline = store.recipeTimeline
  if (timeline.length === 0) return

  const xData = timeline.map(item => item.name)
  const seriesList = PERFORMANCE_KEYS.map(perf => ({
    name: perf.name,
    type: 'line' as const,
    smooth: true,
    symbol: 'circle',
    symbolSize: 8,
    data: timeline.map(item => item.performance[perf.key]),
    lineStyle: { width: 2 },
    emphasis: { focus: 'series' as const }
  }))

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 12, color: '#666' }
    },
    grid: {
      top: 20,
      right: 20,
      bottom: 40,
      left: 50
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        fontSize: 11,
        rotate: xData.length > 4 ? 20 : 0,
        color: '#666'
      },
      axisLine: { lineStyle: { color: '#d9d9d9' } }
    },
    yAxis: {
      type: 'value',
      min: 40,
      max: 100,
      axisLabel: { fontSize: 11, color: '#666' },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    series: seriesList
  }

  trendChartInstance.setOption(option, true)
}

function initVersionCompareChart() {
  if (!versionCompareChartRef.value) return
  versionCompareChartInstance = echarts.init(versionCompareChartRef.value)
  updateVersionCompareChart()
}

function updateVersionCompareChart() {
  if (!versionCompareChartInstance || !store.loadedRecipe) return

  const versions = loadedRecipeVersions.value
  if (versions.length < 2) return

  const xData = versions.map(v => `v${v.version}`)
  const seriesList = PERFORMANCE_KEYS.map(perf => ({
    name: perf.name,
    type: 'bar' as const,
    data: versions.map(v => v.performance[perf.key]),
    emphasis: { focus: 'series' as const }
  }))

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 12, color: '#666' }
    },
    grid: {
      top: 20,
      right: 20,
      bottom: 40,
      left: 50
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { fontSize: 11, color: '#666' },
      axisLine: { lineStyle: { color: '#d9d9d9' } }
    },
    yAxis: {
      type: 'value',
      min: 40,
      max: 100,
      axisLabel: { fontSize: 11, color: '#666' },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    series: seriesList
  }

  versionCompareChartInstance.setOption(option, true)
}

function handleResize() {
  trendChartInstance?.resize()
  versionCompareChartInstance?.resize()
}

function loadVersion(versionId: string) {
  const success = store.loadRecipeVersion(versionId)
  if (success) {
    showMessage('已加载该版本的纤维配比')
  }
}

function toggleVersionCompare(versionId: string) {
  store.toggleSelectVersion(versionId)
}

function exportReport() {
  if (!store.loadedRecipe) {
    showMessage('请先加载一个配方', 'error')
    return
  }
  const success = store.downloadAnalysisReport(store.loadedRecipe.id)
  if (success) {
    showMessage('分析报告已导出')
  }
}

function getVersionPerformanceDiff(version: any) {
  if (!store.loadedRecipe || version.version === 1) return null
  const prevVersion = store.loadedRecipe.versions.find(v => v.version === version.version - 1)
  if (!prevVersion) return null

  const diffs: { name: string; diff: number; direction: 'up' | 'down' | 'same' }[] = []
  for (const perf of PERFORMANCE_KEYS) {
    const diff = version.performance[perf.key] - prevVersion.performance[perf.key]
    diffs.push({
      name: perf.name,
      diff: Math.round(diff * 10) / 10,
      direction: diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'same'
    })
  }
  return diffs
}

watch(() => [store.recipes, activeTab.value], () => {
  if (activeTab.value === 'trend') {
    setTimeout(() => updateTrendChart(), 50)
  }
  if (activeTab.value === 'version') {
    setTimeout(() => updateVersionCompareChart(), 50)
  }
}, { deep: true })

watch(store.selectedVersionIds, () => {
  if (activeTab.value === 'version') {
    setTimeout(() => updateVersionCompareChart(), 50)
  }
}, { deep: true })

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose()
  versionCompareChartInstance?.dispose()
})

watch(activeTab, (val) => {
  if (val === 'trend') {
    setTimeout(() => { initTrendChart() }, 100)
  }
  if (val === 'version') {
    setTimeout(() => { initVersionCompareChart() }, 100)
  }
})

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="analysis-panel">
    <div class="panel-header">
      <h3 class="panel-title">多维度配方分析</h3>
      <div class="header-actions">
        <button
          v-if="store.loadedRecipe"
          class="btn-export"
          @click="exportReport"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          导出报告
        </button>
        <div class="tab-bar">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'fiber' }"
            @click="activeTab = 'fiber'"
          >原料特性</button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'trend' }"
            @click="activeTab = 'trend'"
          >性能趋势</button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'version' }"
            @click="activeTab = 'version'"
          >版本追踪</button>
        </div>
      </div>
    </div>

    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>

    <div v-if="activeTab === 'fiber'" class="fiber-tab">
      <div
        v-for="fiber in fiberDetails"
        :key="fiber.key"
        class="fiber-detail-card"
      >
        <div class="fiber-card-header">
          <span class="fiber-color-dot" :style="{ backgroundColor: fiber.color }"></span>
          <span class="fiber-card-name">{{ fiber.name }}</span>
          <span class="fiber-current-value">当前占比 {{ fiber.currentValue.toFixed(1) }}%</span>
        </div>
        <div class="fiber-card-body">
          <div class="fiber-info-grid">
            <div class="info-item">
              <span class="info-label">来源</span>
              <span class="info-value">{{ fiber.origin }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">纤维长度</span>
              <span class="info-value">{{ fiber.fiberLength }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">加工工艺</span>
              <span class="info-value">{{ fiber.processingMethod }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">特性</span>
              <span class="info-value">{{ fiber.characteristics }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">适用</span>
              <span class="info-value">{{ fiber.suitableFor }}</span>
            </div>
          </div>
          <div class="fiber-tip">
            <svg class="tip-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span>{{ fiber.tips }}</span>
          </div>
          <div class="fiber-perf-bars">
            <div v-for="perf in PERFORMANCE_KEYS" :key="perf.key" class="mini-perf-item">
              <span class="mini-perf-label">{{ perf.name }}</span>
              <div class="mini-perf-bar">
                <div
                  class="mini-perf-fill"
                  :style="{ width: fiber.basePerformance[perf.key] + '%', backgroundColor: fiber.color }"
                ></div>
              </div>
              <span class="mini-perf-value">{{ fiber.basePerformance[perf.key] }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'trend'" class="trend-tab">
      <div v-if="timelineData.length === 0" class="empty-state">
        暂无配方数据，保存配方后可查看性能趋势
      </div>
      <div v-else ref="trendChartRef" class="trend-chart"></div>
    </div>

    <div v-if="activeTab === 'version'" class="version-tab">
      <div v-if="!store.loadedRecipe" class="empty-state">
        请加载一个配方查看其版本历史
      </div>
      <div v-else class="version-content">
        <div class="version-recipe-name">
          <span class="version-badge">版本历史</span>
          <span class="version-name">{{ store.loadedRecipe.name }}</span>
          <span class="version-count">共 {{ loadedRecipeVersions.length }} 个版本</span>
        </div>

        <div v-if="loadedRecipeVersions.length >= 2" class="version-compare-section">
          <h4 class="sub-title">版本性能对比</h4>
          <div ref="versionCompareChartRef" class="version-compare-chart"></div>
        </div>

        <div class="version-timeline">
          <div
            v-for="ver in loadedRecipeVersions"
            :key="ver.id"
            class="version-node"
          >
            <div class="version-line"></div>
            <div class="version-dot" :class="{ current: ver.version === loadedRecipeVersions.length }"></div>
            <div class="version-info">
              <div class="version-header">
                <span class="version-number">v{{ ver.version }}</span>
                <span class="version-date">{{ formatDate(ver.changedAt) }}</span>
                <span v-if="ver.version !== loadedRecipeVersions.length" class="version-badge-actions">
                  <button class="action-btn" @click="loadVersion(ver.id)" title="加载此版本配比">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                      <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/>
                      <path d="M21 3v5h-5"/>
                    </svg>
                    加载
                  </button>
                  <label class="action-checkbox">
                    <input
                      type="checkbox"
                      :checked="store.selectedVersionIds.includes(ver.id)"
                      @change="toggleVersionCompare(ver.id)"
                    />
                    对比
                  </label>
                </span>
                <span v-if="ver.version === loadedRecipeVersions.length" class="current-badge">当前</span>
              </div>
              <div class="version-note">{{ ver.changeNote }}</div>
              <div class="version-ratios">
                <span
                  v-for="fiber in FIBER_INFO_LIST"
                  :key="fiber.key"
                  class="version-fiber"
                >
                  <span class="vf-color" :style="{ backgroundColor: fiber.color }"></span>
                  {{ fiber.name }} {{ ver.fiberRatio[fiber.key].toFixed(1) }}%
                </span>
              </div>
              <div class="version-perf-summary">
                <span
                  v-for="perf in PERFORMANCE_KEYS"
                  :key="perf.key"
                  class="version-perf"
                >
                  {{ perf.name }}: {{ ver.performance[perf.key].toFixed(1) }}
                </span>
              </div>
              <div v-if="getVersionPerformanceDiff(ver)" class="version-diff">
                <span class="diff-label">较上一版本：</span>
                <span
                  v-for="d in getVersionPerformanceDiff(ver)"
                  :key="d.name"
                  class="diff-item"
                  :class="'diff-' + d.direction"
                >
                  {{ d.name }}
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

      <div class="all-recipes-timeline">
        <h4 class="sub-title">全部配方时间线</h4>
        <div class="timeline-list">
          <div
            v-for="item in timelineData"
            :key="item.id"
            class="timeline-item"
          >
            <div class="tl-dot" :class="'tl-' + item.status"></div>
            <div class="tl-info">
              <span class="tl-name">{{ item.name }}</span>
              <span class="tl-status">{{ store.getStatusText(item.status) }}</span>
              <span class="tl-date">{{ formatDate(item.createdAt) }}</span>
              <span class="tl-versions">{{ item.versionCount }}个版本</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analysis-panel {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-export {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #52c41a, #389e0d);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-export:hover {
  background: linear-gradient(135deg, #73d13d, #52c41a);
  transform: translateY(-1px);
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

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.tab-bar {
  display: flex;
  gap: 4px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 3px;
}

.tab-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  background: transparent;
  color: #666;
  transition: all 0.2s;
  font-family: inherit;
}

.tab-btn.active {
  background: #fff;
  color: #333;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-btn:hover:not(.active) {
  color: #333;
}

.fiber-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.fiber-detail-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.fiber-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.fiber-color-dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}

.fiber-card-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.fiber-current-value {
  margin-left: auto;
  font-size: 12px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.fiber-card-body {
  padding: 14px 16px;
}

.fiber-info-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  gap: 10px;
}

.info-label {
  width: 70px;
  min-width: 70px;
  font-size: 12px;
  color: #999;
  font-weight: 500;
  flex-shrink: 0;
}

.info-value {
  font-size: 12px;
  color: #555;
  line-height: 1.6;
}

.fiber-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #ad6800;
  line-height: 1.5;
}

.tip-icon {
  flex-shrink: 0;
  color: #faad14;
  margin-top: 1px;
}

.fiber-perf-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mini-perf-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-perf-label {
  width: 52px;
  font-size: 11px;
  color: #666;
  flex-shrink: 0;
}

.mini-perf-bar {
  flex: 1;
  height: 6px;
  background: #f5f5f5;
  border-radius: 3px;
  overflow: hidden;
}

.mini-perf-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
  opacity: 0.7;
}

.mini-perf-value {
  width: 24px;
  font-size: 11px;
  color: #333;
  text-align: right;
  flex-shrink: 0;
}

.trend-tab {
  min-height: 300px;
}

.trend-chart {
  width: 100%;
  height: 350px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #999;
  font-size: 14px;
}

.version-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 500px;
  overflow-y: auto;
}

.version-content {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 16px;
}

.version-recipe-name {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.version-badge {
  padding: 2px 8px;
  font-size: 11px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 4px;
  font-weight: 500;
}

.version-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.version-count {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.version-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.version-node {
  display: flex;
  gap: 12px;
  position: relative;
  padding-left: 20px;
}

.version-line {
  position: absolute;
  left: 5px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e8e8e8;
}

.version-node:last-child .version-line {
  display: none;
}

.version-dot {
  position: absolute;
  left: 0;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #d9d9d9;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px #d9d9d9;
  z-index: 1;
}

.version-dot.current {
  background: #1890ff;
  box-shadow: 0 0 0 2px #1890ff;
}

.version-info {
  flex: 1;
  padding-bottom: 16px;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.version-number {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.version-date {
  font-size: 12px;
  color: #999;
}

.version-note {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.version-ratios {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.version-fiber {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #555;
}

.vf-color {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.version-perf-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.version-perf {
  font-size: 11px;
  color: #888;
}

.all-recipes-timeline {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 16px;
}

.sub-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 8px;
}

.tl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tl-draft {
  background: #1890ff;
}

.tl-finalized {
  background: #fa8c16;
}

.tl-verified {
  background: #52c41a;
}

.tl-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tl-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.tl-status {
  font-size: 11px;
  color: #8c8c8c;
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 3px;
}

.tl-date {
  font-size: 11px;
  color: #999;
  margin-left: auto;
}

.tl-versions {
  font-size: 11px;
  color: #1890ff;
}

.version-compare-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 10px;
}

.version-compare-chart {
  width: 100%;
  height: 280px;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.version-badge-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.action-btn:hover {
  background: #bae7ff;
}

.action-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #666;
  cursor: pointer;
}

.action-checkbox input {
  cursor: pointer;
}

.current-badge {
  padding: 2px 8px;
  background: #1890ff;
  color: #fff;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  margin-left: auto;
}

.version-diff {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 6px 10px;
  background: #f9f9f9;
  border-radius: 6px;
  font-size: 11px;
}

.diff-label {
  color: #999;
  font-weight: 500;
}

.diff-item {
  display: flex;
  align-items: center;
  gap: 2px;
}

.diff-item.diff-up {
  color: #52c41a;
}

.diff-item.diff-down {
  color: #ff4d4f;
}

.diff-item.diff-same {
  color: #8c8c8c;
}

.diff-arrow {
  font-size: 10px;
}
</style>
