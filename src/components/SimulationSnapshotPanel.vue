<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import { PREDICTION_KEYS, FIBER_INFO_LIST } from '../types'
import type { SimulationSnapshot } from '../types'

const store = useRecipeStore()
const snapshotNote = ref('')
const showSaveModal = ref(false)

const snapshots = computed(() => store.simulationSnapshots)
const selectedIds = computed(() => store.selectedSnapshotIds)

function openSaveModal() {
  snapshotNote.value = ''
  showSaveModal.value = true
}

function handleSave() {
  store.saveSimulationSnapshot(snapshotNote.value)
  showSaveModal.value = false
  snapshotNote.value = ''
}

function handleLoad(snapshot: SimulationSnapshot) {
  if (confirm(`确定要加载此快照吗？当前的参数设置将被覆盖。\n\n快照：${snapshot.note || new Date(snapshot.createdAt).toLocaleString()}`)) {
    store.loadSimulationSnapshot(snapshot.id)
  }
}

function handleDelete(snapshot: SimulationSnapshot, event: Event) {
  event.stopPropagation()
  if (confirm(`确定要删除此快照吗？\n\n快照：${snapshot.note || new Date(snapshot.createdAt).toLocaleString()}`)) {
    store.deleteSimulationSnapshot(snapshot.id)
  }
}

function handleToggleSelect(snapshotId: string, event: Event) {
  event.stopPropagation()
  store.toggleSelectSnapshot(snapshotId)
}

function clearSelection() {
  store.clearSelectedSnapshots()
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getFiberSummary(ratio: any): string {
  const parts: string[] = []
  FIBER_INFO_LIST.forEach(f => {
    if (ratio[f.key] > 0) {
      parts.push(`${f.name}${ratio[f.key].toFixed(0)}%`)
    }
  })
  return parts.join(' · ')
}
</script>

<template>
  <div class="snapshot-panel">
    <div class="panel-header">
      <h3 class="panel-title">📸 模拟快照管理</h3>
      <div class="header-actions">
        <button
          v-if="selectedIds.length > 0"
          class="action-btn secondary"
          @click="clearSelection"
        >
          清除对比 ({{ selectedIds.length }}/3)
        </button>
        <button class="action-btn primary" @click="openSaveModal">
          + 保存当前模拟
        </button>
      </div>
    </div>
    
    <div class="selection-tip" v-if="selectedIds.length > 0">
      <span class="tip-icon">💡</span>
      <span class="tip-text">
        已选择 {{ selectedIds.length }} 个快照用于对比分析。在上方的雷达图和孔隙分布图中可查看对比结果。
      </span>
    </div>
    
    <div class="snapshot-list" v-if="snapshots.length > 0">
      <div
        v-for="snapshot in snapshots"
        :key="snapshot.id"
        class="snapshot-card"
        :class="{ selected: selectedIds.includes(snapshot.id) }"
      >
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-title">
              {{ snapshot.note || '未命名快照' }}
            </span>
            <span class="card-time">{{ formatDate(snapshot.createdAt) }}</span>
          </div>
          <div class="card-actions">
            <button
              class="icon-btn"
              :class="{ active: selectedIds.includes(snapshot.id) }"
              @click="handleToggleSelect(snapshot.id, $event)"
              :title="selectedIds.includes(snapshot.id) ? '取消对比' : '加入对比'"
            >
              {{ selectedIds.includes(snapshot.id) ? '📊' : '📈' }}
            </button>
            <button
              class="icon-btn"
              @click="handleLoad(snapshot)"
              title="加载此快照"
            >
              ↩️
            </button>
            <button
              class="icon-btn delete"
              @click="handleDelete(snapshot, $event)"
              title="删除此快照"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div class="card-body">
          <div class="fiber-summary">
            <span class="summary-label">配方：</span>
            <span class="summary-value">{{ getFiberSummary(snapshot.fiberRatio) }}</span>
          </div>
          
          <div class="params-summary">
            <span class="param-chip">
              打浆 {{ snapshot.params.beatingDegree }}°SR
            </span>
            <span class="param-chip">
              厚度 {{ snapshot.params.sheetThickness }}μm
            </span>
            <span class="param-chip">
              压榨 {{ snapshot.params.pressingIntensity }}MPa
            </span>
          </div>
          
          <div class="prediction-preview">
            <div
              v-for="key in PREDICTION_KEYS.slice(0, 3)"
              :key="key.key"
              class="pred-chip"
              :style="{ borderColor: key.color, color: key.color }"
            >
              <span class="chip-label">{{ key.name }}</span>
              <span class="chip-value">
                {{ snapshot.prediction[key.key].toFixed(key.key === 'durability' ? 0 : 1) }}
                <span class="chip-unit">{{ key.unit }}</span>
              </span>
            </div>
          </div>
        </div>
        
        <div class="card-footer">
          <div class="micro-summary">
            <span>交织 {{ snapshot.microstructure.fiberInterweaving.toFixed(0) }}</span>
            <span>层数 {{ snapshot.microstructure.layerCount }}</span>
            <span>孔径 {{ snapshot.microstructure.poreSize.toFixed(1) }}μm</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else>
      <div class="empty-icon">📷</div>
      <div class="empty-title">暂无快照</div>
      <div class="empty-desc">
        保存当前的模拟参数和预测结果，便于后续对比分析和实验复盘。
      </div>
      <button class="empty-btn" @click="openSaveModal">
        + 保存第一个快照
      </button>
    </div>
    
    <div v-if="showSaveModal" class="modal-overlay" @click.self="showSaveModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h4 class="modal-title">保存模拟快照</h4>
          <button class="modal-close" @click="showSaveModal = false">×</button>
        </div>
        <div class="modal-body">
          <label class="form-label">快照备注（可选）</label>
          <input
            v-model="snapshotNote"
            type="text"
            class="form-input"
            placeholder="例如：高打浆度实验、优化配方方案A..."
            maxlength="50"
          />
          <div class="preview-section">
            <div class="preview-title">将保存以下内容：</div>
            <div class="preview-list">
              <div class="preview-item">
                <span class="preview-icon">🧪</span>
                <span>纤维配比参数</span>
              </div>
              <div class="preview-item">
                <span class="preview-icon">⚙️</span>
                <span>工艺参数设置</span>
              </div>
              <div class="preview-item">
                <span class="preview-icon">🔬</span>
                <span>微观结构模拟结果</span>
              </div>
              <div class="preview-item">
                <span class="preview-icon">📊</span>
                <span>性能指标预测</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="showSaveModal = false">取消</button>
          <button class="modal-btn confirm" @click="handleSave">保存快照</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.snapshot-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.action-btn.primary {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}

.action-btn.secondary {
  background: #fff7e6;
  color: #d46b08;
  border: 1px solid #ffd591;
}

.action-btn.secondary:hover {
  background: #ffe7ba;
}

.selection-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 12px;
  color: #0050b3;
  line-height: 1.5;
}

