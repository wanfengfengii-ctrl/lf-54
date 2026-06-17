<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import type { ResearchNote } from '../types'

const store = useRecipeStore()

const showAddModal = ref(false)
const selectedRecipeId = ref<string | null>(null)
const editingNote = ref<Partial<ResearchNote>>({
  title: '',
  content: '',
  tags: [] as string[],
  category: 'observation'
})
const showDetailModal = ref(false)
const detailNote = ref<ResearchNote | null>(null)
const filterCategory = ref<string>('all')
const filterTag = ref<string>('')

const targetRecipe = computed(() => {
  if (selectedRecipeId.value) {
    return store.getRecipeById(selectedRecipeId.value)
  }
  return store.loadedRecipe
})

const recipeNotes = computed(() => {
  if (!targetRecipe.value) return []
  return store.getResearchNotesForRecipe(targetRecipe.value.id)
    .sort((a, b) => b.updatedAt - a.updatedAt)
})

const allNotes = computed(() => {
  return store.researchNotes.sort((a, b) => b.updatedAt - a.updatedAt)
})

const displayedNotes = computed(() => {
  let notes = targetRecipe.value ? recipeNotes.value : allNotes.value
  if (filterCategory.value !== 'all') {
    notes = notes.filter(n => n.category === filterCategory.value)
  }
  if (filterTag.value) {
    notes = notes.filter(n => n.tags?.includes(filterTag.value))
  }
  return notes
})

const allTags = computed(() => {
  const tagSet = new Set<string>()
  store.researchNotes.forEach(n => n.tags?.forEach(t => tagSet.add(t)))
  return Array.from(tagSet)
})

const categories = [
  { key: 'all', name: '全部' },
  { key: 'observation', name: '实验观察' },
  { key: 'analysis', name: '数据分析' },
  { key: 'conclusion', name: '研究结论' },
  { key: 'idea', name: '灵感想法' },
  { key: 'reference', name: '参考资料' }
]

function openAddModal() {
  editingNote.value = {
    title: '',
    content: '',
    tags: [],
    category: 'observation'
  }
  showAddModal.value = true
}

function openEditModal(note: ResearchNote) {
  editingNote.value = { ...note }
  showAddModal.value = true
}

function toggleTag(tag: string) {
  if (!editingNote.value.tags) {
    editingNote.value.tags = []
  }
  const idx = editingNote.value.tags.indexOf(tag)
  if (idx > -1) {
    editingNote.value.tags.splice(idx, 1)
  } else {
    editingNote.value.tags.push(tag)
  }
}

function submitNote() {
  if (!editingNote.value.title || !editingNote.value.content) return
  if (!targetRecipe.value) return

  if (editingNote.value.id) {
    store.updateResearchNote(editingNote.value.id, {
      title: editingNote.value.title,
      content: editingNote.value.content,
      category: editingNote.value.category,
      tags: editingNote.value.tags
    })
  } else {
    store.addResearchNote(targetRecipe.value.id, {
      title: editingNote.value.title,
      content: editingNote.value.content,
      category: editingNote.value.category as any,
      tags: editingNote.value.tags
    })
  }
  showAddModal.value = false
}

function deleteNote(noteId: string) {
  if (confirm('确定要删除这条研究笔记吗？')) {
    store.deleteResearchNote(noteId)
    if (detailNote.value?.id === noteId) {
      showDetailModal.value = false
      detailNote.value = null
    }
  }
}

function viewDetail(note: ResearchNote) {
  detailNote.value = note
  showDetailModal.value = true
}

function getCategoryName(category: string): string {
  const cat = categories.find(c => c.key === category)
  return cat ? cat.name : category
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    observation: '#1890ff',
    analysis: '#722ed1',
    conclusion: '#52c41a',
    idea: '#faad14',
    reference: '#13c2c2'
  }
  return colors[category] || '#8c8c8c'
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getRecipeName(recipeId: string): string {
  const recipe = store.getRecipeById(recipeId)
  return recipe ? recipe.name : '未知配方'
}

const wordCount = computed(() => {
  return displayedNotes.value.reduce((sum, n) => sum + n.content.length, 0)
})
</script>

