<script setup lang="ts">
import { ref } from 'vue'
import { useRecipeStore } from '../stores/recipe'

const store = useRecipeStore()

const message = ref('')
const messageType = ref<'success' | 'error'>('success')
const importText = ref('')
const showImportModal = ref(false)

function showMessage(msg: string, type: 'success' | 'error' = 'success') {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

function handleSave() {
  const result = store.saveAsNewVersion()
  showMessage(result.message, result.success ? 'success' : 'error')
}

function setRating(rating: number) {
  store.currentRating = store.currentRating === rating ? 0 : rating
}

function handleImport() {
  showImportModal.value = true
  importText.value = ''
}

function confirmImport() {
  try {
    const data = JSON.parse(importText.value)
    if (!data.fiberRatio) {
      showMessage('导入失败：缺少 fiberRatio 数据', 'error')
      return
    }
    const result = store.importRecipe(data)
    showMessage(result.message, result.success ? 'success' : 'error')
    if (result.success) {
      showImportModal.value = false
    }
  } catch (e) {
    showMessage('导入失败：JSON 格式错误', 'error')
  }
}

function handleExport() {
  const data = {
    name: store.currentName,
    fiberRatio: store.currentRatio,
    performance: store.currentPerformance,
    conclusion: store.currentConclusion,
    rating: store.currentRating
  }
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.currentName || '配方'}.json`
  a.click()
  URL.revokeObjectURL(url)
  showMessage('配方已导出')
}
</script>

<template>
  <div class="recipe-manager-panel">
    <h3 class="panel-title">配方管理</h3>

    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>

    <div class="form-group">
      <label class="form-label">配方名称</label>
      <input
        v-model="store.currentName"
        type="text"
        class="form-input"
        placeholder="请输入配方名称"
      />
    </div>

    <div class="form-group">
      <label class="form-label">实验结论</label>
      <textarea
        v-model="store.currentConclusion"
        class="form-textarea"
        placeholder="记录实验结论和观察结果..."
        rows="4"
      ></textarea>
    </div>

    <div class="form-group">
      <label class="form-label">评级</label>
      <div class="rating-stars">
        <span
          v-for="i in 5"
          :key="i"
          class="star"
          :class="{ active: i <= store.currentRating }"
          @click="setRating(i)"
        >
          ★
        </span>
        <span class="rating-text" v-if="store.currentRating > 0">
          {{ store.currentRating }}星
        </span>
      </div>
    </div>

    <div class="action-buttons">
      <button class="btn btn-primary btn-block" @click="handleSave" :disabled="!store.isRatioValid">
        保存为新版本
      </button>
      <div class="btn-row">
        <button class="btn btn-default" @click="handleImport">
          导入配方
        </button>
        <button class="btn btn-default" @click="handleExport">
          导出配方
        </button>
      </div>
    </div>

    <div class="performance-summary">
      <h4 class="summary-title">性能预估</h4>
      <div class="perf-grid">
        <div class="perf-item">
          <div class="perf-icon strength">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z"/>
            </svg>
          </div>
          <div class="perf-info">
            <span class="perf-label">强度</span>
            <span class="perf-value">{{ store.currentPerformance.strength.toFixed(1) }}</span>
          </div>
        </div>
        <div class="perf-item">
          <div class="perf-icon absorption">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C12 2 6 10 6 15C6 18.31 8.69 21 12 21C15.31 21 18 18.31 18 15C18 10 12 2 12 2Z"/>
            </svg>
          </div>
          <div class="perf-info">
            <span class="perf-label">吸水性</span>
            <span class="perf-value">{{ store.currentPerformance.waterAbsorption.toFixed(1) }}</span>
          </div>
        </div>
        <div class="perf-item">
          <div class="perf-icon texture">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 12H21M3 6H21M3 18H21"/>
            </svg>
          </div>
          <div class="perf-info">
            <span class="perf-label">纹理表现</span>
            <span class="perf-value">{{ store.currentPerformance.texture.toFixed(1) }}</span>
          </div>
        </div>
        <div class="perf-item">
          <div class="perf-icon durability">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z"/>
            </svg>
          </div>
          <div class="perf-info">
            <span class="perf-label">耐久性</span>
            <span class="perf-value">{{ store.currentPerformance.durability.toFixed(1) }}</span>
          </div>
        </div>
        <div class="perf-item">
          <div class="perf-icon whiteness">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"/>
            </svg>
          </div>
          <div class="perf-info">
            <span class="perf-label">白度</span>
            <span class="perf-value">{{ store.currentPerformance.whiteness.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-content">
        <h4 class="modal-title">导入配方</h4>
        <p class="modal-tip">粘贴 JSON 格式的配方数据：</p>
        <textarea
          v-model="importText"
          class="form-textarea"
          rows="8"
          placeholder='{"name":"配方名","fiberRatio":{"chuPi":40,"hemp":30,"bamboo":20,"straw":10}}'
        ></textarea>
        <div class="modal-actions">
          <button class="btn btn-default" @click="showImportModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmImport">确认导入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recipe-manager-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.panel-title {
  margin: 0 0 16px 0;
  font-size: 18px;
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

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
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
  align-items: center;
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

.rating-text {
  margin-left: 8px;
  font-size: 14px;
  color: #666;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-block {
  width: 100%;
}

.btn-row {
  display: flex;
  gap: 10px;
}

.btn-row .btn {
  flex: 1;
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

.performance-summary {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.summary-title {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.perf-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 10px;
}

.perf-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 8px;
}

.perf-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
}

.perf-icon svg {
  width: 20px;
  height: 20px;
}

.perf-icon.strength {
  background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
}

.perf-icon.absorption {
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
}

.perf-icon.texture {
  background: linear-gradient(135deg, #a8e063, #56ab2f);
}

.perf-icon.durability {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.perf-icon.whiteness {
  background: linear-gradient(135deg, #f7971e, #ffd200);
}

.perf-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.perf-label {
  font-size: 13px;
  color: #666;
}

.perf-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
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
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.modal-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.modal-tip {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #999;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
</style>
