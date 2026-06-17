<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import { FIBER_INFO_LIST, PERFORMANCE_KEYS } from '../types'
import type { Recipe, RecipeStatus } from '../types'

const emit = defineEmits<{
  (e: 'edit', recipe: Recipe): void
  (e: 'compare'): void
}>()

const store = useRecipeStore()
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const searchQuery = ref('')
const filterStatus = ref<RecipeStatus | 'all'>('all')
const sortBy = ref<'date' | 'name' | 'rating' | 'status'>('date')
const sortOrder = ref<'asc' | 'desc'>('desc')
const showAdvancedFilter = ref(false)
const showBatchActions = ref(false)
const showTagModal = ref(false)
const currentRecipeForTag = ref<Recipe | null>(null)
const newTagName = ref('')
const filterTags = ref<string[]>([])
const minRatingFilter = ref(0)
const maxRatingFilter = ref(5)

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

function toggleSort(field: typeof sortBy.value) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
}

const hasSelectedRecipes = computed(() => store.selectedRecipeIds.length > 0)

const filteredRecipes = computed(() => {
  let list = store.recipes.slice()

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.conclusion.toLowerCase().includes(q) ||
      r.tags.some(tag => tag.toLowerCase().includes(q))
    )
  }

  if (filterStatus.value !== 'all') {
    list = list.filter(r => r.status === filterStatus.value)
  }

  if (filterTags.value.length > 0) {
    list = list.filter(r => filterTags.value.some(tag => r.tags.includes(tag)))
  }

  if (minRatingFilter.value > 0) {
    list = list.filter(r => r.rating >= minRatingFilter.value)
  }

  if (maxRatingFilter.value < 5) {
    list = list.filter(r => r.rating <= maxRatingFilter.value)
  }

  const statusOrder: Record<RecipeStatus, number> = { draft: 0, finalized: 1, verified: 2 }

  list.sort((a, b) => {
    let cmp = 0
    switch (sortBy.value) {
      case 'date':
        cmp = b.updatedAt - a.updatedAt
        break
      case 'name':
        cmp = a.name.localeCompare(b.name, 'zh')
        break
      case 'rating':
        cmp = b.rating - a.rating
        break
      case 'status':
        cmp = statusOrder[a.status] - statusOrder[b.status]
        break
    }
    return sortOrder.value === 'desc' ? cmp : -cmp
  })

  return list
})

function openTagModal(recipe: Recipe) {
  currentRecipeForTag.value = recipe
  newTagName.value = ''
  showTagModal.value = true
}

function addTagToCurrentRecipe(tagName: string) {
  if (!currentRecipeForTag.value || !tagName.trim()) return
  const result = store.addTagToRecipe(currentRecipeForTag.value.id, tagName.trim())
  showMessage(result.message, result.success ? 'success' : 'error')
  if (result.success) {
    newTagName.value = ''
  }
}

function removeTagFromRecipe(recipe: Recipe, tagName: string) {
  const result = store.removeTagFromRecipe(recipe.id, tagName)
  showMessage(result.message, result.success ? 'success' : 'error')
}

function toggleFilterTag(tagName: string) {
  const index = filterTags.value.indexOf(tagName)
  if (index === -1) {
    filterTags.value.push(tagName)
  } else {
    filterTags.value.splice(index, 1)
  }
}

function batchAddTag(tagName: string) {
  if (!tagName.trim() || store.selectedRecipeIds.length === 0) return
  const result = store.batchAddTag(store.selectedRecipeIds, tagName.trim())
  showMessage(result.message, result.success ? 'success' : 'error')
}

function batchDelete() {
  if (store.selectedRecipeIds.length === 0) return
  if (!confirm(`确定要删除选中的 ${store.selectedRecipeIds.length} 个配方吗？`)) return
  const result = store.batchDeleteRecipes(store.selectedRecipeIds)
  showMessage(result.message, result.success ? 'success' : 'error')
}

function batchFinalize() {
  if (store.selectedRecipeIds.length === 0) return
  const draftIds = store.selectedRecipeIds.filter(id => {
    const recipe = store.getRecipeById(id)
    return recipe?.status === 'draft'
  })
  if (draftIds.length === 0) {
    showMessage('选中的配方中没有草稿状态的配方', 'error')
    return
  }
  draftIds.forEach(id => store.finalizeRecipe(id))
  showMessage(`已将 ${draftIds.length} 个配方标记为已定版`)
}