<template>
  <div class="notes-panel">
    <div class="panel-header">
      <h3 class="panel-title">实验复盘与研究笔记</h3>
      <button
        class="btn btn-primary btn-small"
        @click="openAddModal"
        :disabled="!targetRecipe"
      >+ 新增笔记</button>
    </div>

    <div v-if="!targetRecipe" class="tip-bar">
      💡 请先选择或加载一个配方来管理研究笔记
    </div>

    <div v-if="targetRecipe" class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ displayedNotes.length }}</span>
        <span class="stat-label">笔记数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ wordCount }}</span>
        <span class="stat-label">总字数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ allTags.length }}</span>
        <span class="stat-label">标签数</span>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="filter-btn"
          :class="{ active: filterCategory === cat.key }"
          @click="filterCategory = cat.key"
        >{{ cat.name }}</button>
      </div>
      <select v-model="filterTag" class="filter-select">
        <option value="">全部标签</option>
        <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
      </select>
    </div>

    <div v-if="displayedNotes.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 64 64" fill="none">
        <rect x="14" y="8" width="36" height="48" rx="4" stroke="#d9d9d9" stroke-width="2"/>
        <path d="M22 22H42M22 32H42M22 42H34" stroke="#d9d9d9" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p class="empty-text">暂无研究笔记</p>
      <p class="empty-sub">记录实验观察、数据分析和研究灵感</p>
    </div>

    <div v-else class="notes-list">
      <div
        v-for="note in displayedNotes"
        :key="note.id"
        class="note-card"
        @click="viewDetail(note)"
      >
        <div class="note-header">
          <span
            class="note-category"
            :style="{ backgroundColor: getCategoryColor(note.category) + '20', color: getCategoryColor(note.category) }"
          >{{ getCategoryName(note.category) }}</span>
          <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
        </div>
        <h4 class="note-title">{{ note.title }}</h4>
        <p class="note-excerpt">{{ note.content.substring(0, 100) }}{{ note.content.length > 100 ? '...' : '' }}</p>
        <div class="note-footer">
          <div v-if="note.tags && note.tags.length > 0" class="note-tags">
            <span v-for="tag in note.tags" :key="tag" class="note-tag">#{{ tag }}</span>
          </div>
          <div class="note-actions" @click.stop>
            <button class="btn-link" @click="openEditModal(note)">编辑</button>
            <button class="btn-link btn-link-danger" @click="deleteNote(note.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal && targetRecipe" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <h4 class="modal-title">{{ editingNote.id ? '编辑笔记' : '新增笔记' }}</h4>
        <div class="form-group">
          <label class="form-label">关联配方</label>
          <div class="form-value">{{ targetRecipe.name }}</div>
        </div>
        <div class="form-group">
          <label class="form-label">分类</label>
          <select v-model="editingNote.category" class="form-select">
            <option v-for="cat in categories.filter(c => c.key !== 'all')" :key="cat.key" :value="cat.key">
              {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">标题</label>
          <input
            v-model="editingNote.title"
            type="text"
            class="form-input"
            placeholder="笔记标题..."
          />
        </div>
        <div class="form-group">
          <label class="form-label">标签</label>
          <div class="tag-selector">
            <button
              v-for="tag in allTags"
              :key="tag"
              class="tag-chip"
              :class="{ active: editingNote.tags?.includes(tag) }"
              @click="toggleTag(tag)"
              type="button"
            >
              {{ tag }}
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea
            v-model="editingNote.content"
            class="form-textarea"
            rows="8"
            placeholder="记录你的观察、分析、想法..."
          ></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-default" @click="showAddModal = false">取消</button>
          <button
            class="btn btn-primary"
            @click="submitNote"
            :disabled="!editingNote.title || !editingNote.content"
          >保存</button>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal && detailNote" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-content detail-modal">
        <div class="detail-header">
          <span
            class="note-category"
            :style="{ backgroundColor: getCategoryColor(detailNote.category) + '20', color: getCategoryColor(detailNote.category) }"
          >{{ getCategoryName(detailNote.category) }}</span>
          <span class="detail-recipe">{{ getRecipeName(detailNote.recipeId) }}</span>
        </div>
        <h3 class="detail-title">{{ detailNote.title }}</h3>
        <div class="detail-meta">
          <span>创建: {{ formatDate(detailNote.createdAt) }}</span>
          <span v-if="detailNote.updatedAt > detailNote.createdAt">更新: {{ formatDate(detailNote.updatedAt) }}</span>
        </div>
        <div v-if="detailNote.tags && detailNote.tags.length > 0" class="detail-tags">
          <span v-for="tag in detailNote.tags" :key="tag" class="detail-tag">#{{ tag }}</span>
        </div>
        <div class="detail-content">{{ detailNote.content }}</div>
        <div class="modal-actions">
          <button class="btn btn-default" @click="showDetailModal = false; openEditModal(detailNote)">编辑</button>
          <button class="btn btn-default" @click="showDetailModal = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notes-panel {
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

.tip-bar {
  padding: 10px 14px;
  background: #fffbe6;
  color: #d48806;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

.stats-bar {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 2px;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 2px;
}

.filter-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
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

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.note-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.note-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.note-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.note-category {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.note-date {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}

.note-title {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.note-excerpt {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

.note-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.note-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.note-tag {
  font-size: 11px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 1px 6px;
  border-radius: 3px;
}

.note-actions {
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
  max-width: 560px;
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

.form-group {
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-value {
  font-size: 13px;
  color: #333;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.form-input,
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

.form-input:focus,
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.detail-modal {
  max-width: 600px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.detail-recipe {
  font-size: 12px;
  color: #999;
}

.detail-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.detail-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.detail-tag {
  font-size: 12px;
  color: #1890ff;
  background: #e6f7ff;
  padding: 3px 10px;
  border-radius: 4px;
}

.detail-content {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
}
</style>
