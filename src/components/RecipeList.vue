<script setup lang="ts">
import { ref } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import { FIBER_INFO_LIST, PERFORMANCE_KEYS } from '../types'
import type { Recipe } from '../types'

const emit = defineEmits<{
  (e: 'edit', recipe: Recipe): void
  (e: 'compare'): void
}>()

const store = useRecipeStore()
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const statusClassMap: Record<string, string> = {
  draft: 'status-draft',
  finalized: 'status-finalized',
  verified: 'status-verified'
}

function showMessage(msg: string, type: 'success' | 'error' = 'success') {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

function handleLoad(recipe: Recipe) {
  store.loadRecipe(recipe.id)
  showMessage(`已加载配方：${recipe.name}`)
}

function handleFinalize(recipe: Recipe) {
  const result = store.finalizeRecipe(recipe.id)
  showMessage(result.message || '操作完成', result.success ? 'success' : 'error')
}

function handleVerify(recipe: Recipe) {
  const result = store.verifyRecipe(recipe.id)
  showMessage(result.message || '操作完成', result.success ? 'success' : 'error')
}

function handleDelete(recipe: Recipe) {
  if (confirm(`确定要删除配方「${recipe.name}」吗？`)) {
    store.deleteRecipe(recipe.id)
    showMessage('配方已删除')
  }
}

function handleToggleSelect(recipe: Recipe) {
  store.toggleSelectRecipe(recipe.id)
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}
</script>

<template>
  <div class="recipe-list-panel">
    <div class="panel-header">
      <h3 class="panel-title">历史配方</h3>
      <span class="tip">选择最多3个配方进行对比</span>
    </div>

    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>

    <div class="recipe-list">
      <div
        v-for="recipe in store.recipes"
        :key="recipe.id"
        class="recipe-card"
        :class="{ selected: store.selectedRecipeIds.includes(recipe.id) }"
      >
        <div class="recipe-header">
          <div class="recipe-title">
            <input
              type="checkbox"
              :checked="store.selectedRecipeIds.includes(recipe.id)"
              @change="handleToggleSelect(recipe)"
              class="select-checkbox"
            />
            <span class="recipe-name">{{ recipe.name }}</span>
            <span class="status-badge" :class="statusClassMap[recipe.status]">
              {{ store.getStatusText(recipe.status) }}
            </span>
          </div>
          <span class="recipe-date">{{ formatDate(recipe.updatedAt) }}</span>
        </div>

        <div class="recipe-ratios">
          <div
            v-for="fiber in FIBER_INFO_LIST"
            :key="fiber.key"
            class="ratio-item"
          >
            <span class="ratio-color" :style="{ backgroundColor: fiber.color }"></span>
            <span class="ratio-name">{{ fiber.name }}</span>
            <span class="ratio-value">{{ recipe.fiberRatio[fiber.key].toFixed(1) }}%</span>
          </div>
        </div>

        <div class="recipe-stats">
          <div
            v-for="perf in PERFORMANCE_KEYS.slice(0, 3)"
            :key="perf.key"
            class="stat-item"
          >
            <span class="stat-label">{{ perf.name }}</span>
            <div class="stat-bar">
              <div
                class="stat-fill"
                :style="{ width: recipe.performance[perf.key] + '%' }"
              ></div>
            </div>
            <span class="stat-num">{{ recipe.performance[perf.key].toFixed(0) }}</span>
          </div>
        </div>

        <div v-if="recipe.rating > 0" class="recipe-rating">
          <span class="stars">{{ renderStars(recipe.rating) }}</span>
        </div>

        <div v-if="recipe.conclusion" class="recipe-conclusion">
          <span class="conclusion-label">结论：</span>
          <span class="conclusion-text">{{ recipe.conclusion }}</span>
        </div>

        <div class="recipe-actions">
          <button class="btn btn-small btn-primary" @click="handleLoad(recipe)">
            加载
          </button>
          <button
            v-if="recipe.status === 'draft'"
            class="btn btn-small btn-success"
            @click="handleFinalize(recipe)"
          >
            定版
          </button>
          <button
            v-if="recipe.status === 'finalized'"
            class="btn btn-small btn-warning"
            @click="handleVerify(recipe)"
          >
            验证
          </button>
          <button
            v-if="recipe.status === 'draft'"
            class="btn btn-small btn-danger"
            @click="handleDelete(recipe)"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <div v-if="store.recipes.length === 0" class="empty-state">
      暂无历史配方
    </div>
  </div>
</template>

<style scoped>
.recipe-list-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.tip {
  font-size: 12px;
  color: #999;
}

.message {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 12px;
  flex-shrink: 0;
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

.recipe-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}

.recipe-list::-webkit-scrollbar {
  width: 6px;
}

.recipe-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.recipe-list::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.recipe-card {
  border: 2px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px;
  transition: all 0.2s;
  background: #fafafa;
}

.recipe-card.selected {
  border-color: #1890ff;
  background: #e6f7ff;
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.recipe-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.recipe-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-draft {
  background: #e6f7ff;
  color: #1890ff;
}

.status-finalized {
  background: #fff7e6;
  color: #fa8c16;
}

.status-verified {
  background: #f6ffed;
  color: #52c41a;
}

.recipe-date {
  font-size: 12px;
  color: #999;
}

.recipe-ratios {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.ratio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.ratio-color {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.ratio-name {
  color: #666;
}

.ratio-value {
  color: #333;
  font-weight: 500;
  margin-left: auto;
}

.recipe-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.stat-label {
  width: 48px;
  color: #666;
  flex-shrink: 0;
}

.stat-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  border-radius: 3px;
  transition: width 0.3s;
}

.stat-num {
  width: 28px;
  text-align: right;
  color: #333;
  font-weight: 500;
}

.recipe-rating {
  margin-bottom: 8px;
}

.stars {
  color: #faad14;
  font-size: 14px;
  letter-spacing: 2px;
}

.recipe-conclusion {
  font-size: 12px;
  color: #666;
  margin-bottom: 10px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.conclusion-label {
  color: #999;
}

.conclusion-text {
  color: #555;
}

.recipe-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small {
  padding: 4px 10px;
  font-size: 12px;
}

.btn-primary {
  background: #1890ff;
  color: #fff;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-success {
  background: #52c41a;
  color: #fff;
}

.btn-success:hover {
  background: #73d13d;
}

.btn-warning {
  background: #fa8c16;
  color: #fff;
}

.btn-warning:hover {
  background: #ffa940;
}

.btn-danger {
  background: #ff4d4f;
  color: #fff;
}

.btn-danger:hover {
  background: #ff7875;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}
</style>