function getTagColor(tagName: string): string {
  const tag = store.tags.find(t => t.name === tagName)
  return tag?.color || '#d9d9d9'
}

function resetFilters() {
  filterStatus.value = 'all'
  filterTags.value = []
  minRatingFilter.value = 0
  maxRatingFilter.value = 5
  searchQuery.value = ''
}
</script>

<template>
  <div class="recipe-list-panel">
    <div class="panel-header">
      <h3 class="panel-title">历史配方</h3>
      <div class="header-actions">
        <button class="btn-toggle" @click="showAdvancedFilter = !showAdvancedFilter">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          筛选
        </button>
        <button
          v-if="hasSelectedRecipes"
          class="btn-toggle"
          :class="{ active: showBatchActions }"
          @click="showBatchActions = !showBatchActions"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          批量操作 ({{ store.selectedRecipeIds.length }})
        </button>
      </div>
    </div>

    <div v-if="message" class="message" :class="messageType">
      {{ message }}
    </div>

    <div v-if="showBatchActions && hasSelectedRecipes" class="batch-actions-bar">
      <div class="batch-info">
        已选择 <strong>{{ store.selectedRecipeIds.length }}</strong> 个配方
      </div>
      <div class="batch-buttons">
        <input
          v-model="newTagName"
          type="text"
          class="batch-input"
          placeholder="输入标签名称..."
          @keyup.enter="batchAddTag(newTagName)"
        />
        <button class="btn-batch btn-tag" @click="batchAddTag(newTagName)">
          添加标签
        </button>
        <button class="btn-batch btn-finalize" @click="batchFinalize">
          批量定版
        </button>
        <button class="btn-batch btn-delete" @click="batchDelete">
          批量删除
        </button>
      </div>
    </div>

    <div v-if="showAdvancedFilter" class="advanced-filter-panel">
      <div class="filter-section">
        <span class="filter-section-title">标签筛选</span>
        <div class="tag-filter-list">
          <button
            v-for="tag in store.tags"
            :key="tag.id"
            class="tag-filter-chip"
            :class="{ active: filterTags.includes(tag.name) }"
            :style="{ borderColor: filterTags.includes(tag.name) ? tag.color : '#d9d9d9' }"
            @click="toggleFilterTag(tag.name)"
          >
            <span class="tag-dot" :style="{ backgroundColor: tag.color }"></span>
            {{ tag.name }}
          </button>
        </div>
      </div>
      <div class="filter-section">
        <span class="filter-section-title">评级范围</span>
        <div class="rating-filter">
          <select v-model="minRatingFilter" class="form-select small">
            <option :value="0">不限</option>
            <option v-for="i in 5" :key="i" :value="i">{{ i }}星以上</option>
          </select>
          <span class="filter-sep">至</span>
          <select v-model="maxRatingFilter" class="form-select small">
            <option :value="5">不限</option>
            <option v-for="i in 5" :key="i" :value="i">{{ i }}星以下</option>
          </select>
        </div>
      </div>
      <button class="btn-reset" @click="resetFilters">重置筛选</button>
    </div>

    <div class="search-bar">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="搜索配方名称、结论或标签..."
      />
    </div>

    <div class="filter-row">
      <div class="filter-group">
        <button
          class="filter-chip"
          :class="{ active: filterStatus === 'all' }"
          @click="filterStatus = 'all'"
        >全部</button>
        <button
          class="filter-chip"
          :class="{ active: filterStatus === 'draft' }"
          @click="filterStatus = 'draft'"
        >草稿</button>
        <button
          class="filter-chip"
          :class="{ active: filterStatus === 'finalized' }"
          @click="filterStatus = 'finalized'"
        >已定版</button>
        <button
          class="filter-chip"
          :class="{ active: filterStatus === 'verified' }"
          @click="filterStatus = 'verified'"
        >已验证</button>
      </div>
      <div class="sort-group">
        <button
          v-for="field in (['date', 'name', 'rating', 'status'] as const)"
          :key="field"
          class="sort-btn"
          :class="{ active: sortBy === field }"
          @click="toggleSort(field)"
        >
          {{ { date: '时间', name: '名称', rating: '评级', status: '状态' }[field] }}
          <span v-if="sortBy === field" class="sort-arrow">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
        </button>
      </div>
    </div>

    <div class="recipe-count">
      共 {{ filteredRecipes.length }} 个配方
      <span v-if="filterTags.length > 0" class="active-filter-info">
        · 已选标签: {{ filterTags.join(', ') }}
      </span>
    </div>

    <div class="recipe-list">
      <div
        v-for="recipe in filteredRecipes"
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

        <div class="recipe-tags">
          <span
            v-for="tag in recipe.tags"
            :key="tag"
            class="recipe-tag"
            :style="{ backgroundColor: getTagColor(tag) + '20', color: getTagColor(tag), borderColor: getTagColor(tag) }"
          >
            {{ tag }}
            <button
              class="tag-remove"
              @click.stop="removeTagFromRecipe(recipe, tag)"
              title="移除标签"
            >×</button>
          </span>
          <button class="add-tag-btn" @click.stop="openTagModal(recipe)" title="添加标签">
            + 标签
          </button>
        </div>

        <div class="recipe-meta">
          <div v-if="recipe.rating > 0" class="recipe-rating">
            <span class="stars">{{ renderStars(recipe.rating) }}</span>
          </div>
          <span v-if="recipe.versions.length > 1" class="version-count">
            {{ recipe.versions.length }}个版本
          </span>
          <span v-if="recipe.experimentRecordIds.length > 0" class="exp-count">
            {{ recipe.experimentRecordIds.length }}条实验
          </span>
          <span v-if="recipe.researchNoteIds.length > 0" class="note-count">
            {{ recipe.researchNoteIds.length }}条笔记
          </span>
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

    <div v-if="filteredRecipes.length === 0 && store.recipes.length > 0" class="empty-state">
      没有匹配的配方
    </div>
    <div v-if="store.recipes.length === 0" class="empty-state">
      暂无历史配方
    </div>

    <div v-if="showTagModal && currentRecipeForTag" class="modal-overlay" @click.self="showTagModal = false">
      <div class="modal-content">
        <h4 class="modal-title">管理标签 - {{ currentRecipeForTag.name }}</h4>
        <div class="modal-section">
          <span class="modal-label">当前标签</span>
          <div class="current-tags">
            <span v-if="currentRecipeForTag.tags.length === 0" class="no-tags">暂无标签</span>
            <span
              v-for="tag in currentRecipeForTag.tags"
              :key="tag"
              class="recipe-tag"
              :style="{ backgroundColor: getTagColor(tag) + '20', color: getTagColor(tag), borderColor: getTagColor(tag) }"
            >
              {{ tag }}
              <button
                class="tag-remove"
                @click="removeTagFromRecipe(currentRecipeForTag!, tag)"
              >×</button>
            </span>
          </div>
        </div>
        <div class="modal-section">
          <span class="modal-label">快速添加</span>
          <div class="quick-tags">
            <button
              v-for="tag in store.tags.filter(t => !currentRecipeForTag!.tags.includes(t.name))"
              :key="tag.id"
              class="quick-tag-btn"
              :style="{ borderColor: tag.color, color: tag.color }"
              @click="addTagToCurrentRecipe(tag.name)"
            >
              + {{ tag.name }}
            </button>
          </div>
        </div>
        <div class="modal-section">
          <span class="modal-label">新建标签</span>
          <div class="new-tag-input">
            <input
              v-model="newTagName"
              type="text"
              class="form-input"
              placeholder="输入新标签名称..."
              @keyup.enter="addTagToCurrentRecipe(newTagName)"
            />
            <button class="btn btn-primary" @click="addTagToCurrentRecipe(newTagName)">添加</button>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-default" @click="showTagModal = false">完成</button>
        </div>
      </div>
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

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
  transition: border-color 0.2s;
  flex-shrink: 0;
}

