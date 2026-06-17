<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import {
  PROCESS_PARAM_RANGES,
  MICROSTRUCTURE_KEYS,
  PREDICTION_KEYS,
  FIBER_INFO_LIST
} from '../types'
import type {
  ProcessParams,
  ScanParamKey,
  ParamScanConfig,
  DiffAnalysisResult
} from '../types'

const store = useRecipeStore()

const activeTab = ref<'seed' | 'scan' | 'compare' | 'repro'>('seed')

const seedInput = ref<string>('')
const scanName = ref('')
const scanConfigs = reactive<Record<ScanParamKey, ParamScanConfig>>(
  Object.fromEntries(
    Object.keys(PROCESS_PARAM_RANGES).map((k) => {
      const key = k as ScanParamKey
      const range = PROCESS_PARAM_RANGES[key]
      return [key, {
        paramKey: key,
        enabled: false,
        startValue: range.min,
        endValue: Math.min(range.min + range.step * 10, range.max),
        stepValue: range.step * 5
      }]
    })
  ) as Record<ScanParamKey, ParamScanConfig>
)

const baseSnapshotId = ref<string>('')
const lastDiffResults = ref<DiffAnalysisResult[]>([])
const isScanning = ref(false)
const scanProgress = ref(0)

const tabs = [
  { key: 'seed' as const, label: '🔐 种子控制', desc: '锁定随机种子，确保结果可复现' },
  { key: 'scan' as const, label: '📊 参数扫描', desc: '批量扫描工艺参数，自动生成实验矩阵' },
  { key: 'compare' as const, label: '⚖️ 差异分析', desc: '多方案对比，量化参数影响' },
  { key: 'repro' as const, label: '🔁 复现验证', desc: '校验和验证与复现性报告' }
]

const activeScanParamKeys = computed(() =>
  Object.values(scanConfigs).filter(c => c.enabled).map(c => c.paramKey)
)

const estimatedScanCount = computed(() => {
  let count = 1
  for (const cfg of Object.values(scanConfigs)) {
    if (!cfg.enabled) continue
    const steps = Math.floor((cfg.endValue - cfg.startValue) / cfg.stepValue) + 1
    if (steps > 0) count *= Math.max(1, steps)
  }
  return count
})

const seedConfig = computed(() => store.seedConfig)
const effectiveSeed = computed(() => store.effectiveSeed)
const batchScanResults = computed(() => store.batchScanResults)
const selectedSnapshots = computed(() => store.selectedSnapshots)
const currentScanResults = computed(() => store.currentScanResults)
const diffResults = computed(() => store.diffAnalysisResults)
const reproReports = computed(() => store.reproducibilityReports)
const snapshots = computed(() => store.simulationSnapshots)

watch(() => seedConfig.value.customSeed, (v) => {
  seedInput.value = v !== null ? String(v) : ''
}, { immediate: true })

function applySeedInput() {
  const v = seedInput.value.trim()
  if (v === '') {
    store.setCustomSeed(null)
    return
  }
  const n = parseInt(v, 10)
  if (!isNaN(n) && n >= 0 && n <= 0xffffffff) {
    store.setCustomSeed(n)
  }
}

function getScanConfigClass(cfg: ParamScanConfig) {
  const range = PROCESS_PARAM_RANGES[cfg.paramKey]
  const valid = cfg.startValue >= range.min && cfg.endValue <= range.max
    && cfg.startValue <= cfg.endValue && cfg.stepValue > 0
  return valid
}