.tip-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.snapshot-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
  flex: 1;
}

.snapshot-list::-webkit-scrollbar {
  width: 6px;
}

.snapshot-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.snapshot-list::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.snapshot-card {
  border: 2px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px;
  transition: all 0.2s;
  cursor: pointer;
  background: #fafafa;
}

.snapshot-card:hover {
  border-color: #d9d9d9;
  background: #fff;
  transform: translateX(4px);
}

.snapshot-card.selected {
  border-color: #1890ff;
  background: linear-gradient(to right, #e6f7ff 0%, #fff 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.card-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-time {
  font-size: 11px;
  color: #999;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: #e6f7ff;
}

.icon-btn.active {
  background: #1890ff;
}

.icon-btn.delete:hover {
  background: #fff1f0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fiber-summary {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.summary-label {
  color: #999;
}

.summary-value {
  color: #333;
  font-weight: 500;
}

.params-summary {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.param-chip {
  padding: 3px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 11px;
  color: #666;
}

.prediction-preview {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pred-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.chip-label {
  opacity: 0.8;
}

.chip-value {
  font-weight: 700;
}

.chip-unit {
  font-weight: 400;
  opacity: 0.7;
  font-size: 10px;
}

.card-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e8e8e8;
}

.micro-summary {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: #999;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  color: #999;
  margin-bottom: 20px;
  max-width: 300px;
  line-height: 1.6;
}

.empty-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.empty-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(24, 144, 255, 0.35);
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
  width: 90%;
  max-width: 420px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f5f5f5;
  color: #333;
}

.modal-body {
  padding: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.preview-section {
  margin-top: 20px;
}

.preview-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
}

.preview-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #fafafa;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
}

.preview-icon {
  font-size: 14px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  justify-content: flex-end;
}

.modal-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.modal-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.modal-btn.cancel:hover {
  background: #e8e8e8;
}

.modal-btn.confirm {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
}

.modal-btn.confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
}
</style>