.search-bar:focus-within {
  border-color: #1890ff;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.15);
}

.search-icon {
  width: 16px;
  height: 16px;
  color: #999;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  outline: none;
  color: #333;
}

.search-input::placeholder {
  color: #bfbfbf;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-group {
  display: flex;
  gap: 4px;
}

.filter-chip {
  padding: 3px 10px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  background: #fff;
  color: #666;
  transition: all 0.2s;
  font-family: inherit;
}

.filter-chip.active {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.filter-chip:hover:not(.active) {
  border-color: #1890ff;
  color: #1890ff;
}

.sort-group {
  display: flex;
  gap: 2px;
}

.sort-btn {
  padding: 3px 8px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  background: transparent;
  color: #999;
  transition: all 0.2s;
  font-family: inherit;
}

.sort-btn.active {
  color: #1890ff;
  font-weight: 600;
}

.sort-btn:hover:not(.active) {
  color: #666;
}

.sort-arrow {
  font-size: 10px;
}

.recipe-count {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  flex-shrink: 0;
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

.recipe-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.recipe-rating {
  margin: 0;
}

.stars {
  color: #faad14;
  font-size: 14px;
  letter-spacing: 2px;
}

.version-count {
  font-size: 11px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 1px 6px;
  border-radius: 3px;
}

.exp-count {
  font-size: 11px;
  color: #52c41a;
  background: #f6ffed;
  padding: 1px 6px;
  border-radius: 3px;
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

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-toggle:hover,
.btn-toggle.active {
  background: #e6f7ff;
  color: #1890ff;
  border-color: #1890ff;
}

.batch-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 8px;
  margin-bottom: 12px;
}

.batch-info {
  font-size: 13px;
  color: #1890ff;
  font-weight: 500;
}

.batch-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.batch-input {
  padding: 4px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 12px;
  width: 120px;
  font-family: inherit;
}

.batch-input:focus {
  outline: none;
  border-color: #1890ff;
}

.btn-batch {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-tag {
  background: #722ed1;
  color: #fff;
}

.btn-tag:hover {
  background: #9254de;
}

.btn-finalize {
  background: #fa8c16;
  color: #fff;
}

.btn-finalize:hover {
  background: #ffa940;
}

.btn-delete {
  background: #ff4d4f;
  color: #fff;
}

.btn-delete:hover {
  background: #ff7875;
}

.advanced-filter-panel {
  padding: 16px;
  background: #fafafa;
  border-radius: 10px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.filter-section {
  margin-bottom: 12px;
}

.filter-section:last-of-type {
  margin-bottom: 0;
}

.filter-section-title {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

.tag-filter-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-filter-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.tag-filter-chip:hover {
  border-color: #1890ff;
}

.tag-filter-chip.active {
  background: #e6f7ff;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.rating-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-select.small {
  padding: 4px 8px;
  font-size: 12px;
}

.filter-sep {
  font-size: 12px;
  color: #999;
}

.btn-reset {
  margin-top: 12px;
  padding: 4px 12px;
  background: #fff;
  color: #666;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-reset:hover {
  color: #ff4d4f;
  border-color: #ff4d4f;
}

.active-filter-info {
  margin-left: 8px;
  color: #1890ff;
  font-size: 11px;
}

.recipe-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.recipe-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.tag-remove {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
  padding: 0;
}

.tag-remove:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.5);
}

.add-tag-btn {
  padding: 2px 8px;
  background: #f5f5f5;
  color: #999;
  border: 1px dashed #d9d9d9;
  border-radius: 10px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.add-tag-btn:hover {
  color: #1890ff;
  border-color: #1890ff;
  background: #e6f7ff;
}

.note-count {
  font-size: 11px;
  color: #722ed1;
  background: #f9f0ff;
  padding: 1px 6px;
  border-radius: 3px;
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
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.modal-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.modal-section {
  margin-bottom: 16px;
}

.modal-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

.current-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 28px;
}

.no-tags {
  font-size: 12px;
  color: #999;
}

.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-tag-btn {
  padding: 3px 10px;
  background: #fff;
  border: 1px solid;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.quick-tag-btn:hover {
  background: currentColor;
  color: #fff;
}

.new-tag-input {
  display: flex;
  gap: 8px;
}

.form-input {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn-default {
  padding: 6px 16px;
  background: #fff;
  color: #666;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-default:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.form-select {
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  font-family: inherit;
}

.form-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.tip {
  font-size: 12px;
  color: #999;
}
</style>