function asyncRunBatchScan() {
  if (activeScanParamKeys.value.length === 0) return
  isScanning.value = true
  scanProgress.value = 0

  setTimeout(() => {
    store.createBatchScan({
      name: scanName.value || `参数扫描_${new Date().toLocaleString('zh-CN')}`,
      baseFiberRatio: { ...store.currentRatio },
      baseParams: { ...store.processParams },
      scanConfigs: JSON.parse(JSON.stringify(scanConfigs))
    })
    scanProgress.value = 100
    setTimeout(() => {
      isScanning.value = false
      scanProgress.value = 0
      activeTab.value = 'compare'
    }, 300)
  }, 100)
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

function formatSeed(s: number): string {
  const str = s.toString()
  if (str.length > 12) return str.slice(0, 12) + '…'
  return str
}

function getFiberSummary(ratio: any): string {
  const parts: string[] = []
  FIBER_INFO_LIST.forEach(f => {
    if (ratio[f.key] > 0) {
      parts.push(`${f.name}${ratio[f.key].toFixed(0)}%`)
    }
  })
  return parts.join('·')
}

function getParamSummary(p: ProcessParams): string {
  return `打浆${p.beatingDegree}° 厚${p.sheetThickness}μm 压${p.pressingIntensity}MPa 干${p.dryingTemperature}℃`
}

function getSignificanceColor(s: string): string {
  switch (s) {
    case 'high': return '#f5222d'
    case 'medium': return '#fa8c16'
    case 'low': return '#faad14'
    default: return '#52c41a'
  }
}

function getSignificanceLabel(s: string): string {
  switch (s) {
    case 'high': return '显著'
    case 'medium': return '中等'
    case 'low': return '轻微'
    default: return '无显著'
  }
}

function getReproStatusInfo(status: string) {
  switch (status) {
    case 'exact': return { label: '完全复现', color: '#52c41a', bg: '#f6ffed', icon: '✅' }
    case 'near': return { label: '近似复现', color: '#fa8c16', bg: '#fff7e6', icon: '⚠️' }
    default: return { label: '复现失败', color: '#f5222d', bg: '#fff1f0', icon: '❌' }
  }
}

function doDiffAnalysis() {
  const baseSnap = selectedSnapshots.value.find(s => s.id === baseSnapshotId.value)
    || snapshots.value.find(s => s.id === baseSnapshotId.value)
  const base = baseSnap ? {
    id: baseSnap.id,
    label: baseSnap.note || formatDate(baseSnap.createdAt),
    params: baseSnap.params,
    fiberRatio: baseSnap.fiberRatio,
    microstructure: baseSnap.microstructure,
    prediction: baseSnap.prediction
  } : null

  if (!base) {
    alert('请先选择作为基准的快照')
    return
  }

  const allSelected: Array<{
    id: string; label: string; params: ProcessParams;
    fiberRatio: any; microstructure: any; prediction: any
  }> = []

  selectedSnapshots.value.forEach(s => {
    if (s.id !== baseSnapshotId.value) {
      allSelected.push({
        id: s.id,
        label: s.note || formatDate(s.createdAt),
        params: s.params,
        fiberRatio: s.fiberRatio,
        microstructure: s.microstructure,
        prediction: s.prediction
      })
    }
  })
  currentScanResults.value.forEach(r => {
    allSelected.push({
      id: r.id,
      label: r.tag,
      params: r.params,
      fiberRatio: r.fiberRatio,
      microstructure: r.microstructure,
      prediction: r.prediction
    })
  })

  if (allSelected.length === 0) {
    alert('请选择至少一个对比项（快照或扫描结果）')
    return
  }

  const results = store.performDiffAnalysis(base, allSelected)
  lastDiffResults.value = results
}

function exportReport(reportId: string) {
  const text = store.exportReproducibilityReport(reportId)
  if (!text) return
  const blob = new Blob([text], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `复现性报告_${formatDate(Date.now()).replace(/[\/:]/g, '-')}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function resetScanConfigs() {
  Object.keys(scanConfigs).forEach(k => {
    const key = k as ScanParamKey
    const range = PROCESS_PARAM_RANGES[key]
    scanConfigs[key].enabled = false
    scanConfigs[key].startValue = range.min
    scanConfigs[key].endValue = Math.min(range.min + range.step * 10, range.max)
    scanConfigs[key].stepValue = range.step * 5
  })
  scanName.value = ''
}

function quickPreset(preset: 'beating' | 'thickness' | 'pressing' | 'drying') {
  resetScanConfigs()
  switch (preset) {
    case 'beating':
      scanConfigs.beatingDegree.enabled = true
      scanConfigs.beatingDegree.startValue = 20
      scanConfigs.beatingDegree.endValue = 80
      scanConfigs.beatingDegree.stepValue = 15
      scanName.value = '打浆度影响分析'
      break
    case 'thickness':
      scanConfigs.sheetThickness.enabled = true
      scanConfigs.sheetThickness.startValue = 40
      scanConfigs.sheetThickness.endValue = 180
      scanConfigs.sheetThickness.stepValue = 20
      scanName.value = '抄纸厚度影响分析'
      break
    case 'pressing':
      scanConfigs.pressingIntensity.enabled = true
      scanConfigs.pressingIntensity.startValue = 2
      scanConfigs.pressingIntensity.endValue = 10
      scanConfigs.pressingIntensity.stepValue = 2
      scanName.value = '压榨强度影响分析'
      break
    case 'drying':
      scanConfigs.dryingTemperature.enabled = true
      scanConfigs.dryingTemperature.startValue = 30
      scanConfigs.dryingTemperature.endValue = 110
      scanConfigs.dryingTemperature.stepValue = 20
      scanConfigs.dryingDuration.enabled = true
      scanConfigs.dryingDuration.startValue = 10
      scanConfigs.dryingDuration.endValue = 50
      scanConfigs.dryingDuration.stepValue = 20
      scanName.value = '干燥条件影响分析'
      break
  }
}
</script>

<template>
  <div class="repro-mode">
    <div class="tabs-header">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <span class="tab-label">{{ tab.label }}</span>
        <span class="tab-desc">{{ tab.desc }}</span>
      </div>
    </div>

    <div class="tabs-content">
      <!-- 种子控制 -->
      <div v-show="activeTab === 'seed'" class="tab-panel">
        <div class="panel-section">
          <h4 class="section-title">🎯 随机种子控制</h4>
          <div class="seed-desc">
            固定随机种子可以保证在相同工艺条件下得到完全一致的模拟结果，是实验可复现的基础。
          </div>

          <div class="seed-grid">
            <div class="seed-card">
              <div class="card-head">
                <span class="head-label">自定义种子</span>
                <label class="toggle-wrap">
                  <input type="checkbox" :checked="seedConfig.isLocked" @change="e => store.toggleSeedLock((e.target as HTMLInputElement).checked)" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span class="toggle-label">{{ seedConfig.isLocked ? '已锁定' : '未锁定' }}</span>
                </label>
              </div>
              <div class="seed-input-row">
                <input
                  v-model="seedInput"
                  type="text"
                  class="seed-input"
                  placeholder="输入数值种子，留空=自动生成"
                  :disabled="!seedConfig.isLocked"
                  @blur="applySeedInput"
                  @keyup.enter="applySeedInput"
                />
                <button class="seed-btn" @click="store.regenerateRandomSeed()" :disabled="!seedConfig.isLocked">🎲 随机</button>
              </div>
              <div class="seed-status" :class="{ locked: seedConfig.isLocked }">
                <span class="status-icon">{{ seedConfig.isLocked ? '🔒' : '🔓' }}</span>
                <span class="status-text">
                  {{ seedConfig.isLocked
                    ? `当前种子：${seedConfig.customSeed !== null ? seedConfig.customSeed : '(未设置)'}`
                    : '使用确定性种子（由配方与参数自动生成）'
                  }}
                </span>
              </div>
            </div>

            <div class="seed-card">
              <div class="card-head">
                <span class="head-label">自动递增模式</span>
                <label class="toggle-wrap">
                  <input type="checkbox" :checked="seedConfig.autoIncrement" @change="e => store.toggleAutoIncrement((e.target as HTMLInputElement).checked)" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span class="toggle-label">{{ seedConfig.autoIncrement ? '开启' : '关闭' }}</span>
                </label>
              </div>
              <div class="seed-info">
                <div class="info-row"><span>起始种子：</span><code>{{ seedConfig.lastUsedSeed || '(未设置)' }}</code></div>
                <div class="info-hint">每次保存快照时自动在起始种子基础上递增计数，适合批量对比实验。</div>
              </div>
            </div>

            <div class="seed-card info-card">
              <div class="card-head"><span class="head-label">📋 当前状态</span></div>
              <div class="current-stats">
                <div class="stat-row">
                  <span class="stat-label">有效种子</span>
                  <code class="stat-value">{{ effectiveSeed }}</code>
                </div>
                <div class="stat-row">
                  <span class="stat-label">模式</span>
                  <span class="stat-value mode-tag" :class="{
                    locked: seedConfig.isLocked,
                    auto: seedConfig.autoIncrement,
                    auto_determ: !seedConfig.isLocked && !seedConfig.autoIncrement
                  }">
                    {{ seedConfig.isLocked ? '手动锁定' : seedConfig.autoIncrement ? '自动递增' : '确定性' }}
                  </span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">快照总数</span>
                  <span class="stat-value">{{ snapshots.length }} 个</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h4 class="section-title">💡 使用建议</h4>
          <div class="tips-list">
            <div class="tip-item"><b>🔬 可复现实验：</b>锁定种子后，所有随机元素（纤维路径、孔隙、层次扰动）将完全确定</div>
            <div class="tip-item"><b>📊 批量对比：</b>开启自动递增，确保对比组间仅参数不同，消除随机差异</div>
            <div class="tip-item"><b>🎯 论文写作：</b>记录种子编号可让审稿人/读者重现你图表中的微观可视化</div>
          </div>
        </div>
      </div>

      <!-- 参数批量扫描 -->
      <div v-show="activeTab === 'scan'" class="tab-panel">
        <div class="panel-section">
          <div class="section-head-row">
            <h4 class="section-title">🧪 参数批量扫描配置</h4>
            <div class="preset-chips">
              <span class="chip-label">快速模板：</span>
              <button class="chip-btn" @click="quickPreset('beating')">打浆度</button>
              <button class="chip-btn" @click="quickPreset('thickness')">厚度</button>
              <button class="chip-btn" @click="quickPreset('pressing')">压榨</button>
              <button class="chip-btn" @click="quickPreset('drying')">干燥</button>
            </div>
          </div>

          <div class="scan-info-row">
            <div class="scan-name-input">
              <label>扫描任务名称</label>
              <input v-model="scanName" type="text" placeholder="例如：打浆度影响研究" />
            </div>
            <div class="scan-estimate">
              <div class="estimate-label">预计组合数</div>
              <div class="estimate-value" :class="{ high: estimatedScanCount > 50 }">{{ estimatedScanCount }} 次</div>
            </div>
          </div>

          <div class="scan-configs-grid">
            <div
              v-for="(cfg, key) in scanConfigs"
              :key="key"
              class="scan-config-card"
              :class="{
                enabled: cfg.enabled,
                invalid: cfg.enabled && !getScanConfigClass(cfg)
              }"
            >
              <div class="sc-head">
                <label class="sc-toggle">
                  <input type="checkbox" v-model="cfg.enabled" />
                  <span class="sc-toggle-box"></span>
                  <span class="sc-name">
                    {{ PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].label }}
                    <span class="sc-unit">{{ PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].unit }}</span>
                  </span>
                </label>
              </div>
              <div class="sc-body" :class="{ disabled: !cfg.enabled }">
                <div class="sc-range-group">
                  <div class="sc-field">
                    <label>起始</label>
                    <input
                      type="number"
                      v-model.number="cfg.startValue"
                      :step="PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].step"
                      :min="PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].min"
                      :max="PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].max"
                      :disabled="!cfg.enabled"
                    />
                  </div>
                  <div class="sc-field">
                    <label>结束</label>
                    <input
                      type="number"
                      v-model.number="cfg.endValue"
                      :step="PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].step"
                      :min="PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].min"
                      :max="PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].max"
                      :disabled="!cfg.enabled"
                    />
                  </div>
                  <div class="sc-field">
                    <label>步长</label>
                    <input
                      type="number"
                      v-model.number="cfg.stepValue"
                      :step="PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].step"
                      :min="PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].step"
                      :disabled="!cfg.enabled"
                    />
                  </div>
                </div>
                <div class="sc-range-preview">
                  允许范围：{{ PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].min }} ~ {{ PROCESS_PARAM_RANGES[cfg.paramKey as ScanParamKey].max }}
                </div>
              </div>
            </div>
          </div>

          <div class="scan-actions">
            <button class="scan-btn ghost" @click="resetScanConfigs">重置配置</button>
            <button
              class="scan-btn primary"
              :disabled="activeScanParamKeys.length === 0 || isScanning || estimatedScanCount > 200"
              @click="asyncRunBatchScan"
            >
              {{ isScanning ? `扫描中… ${scanProgress}%` : `▶ 开始批量扫描 (${estimatedScanCount})` }}
            </button>
          </div>
          <div v-if="estimatedScanCount > 200" class="scan-warn">
            ⚠️ 组合数超过 200，建议缩小扫描范围或增大步长
          </div>
        </div>

        <div class="panel-section" v-if="batchScanResults.length > 0">
          <h4 class="section-title">📂 历史扫描任务</h4>
          <div class="scan-history-list">
            <div v-for="scan in batchScanResults" :key="scan.id" class="scan-history-card">
              <div class="sh-head">
                <div class="sh-title-group">
                  <span class="sh-title">{{ scan.config.name }}</span>
                  <span class="sh-meta">{{ formatDate(scan.config.createdAt) }}</span>
                </div>
                <button class="icon-btn danger" @click="store.deleteBatchScan(scan.id)" title="删除">🗑️</button>
              </div>
              <div class="sh-summary">
                <div class="sh-chip"><b>{{ scan.results.length }}</b> 个结果</div>
                <div class="sh-chip"><b>{{ Object.values(scan.config.scanConfigs).filter(c=>c?.enabled).length }}</b> 个参数</div>
                <div class="sh-chip">基准：{{ getFiberSummary(scan.config.baseFiberRatio) }}</div>
              </div>
              <div class="sh-params-tags">
                <span
                  v-for="c in Object.values(scan.config.scanConfigs).filter(c=>c?.enabled)"
                  :key="c!.paramKey"
                  class="scan-param-tag"
                >
                  {{ PROCESS_PARAM_RANGES[c!.paramKey].label }}: {{ c!.startValue }}~{{ c!.endValue }}/{{ c!.stepValue }}
                </span>
              </div>
              <div class="sh-results-scroll">
                <div
                  v-for="r in scan.results.slice(0, 30)"
                  :key="r.id"
                  class="sh-result-item"
                  :class="{ selected: currentScanResults.find(s => s.id === r.id) }"
                  @click="store.toggleSelectScanResult(r.id)"
                >
                  <div class="sri-tag">{{ r.tag }}</div>
                  <div class="sri-preds">
                    <span v-for="pk in PREDICTION_KEYS.slice(0, 3)" :key="pk.key" :style="{ color: pk.color }">
                      {{ pk.name }} {{ r.prediction[pk.key].toFixed(pk.key === 'durability' ? 0 : 1) }}
                    </span>
                  </div>
                  <div class="sri-hint">
                    {{ currentScanResults.find(s => s.id === r.id) ? '✓ 已选' : '点击加入对比' }}
                  </div>
                </div>
              </div>
              <div v-if="scan.results.length > 30" class="sh-more-hint">
                仅显示前30条，共 {{ scan.results.length }} 条结果
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 差异分析 -->
      <div v-show="activeTab === 'compare'" class="tab-panel">
        <div class="panel-section">
          <h4 class="section-title">🎯 对比项选择</h4>
          <div class="compare-desc">
            选择一个<b>基准快照</b>，然后在下方选择要对比的其它快照或扫描结果（最多5个对比项）。
          </div>

          <div class="base-select-row">
            <label class="base-label">基准快照</label>
            <select v-model="baseSnapshotId" class="base-select">
              <option value="">-- 请选择基准 --</option>
              <optgroup v-if="snapshots.length > 0" label="📸 快照">
                <option v-for="s in snapshots" :key="s.id" :value="s.id">
                  {{ s.note || formatDate(s.createdAt) }}（种子: {{ formatSeed(s.seed) }}）
                </option>
              </optgroup>
            </select>
          </div>

          <div class="selected-list-section">
            <div class="sl-head">
              <span>已选择对比项 ({{ selectedSnapshots.length + currentScanResults.length }}/5)</span>
              <button v-if="selectedSnapshots.length + currentScanResults.length > 0" class="text-btn" @click="store.clearAllComparisons">全部清除</button>
            </div>

            <div v-if="snapshots.length > 0" class="sl-group">
              <div class="sl-group-title">📸 快照列表（点击加入对比）</div>
              <div class="sl-items-grid">
                <div
                  v-for="s in snapshots.slice(0, 15)"
                  :key="s.id"
                  class="compare-item"
                  :class="{
                    selected: selectedSnapshots.find(sn => sn.id === s.id),
                    base: baseSnapshotId === s.id
                  }"
                >
                  <div class="ci-main" @click="s.id !== baseSnapshotId && store.toggleSelectSnapshot(s.id)">
                    <div class="ci-title">
                      <span class="ci-name">{{ s.note || '未命名快照' }}</span>
                      <span v-if="baseSnapshotId === s.id" class="ci-badge base">基准</span>
                      <span v-else-if="selectedSnapshots.find(sn => sn.id === s.id)" class="ci-badge selected">已选</span>
                    </div>
                    <div class="ci-sub">{{ formatDate(s.createdAt) }} · 种子: {{ formatSeed(s.seed) }}</div>
                    <div class="ci-meta">{{ getParamSummary(s.params) }}</div>
                  </div>
                  <div class="ci-actions">
                    <button class="text-btn tiny" @click="store.runReproducibilityCheck(s.id)">🔁 复现验证</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="currentScanResults.length > 0 || batchScanResults.some(b => b.results.length > 0)" class="sl-group">
              <div class="sl-group-title">📊 扫描结果（从参数扫描Tab中选择）</div>
              <div class="sl-items-grid" v-if="currentScanResults.length > 0">
                <div
                  v-for="r in currentScanResults"
                  :key="r.id"
                  class="compare-item selected"
                  @click="store.toggleSelectScanResult(r.id)"
                >
                  <div class="ci-main">
                    <div class="ci-title">
                      <span class="ci-name">{{ r.tag }}</span>
                      <span class="ci-badge selected">已选</span>
                    </div>
                    <div class="ci-sub">扫描结果 #{{ r.index }}</div>
                    <div class="ci-meta">{{ getParamSummary(r.params) }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-hint">
                暂无扫描结果被选中，请前往「参数扫描」Tab选择扫描结果。
              </div>
            </div>
          </div>

          <div class="diff-actions">
            <button
              class="scan-btn primary"
              :disabled="!baseSnapshotId || (selectedSnapshots.length + currentScanResults.length === 0)"
              @click="doDiffAnalysis"
            >
              🔍 执行差异分析
            </button>
            <button v-if="diffResults.length > 0" class="scan-btn ghost" @click="store.clearDiffResults">清除分析结果</button>
          </div>
        </div>

        <div class="panel-section" v-if="diffResults.length > 0">
          <h4 class="section-title">📈 差异分析结果</h4>
          <div class="diff-cards">
            <div v-for="diff in diffResults" :key="diff.id" class="diff-card">
              <div class="dc-head">
                <div class="dc-title">
                  <span class="dc-base">基准：{{ diff.baseLabel }}</span>
                  <span class="dc-arrow">→</span>
                  <span class="dc-target">目标：{{ diff.targetLabel }}</span>
                </div>
                <div class="dc-similarity" :style="{
                  color: diff.overallSimilarity >= 85 ? '#52c41a' : diff.overallSimilarity >= 60 ? '#fa8c16' : '#f5222d'
                }">
                  相似度 <b>{{ diff.overallSimilarity }}%</b>
                </div>
              </div>

              <div class="dc-highlight" v-if="diff.mostChangedMicro || diff.mostChangedPrediction">
                <span v-if="diff.mostChangedMicro" class="hl-chip micro">最大微观变化：<b>{{ diff.mostChangedMicro }}</b></span>
                <span v-if="diff.mostChangedPrediction" class="hl-chip pred">最大预测变化：<b>{{ diff.mostChangedPrediction }}</b></span>
              </div>

              <div class="dc-sections">
                <div class="dc-section">
                  <div class="dcs-title">⚙️ 参数差异</div>
                  <table class="diff-table">
                    <thead><tr><th>参数</th><th>基准</th><th>目标</th><th>差值</th><th>变化</th></tr></thead>
                    <tbody>
                      <tr v-for="pk in Object.keys(PROCESS_PARAM_RANGES)" :key="pk">
                        <td>{{ PROCESS_PARAM_RANGES[pk as keyof typeof PROCESS_PARAM_RANGES].label }}</td>
                        <td>{{ diff.paramDiff[pk as keyof typeof diff.paramDiff]?.base.toFixed(1) }}</td>
                        <td>{{ diff.paramDiff[pk as keyof typeof diff.paramDiff]?.target.toFixed(1) }}</td>
                        <td :style="{ color: getSignificanceColor(diff.paramDiff[pk as keyof typeof diff.paramDiff]?.significance || '') }">
                          {{ (diff.paramDiff[pk as keyof typeof diff.paramDiff]?.diff ?? 0) > 0 ? '+' : '' }}{{ diff.paramDiff[pk as keyof typeof diff.paramDiff]?.diff.toFixed(1) }}
                          {{ PROCESS_PARAM_RANGES[pk as keyof typeof PROCESS_PARAM_RANGES].unit }}
                        </td>
                        <td :style="{ color: getSignificanceColor(diff.paramDiff[pk as keyof typeof diff.paramDiff]?.significance || '') }">
                          {{ diff.paramDiff[pk as keyof typeof diff.paramDiff]?.diffPercent.toFixed(1) }}%
                          <span class="sig-tag">{{ getSignificanceLabel(diff.paramDiff[pk as keyof typeof diff.paramDiff]?.significance || '') }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="dc-section">
                  <div class="dcs-title">🔬 微观结构差异</div>
                  <table class="diff-table">
                    <thead><tr><th>指标</th><th>基准</th><th>目标</th><th>差值</th><th>变化率</th></tr></thead>
                    <tbody>
                      <tr v-for="mk in MICROSTRUCTURE_KEYS" :key="mk.key">
                        <td :style="{ color: mk.color }">{{ mk.name }}</td>
                        <td>{{ mk.format === 'int' ? Math.round(diff.microDiff[mk.key]?.base ?? 0) : (diff.microDiff[mk.key]?.base ?? 0).toFixed(1) }}</td>
                        <td>{{ mk.format === 'int' ? Math.round(diff.microDiff[mk.key]?.target ?? 0) : (diff.microDiff[mk.key]?.target ?? 0).toFixed(1) }}</td>
                        <td :style="{ color: getSignificanceColor(diff.microDiff[mk.key]?.significance || '') }">
                          {{ (diff.microDiff[mk.key]?.diff ?? 0) > 0 ? '+' : '' }}{{ diff.microDiff[mk.key]?.diff.toFixed(1) }}{{ mk.unit }}
                        </td>
                        <td :style="{ color: getSignificanceColor(diff.microDiff[mk.key]?.significance || '') }">
                          {{ (diff.microDiff[mk.key]?.diffPercent ?? 0).toFixed(1) }}%
                          <span class="sig-tag">{{ getSignificanceLabel(diff.microDiff[mk.key]?.significance || '') }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="dc-section">
                  <div class="dcs-title">🎯 性能预测差异</div>
                  <table class="diff-table">
                    <thead><tr><th>指标</th><th>基准</th><th>目标</th><th>差值</th><th>变化率</th></tr></thead>
                    <tbody>
                      <tr v-for="pk in PREDICTION_KEYS" :key="pk.key">
                        <td :style="{ color: pk.color }">{{ pk.name }}</td>
                        <td>{{ diff.predictionDiff[pk.key]?.base.toFixed(pk.key === 'durability' ? 0 : 1) }} {{ pk.unit }}</td>
                        <td>{{ diff.predictionDiff[pk.key]?.target.toFixed(pk.key === 'durability' ? 0 : 1) }} {{ pk.unit }}</td>
                        <td :style="{ color: getSignificanceColor(diff.predictionDiff[pk.key]?.significance || '') }">
                          {{ (diff.predictionDiff[pk.key]?.diff ?? 0) > 0 ? '+' : '' }}{{ diff.predictionDiff[pk.key]?.diff.toFixed(pk.key === 'durability' ? 0 : 1) }} {{ pk.unit }}
                        </td>
                        <td :style="{ color: getSignificanceColor(diff.predictionDiff[pk.key]?.significance || '') }">
                          {{ (diff.predictionDiff[pk.key]?.diffPercent ?? 0).toFixed(1) }}%
                          <span class="sig-tag">{{ getSignificanceLabel(diff.predictionDiff[pk.key]?.significance || '') }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 复现验证 -->
      <div v-show="activeTab === 'repro'" class="tab-panel">
        <div class="panel-section">
          <h4 class="section-title">🔁 复现性验证</h4>
          <div class="repro-desc">
            通过保存时的随机种子和校验和验证快照是否能被精确复现。精确复现是科学研究可信度的核心保障。
          </div>

          <div class="repro-check-row" v-if="snapshots.length > 0">
            <button class="scan-btn primary" @click="() => { snapshots.slice(0, 5).forEach(s => store.runReproducibilityCheck(s.id)) }">
              ✅ 批量验证最近5个快照
            </button>
            <button v-if="reproReports.length > 0" class="scan-btn ghost" @click="store.clearReproducibilityReports">清除报告</button>
          </div>

          <div v-if="snapshots.length === 0" class="empty-hint">
            请先保存至少一个模拟快照（在右侧快照面板中保存），然后进行复现性验证。
          </div>
        </div>

        <div class="panel-section" v-if="reproReports.length > 0">
          <h4 class="section-title">📑 复现性报告</h4>
          <div class="repro-report-list">
            <div v-for="rep in reproReports" :key="rep.id" class="repro-report-card" :style="{ '--border-color': getReproStatusInfo(rep.status).color }">
              <div class="rr-head">
                <div class="rr-status" :style="{ background: getReproStatusInfo(rep.status).bg, color: getReproStatusInfo(rep.status).color }">
                  <span class="rr-icon">{{ getReproStatusInfo(rep.status).icon }}</span>
                  <span class="rr-status-label">{{ getReproStatusInfo(rep.status).label }}</span>
                </div>
                <div class="rr-meta">
                  <span>{{ formatDate(rep.generatedAt) }}</span>
                  <button class="text-btn tiny" @click="exportReport(rep.id)">📥 导出报告</button>
                </div>
              </div>

              <div class="rr-grid">
                <div class="rr-metric">
                  <span class="rr-label">种子一致</span>
                  <span class="rr-value good">{{ rep.originalSeed === rep.replaySeed ? '✅' : '❌' }}</span>
                </div>
                <div class="rr-metric">
                  <span class="rr-label">参数一致</span>
                  <span class="rr-value good">{{ rep.paramsMatch ? '✅' : '❌' }}</span>
                </div>
                <div class="rr-metric">
                  <span class="rr-label">配方一致</span>
                  <span class="rr-value good">{{ rep.ratioMatch ? '✅' : '❌' }}</span>
                </div>
                <div class="rr-metric">
                  <span class="rr-label">微观匹配</span>
                  <span class="rr-value" :class="rep.microMatch ? 'good' : 'bad'">{{ rep.microMatch ? '✅' : '❌' }}</span>
                </div>
                <div class="rr-metric">
                  <span class="rr-label">预测匹配</span>
                  <span class="rr-value" :class="rep.predictionMatch ? 'good' : 'bad'">{{ rep.predictionMatch ? '✅' : '❌' }}</span>
                </div>
                <div class="rr-metric">
                  <span class="rr-label">最大误差</span>
                  <span class="rr-value" :class="rep.maxMicroError + rep.maxPredictionError < 0.001 ? 'good' : 'warn'">
                    微观 {{ rep.maxMicroError }} / 预测 {{ rep.maxPredictionError }}
                  </span>
                </div>
              </div>

              <div class="rr-details">
                <div class="rr-details-title">详细信息</div>
                <ul class="rr-details-list">
                  <li v-for="(d, i) in rep.details" :key="i">{{ d }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h4 class="section-title">🔐 快照校验和列表</h4>
          <div v-if="snapshots.length > 0" class="checksum-list">
            <div v-for="s in snapshots" :key="s.id" class="checksum-row">
              <div class="cr-name">{{ s.note || formatDate(s.createdAt) }}</div>
              <div class="cr-seed"><b>种子：</b><code>{{ s.seed }}</code></div>
              <div class="cr-checksum"><b>校验和：</b><code>0x{{ s.checksum.toUpperCase() }}</code></div>
            </div>
          </div>
          <div v-else class="empty-hint">暂无快照数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.repro-mode {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.tabs-header {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.tab-item {
  padding: 14px 16px;
  cursor: pointer;
  border-right: 1px solid #f0f0f0;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tab-item:last-child { border-right: none; }
.tab-item:hover { background: #f5f5f5; }
.tab-item.active {
  background: #fff;
  border-bottom: 3px solid #1890ff;
  margin-bottom: -1px;
}

.tab-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.tab-desc {
  font-size: 11px;
  color: #999;
  line-height: 1.4;
}

.tab-item.active .tab-label { color: #1890ff; }

.tabs-content { padding: 20px; }
.tab-panel { display: flex; flex-direction: column; gap: 20px; }

.panel-section { }

.section-head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.seed-desc, .compare-desc, .repro-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 3px solid #1890ff;
}

.seed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1100px) {
  .seed-grid { grid-template-columns: 1fr; }
  .tabs-header { grid-template-columns: 1fr 1fr; }
}

.seed-card {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s;
}

.seed-card.info-card { background: linear-gradient(135deg, #e6f7ff 0%, #fff 100%); border-color: #91d5ff; }
.seed-card:hover { border-color: #d9d9d9; }

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
  flex-wrap: wrap;
}

.head-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.toggle-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

.toggle-wrap input { display: none; }

.toggle-track {
  width: 36px;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-wrap input:checked + .toggle-track { background: #1890ff; }
.toggle-wrap input:checked + .toggle-track .toggle-thumb { transform: translateX(16px); }

.toggle-label { font-weight: 500; }

.seed-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.seed-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

.seed-input:disabled { background: #f5f5f5; color: #999; }
.seed-input:focus { outline: none; border-color: #1890ff; }

.seed-btn {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  font-family: inherit;
}
.seed-btn:hover:not(:disabled) { background: #1890ff; color: #fff; border-color: #1890ff; }
.seed-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.seed-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

.seed-status.locked {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #389e0d;
}

.status-icon { font-size: 14px; }

.seed-info { font-size: 12px; color: #666; }
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.info-row code {
  font-size: 11px;
  padding: 2px 6px;
  background: #fff;
  border-radius: 4px;
}
.info-hint {
  margin-top: 8px;
  font-size: 11px;
  color: #999;
  line-height: 1.5;
}

.current-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(24, 144, 255, 0.2);
}

.stat-row:last-child { border-bottom: none; }

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: #0050b3;
}

.stat-value.mode-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}
.mode-tag.locked { background: #f6ffed; color: #389e0d; }
.mode-tag.auto { background: #fff7e6; color: #d46b08; }
.mode-tag.auto_determ { background: #e6f7ff; color: #0050b3; }

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tip-item {
  padding: 12px 16px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  font-size: 13px;
  color: #614700;
  line-height: 1.6;
}

.tip-item b { color: #ad6800; }

.preset-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.chip-label { font-size: 12px; color: #999; }
.chip-btn {
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.chip-btn:hover { background: #1890ff; color: #fff; border-color: #1890ff; }

.scan-info-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  margin-bottom: 16px;
  align-items: end;
}

.scan-name-input label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}
.scan-name-input input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
}
.scan-name-input input:focus { outline: none; border-color: #1890ff; }

.scan-estimate {
  text-align: center;
  padding: 10px 20px;
  background: #fafafa;
  border-radius: 8px;
}
.estimate-label { font-size: 11px; color: #999; }
.estimate-value {
  font-size: 24px;
  font-weight: 700;
  color: #1890ff;
}
.estimate-value.high { color: #f5222d; }

.scan-configs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.scan-config-card {
  border: 2px solid #f0f0f0;
  border-radius: 10px;
  padding: 12px;
  background: #fafafa;
  transition: all 0.2s;
}

.scan-config-card.enabled {
  border-color: #1890ff;
  background: #fff;
}

.scan-config-card.invalid {
  border-color: #ff4d4f;
}

.sc-head { margin-bottom: 10px; }

.sc-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.sc-toggle input { display: none; }

.sc-toggle-box {
  width: 18px;
  height: 18px;
  border: 2px solid #d9d9d9;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transition: all 0.2s;
}
.sc-toggle input:checked + .sc-toggle-box {
  background: #1890ff;
  border-color: #1890ff;
}
.sc-toggle input:checked + .sc-toggle-box::after {
  content: '✓';
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.sc-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.sc-unit {
  font-size: 11px;
  color: #999;
  font-weight: 400;
  margin-left: 4px;
}

.sc-body.disabled { opacity: 0.5; pointer-events: none; }

.sc-range-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.sc-field label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.sc-field input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  box-sizing: border-box;
}

.sc-range-preview {
  font-size: 11px;
  color: #bbb;
}

.scan-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.scan-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.scan-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.scan-btn.primary {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
}
.scan-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.35);
}
.scan-btn.ghost {
  background: #fff;
  border: 1px solid #d9d9d9;
  color: #666;
}
.scan-btn.ghost:hover:not(:disabled) { background: #f5f5f5; }

.scan-warn {
  padding: 10px 14px;
  background: #fff2e8;
  border: 1px solid #ffbb96;
  border-radius: 6px;
  font-size: 12px;
  color: #ad4e00;
}

.scan-history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scan-history-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px;
  background: #fafafa;
}

.sh-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.sh-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sh-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.sh-meta { font-size: 11px; color: #999; }

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:hover { background: #f5f5f5; }
.icon-btn.danger:hover { background: #fff1f0; }

.sh-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.sh-chip {
  padding: 4px 10px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  font-size: 12px;
  color: #666;
}
.sh-chip b { color: #1890ff; margin-right: 2px; }

.sh-params-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.scan-param-tag {
  padding: 3px 8px;
  background: #e6f7ff;
  border-radius: 4px;
  font-size: 11px;
  color: #0050b3;
}

.sh-results-scroll {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
}

.sh-result-item {
  padding: 10px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.sh-result-item:hover { border-color: #1890ff; transform: translateY(-1px); }
.sh-result-item.selected {
  border-color: #1890ff;
  background: linear-gradient(to right, #e6f7ff, #fff);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.15);
}

.sri-tag {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
  line-height: 1.4;
}

.sri-preds {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  margin-bottom: 6px;
}

.sri-hint {
  font-size: 10px;
  color: #999;
  text-align: center;
  padding-top: 4px;
  border-top: 1px dashed #f0f0f0;
}

.sh-more-hint {
  text-align: center;
  margin-top: 8px;
  font-size: 11px;
  color: #999;
}

.base-select-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.base-label {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.base-select {
  flex: 1;
  max-width: 500px;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
}

.sl-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
}

.text-btn {
  border: none;
  background: transparent;
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  font-family: inherit;
  border-radius: 4px;
}
.text-btn:hover { background: #e6f7ff; }
.text-btn.tiny { font-size: 11px; padding: 2px 6px; }

.sl-group { margin-bottom: 16px; }

.sl-group-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  padding-left: 4px;
  border-left: 2px solid #d9d9d9;
}

.sl-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.compare-item {
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  transition: all 0.2s;
  cursor: pointer;
}

.compare-item:hover { border-color: #d9d9d9; background: #fff; }
.compare-item.selected {
  border-color: #1890ff;
  background: linear-gradient(to right, #e6f7ff 0%, #fff 100%);
}
.compare-item.base {
  border-color: #52c41a;
  background: linear-gradient(to right, #f6ffed 0%, #fff 100%);
}

.ci-main { padding: 10px 12px; }

.ci-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  gap: 6px;
}

.ci-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ci-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}
.ci-badge.base { background: #52c41a; color: #fff; }
.ci-badge.selected { background: #1890ff; color: #fff; }

.ci-sub { font-size: 11px; color: #999; margin-bottom: 4px; }
.ci-meta { font-size: 11px; color: #666; line-height: 1.4; }

.ci-actions {
  padding: 6px 12px;
  border-top: 1px dashed #f0f0f0;
  text-align: right;
}

.empty-hint {
  padding: 24px;
  text-align: center;
  background: #fafafa;
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  color: #999;
}

.diff-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
}

.diff-cards {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.diff-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.dc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap;
  gap: 10px;
}

.dc-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #333;
  flex-wrap: wrap;
}
.dc-base { font-weight: 600; color: #389e0d; }
.dc-arrow { color: #999; font-size: 16px; }
.dc-target { font-weight: 600; color: #0050b3; }

.dc-similarity {
  font-size: 13px;
  font-weight: 500;
  background: #fff;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid #e8e8e8;
}
.dc-similarity b { font-size: 16px; margin: 0 2px; }

.dc-highlight {
  display: flex;
  gap: 10px;
  padding: 10px 16px;
  background: #fffbe6;
  border-bottom: 1px solid #ffe58f;
  flex-wrap: wrap;
}
.hl-chip {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #614700;
}
.hl-chip.micro { background: #fff7e6; }
.hl-chip.pred { background: #e6f7ff; color: #0050b3; }

.dc-sections { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.dcs-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #1890ff;
}

.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.diff-table th {
  background: #fafafa;
  padding: 8px 10px;
  text-align: left;
  font-weight: 500;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
}
.diff-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #f8f8f8;
  color: #555;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 11px;
}
.diff-table tbody tr:hover { background: #fafafa; }

.sig-tag {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  background: #f0f0f0;
  color: #666;
  font-family: inherit;
}

.repro-check-row { display: flex; gap: 10px; flex-wrap: wrap; }

.repro-report-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.repro-report-card {
  border: 1px solid #f0f0f0;
  border-left: 4px solid var(--border-color, #1890ff);
  border-radius: 8px;
  padding: 14px 16px;
  background: #fff;
}

.rr-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 10px;
  flex-wrap: wrap;
}

.rr-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}
.rr-icon { font-size: 14px; }

.rr-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: #999;
}

.rr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px;
  background: #fafafa;
  border-radius: 6px;
}
.rr-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rr-label { font-size: 11px; color: #999; }
.rr-value {
  font-size: 13px;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}
.rr-value.good { color: #52c41a; }
.rr-value.bad { color: #f5222d; }
.rr-value.warn { color: #fa8c16; }

.rr-details-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}
.rr-details-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #666;
  line-height: 1.8;
}

.checksum-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.checksum-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.2fr;
  gap: 12px;
  padding: 10px 14px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  align-items: center;
}
.cr-name { font-size: 13px; font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cr-seed, .cr-checksum {
  font-size: 11px;
  color: #666;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cr-seed code, .cr-checksum code {
  background: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #e8e8e8;
}

@media (max-width: 768px) {
  .seed-grid { grid-template-columns: 1fr; }
  .tabs-header { grid-template-columns: 1fr 1fr; }
  .scan-info-row { grid-template-columns: 1fr; }
  .checksum-row { grid-template-columns: 1fr; gap: 4px; }
}
</style>
