<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import { FIBER_INFO_LIST, FIBER_DESCRIPTIONS, PERFORMANCE_KEYS } from '../types'
import type { RecipeRecommendation } from '../types'

const store = useRecipeStore()

const activeTab = ref<'knowledge' | 'recommendations'>('knowledge')
const selectedFiber = ref<string | null>(null)

const fiberKnowledge = computed(() => {
  return FIBER_INFO_LIST.map(fiber => ({
    ...fiber,
    relatedRecipes: store.recipes.filter(r => r.fiberRatio[fiber.key] > 0).length,
    avgPerformance: computeFiberAvgPerformance(fiber.key)
  }))
})

function computeFiberAvgPerformance(fiberKey: string) {
  const recipes = store.recipes.filter(r => r.fiberRatio[fiberKey] > 0)
  if (recipes.length === 0) return null
  const avg: Record<string, number> = {}
  for (const perf of PERFORMANCE_KEYS) {
    avg[perf.key] = recipes.reduce((sum, r) => sum + r.performance[perf.key], 0) / recipes.length
  }
  return avg
}

const selectedFiberInfo = computed(() => {
  if (!selectedFiber.value) return null
  return fiberKnowledge.value.find(f => f.key === selectedFiber.value) || null
})

const recommendations = computed(() => {
  return store.recipeRecommendations
})

function applyRecommendation(rec: RecipeRecommendation) {
  store.applyRecommendation(rec)
}

function getStrengthColor(value: number): string {
  if (value >= 75) return '#52c41a'
  if (value >= 50) return '#faad14'
  if (value >= 25) return '#fa8c16'
  return '#8c8c8c'
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const topRatedRecipes = computed(() => {
  return [...store.recipes]
    .filter(r => r.ratingDetail.overall > 0)
    .sort((a, b) => b.ratingDetail.overall - a.ratingDetail.overall)
    .slice(0, 5)
})

const mostExperimented = computed(() => {
  return [...store.recipes]
    .filter(r => r.experimentRecordIds.length > 0)
    .sort((a, b) => b.experimentRecordIds.length - a.experimentRecordIds.length)
    .slice(0, 5)
})

const fiberCorrelation = computed(() => {
  const correlations: Array<{ fiberKey: string; perfKey: string; correlation: number }> = []
  for (const fiber of FIBER_INFO_LIST) {
    for (const perf of PERFORMANCE_KEYS) {
      const recipes = store.recipes.filter(r => r.fiberRatio[fiber.key] > 0)
      if (recipes.length < 3) continue
      let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0
      const n = recipes.length
      for (const r of recipes) {
        const x = r.fiberRatio[fiber.key]
        const y = r.performance[perf.key]
        sumXY += x * y
        sumX += x
        sumY += y
        sumX2 += x * x
        sumY2 += y * y
      }
      const corr = (n * sumXY - sumX * sumY) /
        Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
      if (!isNaN(corr) && Math.abs(corr) > 0.3) {
        correlations.push({ fiberKey: fiber.key, perfKey: perf.key, correlation: corr })
      }
    }
  }
  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)).slice(0, 8)
})

function getFiberName(key: string): string {
  const fiber = FIBER_INFO_LIST.find(f => f.key === key)
  return fiber ? fiber.name : key
}

function getPerfName(key: string): string {
  const perf = PERFORMANCE_KEYS.find(p => p.key === key)
  return perf ? perf.name : key
}
</script>

<template>
  <div class="knowledge-panel">
    <div class="panel-header">
      <h3 class="panel-title">配方研究知识库</h3>
      <div class="tab-switch">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'knowledge' }"
          @click="activeTab = 'knowledge'"
        >原料知识库</button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'recommendations' }"
          @click="activeTab = 'recommendations'"
        >智能推荐</button>
      </div>
    </div>

    <div v-if="activeTab === 'knowledge'" class="knowledge-content">
      <div class="stats-overview">
        <div class="stat-card">
          <span class="stat-value">{{ store.recipes.length }}</span>
          <span class="stat-label">历史配方</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ FIBER_INFO_LIST.length }}</span>
          <span class="stat-label">纤维种类</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ store.experimentRecords.length }}</span>
          <span class="stat-label">实验记录</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ store.researchNotes.length }}</span>
          <span class="stat-label">研究笔记</span>
        </div>
      </div>

      <div class="section-title">原料特性总览</div>
      <div class="fiber-grid">
        <div
          v-for="fiber in fiberKnowledge"
          :key="fiber.key"
          class="fiber-card"
          :class="{ active: selectedFiber === fiber.key }"
          @click="selectedFiber = fiber.key"
        >
          <div class="fiber-header">
            <span class="fiber-color" :style="{ backgroundColor: fiber.color }"></span>
            <span class="fiber-name">{{ fiber.name }}</span>
            <span class="fiber-count">{{ fiber.relatedRecipes }}个配方</span>
          </div>
          <div class="fiber-desc">{{ fiber.description }}</div>
          <div class="fiber-props">
            <span v-if="fiber.avgPerformance" class="prop-tag">
              平均强度: {{ fiber.avgPerformance.strength.toFixed(1) }}
            </span>
            <span v-if="fiber.avgPerformance" class="prop-tag">
              平均耐久: {{ fiber.avgPerformance.durability.toFixed(1) }}
            </span>
            <span v-if="fiber.fiberLength" class="prop-tag">
              纤维长度: {{ fiber.fiberLength }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="selectedFiberInfo" class="fiber-detail">
        <div class="detail-header">
          <h4 class="detail-title">
            <span class="fiber-color" :style="{ backgroundColor: selectedFiberInfo.color }"></span>
            {{ selectedFiberInfo.name }} 详细分析
          </h4>
          <button class="btn-link" @click="selectedFiber = null">关闭</button>
        </div>
        <div class="detail-body">
          <div class="detail-section">
            <span class="detail-label">原料特性</span>
            <p class="detail-text">{{ selectedFiberInfo.description }}</p>
          </div>
          <div class="detail-section">
            <span class="detail-label">使用建议</span>
            <p class="detail-text">{{ selectedFiberInfo.usageTips }}</p>
          </div>
          <div v-if="selectedFiberInfo.avgPerformance" class="detail-section">
            <span class="detail-label">历史平均性能表现</span>
            <div class="perf-bars">
              <div v-for="perf in PERFORMANCE_KEYS" :key="perf.key" class="perf-bar-item">
                <span class="perf-name">{{ perf.name }}</span>
                <div class="perf-bar-wrap">
                  <div
                    class="perf-bar-fill"
                    :style="{
                      width: selectedFiberInfo.avgPerformance![perf.key] + '%',
                      backgroundColor: getStrengthColor(selectedFiberInfo.avgPerformance![perf.key])
                    }"
                  ></div>
                </div>
                <span class="perf-value">{{ selectedFiberInfo.avgPerformance![perf.key].toFixed(1) }}</span>
              </div>
            </div>
          </div>
          <div class="detail-section">
            <span class="detail-label">相关配方</span>
            <div class="related-recipes">
              <div
                v-for="recipe in store.recipes.filter(r => r.fiberRatio[selectedFiberInfo.key] > 0).slice(0, 5)"
                :key="recipe.id"
                class="related-recipe-item"
                @click="store.loadRecipe(recipe.id)"
              >
                <span class="recipe-name">{{ recipe.name }}</span>
                <span class="recipe-ratio">{{ recipe.fiberRatio[selectedFiberInfo.key].toFixed(1) }}%</span>
                <span v-if="recipe.ratingDetail.overall > 0" class="recipe-rating">
                  {{ '★'.repeat(recipe.ratingDetail.overall) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="fiberCorrelation.length > 0" class="correlation-section">
        <div class="section-title">纤维-性能相关性分析</div>
        <div class="correlation-list">
          <div
            v-for="(corr, idx) in fiberCorrelation"
            :key="idx"
            class="correlation-item"
          >
            <span class="corr-fiber">{{ getFiberName(corr.fiberKey) }}</span>
            <span class="corr-arrow">{{ corr.correlation > 0 ? '↑ 正相关' : '↓ 负相关' }}</span>
            <span class="corr-perf">{{ getPerfName(corr.perfKey) }}</span>
            <span class="corr-value" :class="corr.correlation > 0 ? 'positive' : 'negative'">
              {{ Math.abs(corr.correlation).toFixed(2) }}
            </span>
          </div>
        </div>
      </div>

      <div class="rankings">
        <div class="ranking-col">
          <div class="section-title">高评分配方</div>
          <div class="ranking-list">
            <div
              v-for="(recipe, idx) in topRatedRecipes"
              :key="recipe.id"
              class="ranking-item"
              @click="store.loadRecipe(recipe.id)"
            >
              <span class="rank-no">{{ idx + 1 }}</span>
              <span class="rank-name">{{ recipe.name }}</span>
              <span class="rank-stars">{{ '★'.repeat(recipe.ratingDetail.overall) }}</span>
            </div>
          </div>
        </div>
        <div class="ranking-col">
          <div class="section-title">高实验量配方</div>
          <div class="ranking-list">
            <div
              v-for="(recipe, idx) in mostExperimented"
              :key="recipe.id"
              class="ranking-item"
              @click="store.loadRecipe(recipe.id)"
            >
              <span class="rank-no">{{ idx + 1 }}</span>
              <span class="rank-name">{{ recipe.name }}</span>
              <span class="rank-exp">{{ recipe.experimentRecordIds.length }}次实验</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'recommendations'" class="recommendations-content">
      <div v-if="recommendations.length === 0" class="empty-state">
        <svg class="empty-icon" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="24" stroke="#d9d9d9" stroke-width="2" stroke-dasharray="4 4"/>
          <path d="M32 20V36L42 42" stroke="#d9d9d9" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p class="empty-text">暂无智能推荐</p>
        <p class="empty-sub">积累更多配方数据后将生成个性化推荐</p>
      </div>

      <div v-else class="recommendations-list">
        <div
          v-for="rec in recommendations"
          :key="rec.id"
          class="recommendation-card"
        >
          <div class="rec-header">
            <span class="rec-type" :class="rec.type">
              {{ rec.type === 'improvement' ? '💡 优化建议' : rec.type === 'exploration' ? '🔬 探索方向' : '⭐ 经典配方' }}
            </span>
            <span class="rec-confidence">置信度 {{ rec.confidence }}%</span>
          </div>
          <h4 class="rec-title">{{ rec.title }}</h4>
          <p class="rec-description">{{ rec.description }}</p>

          <div v-if="rec.suggestedRatio" class="rec-ratio">
            <span class="rec-label">建议配比：</span>
            <div class="ratio-preview">
              <div
                v-for="fiber in FIBER_INFO_LIST"
                :key="fiber.key"
                v-show="rec.suggestedRatio![fiber.key] > 0"
                class="ratio-segment"
                :style="{
                  width: rec.suggestedRatio![fiber.key] + '%',
                  backgroundColor: fiber.color
                }"
                :title="`${fiber.name}: ${rec.suggestedRatio![fiber.key].toFixed(1)}%`"
              ></div>
            </div>
            <div class="ratio-details">
              <span
                v-for="fiber in FIBER_INFO_LIST.filter(f => rec.suggestedRatio![f.key] > 0)"
                :key="fiber.key"
                class="ratio-detail"
              >
                <span class="ratio-color" :style="{ backgroundColor: fiber.color }"></span>
                {{ fiber.name }} {{ rec.suggestedRatio![fiber.key].toFixed(1) }}%
              </span>
            </div>
          </div>

          <div v-if="rec.expectedPerformance" class="rec-performance">
            <span class="rec-label">预期性能：</span>
            <div class="mini-perf-bars">
              <div v-for="perf in PERFORMANCE_KEYS" :key="perf.key" class="mini-perf-item">
                <span class="mini-perf-name">{{ perf.name }}</span>
                <div class="mini-perf-bar">
                  <div
                    class="mini-perf-fill"
                    :style="{
                      width: rec.expectedPerformance![perf.key] + '%',
                      backgroundColor: getStrengthColor(rec.expectedPerformance![perf.key])
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div class="rec-actions">
            <button class="btn btn-default btn-small" @click="applyRecommendation(rec)">
              应用推荐
            </button>
            <span class="rec-date">生成于 {{ formatDate(rec.generatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.knowledge-panel {
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

.tab-switch {
  display: flex;
  gap: 2px;
  background: #f5f5f5;
  border-radius: 6px;
  padding: 2px;
}

.tab-btn {
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

.tab-btn.active {
  background: #fff;
  color: #333;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fafafa;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin: 16px 0 10px 0;
}

.fiber-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.fiber-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.fiber-card:hover,
.fiber-card.active {
  border-color: #1890ff;
  background: #f0f7ff;
}

.fiber-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.fiber-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.fiber-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.fiber-count {
  margin-left: auto;
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
}

.fiber-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fiber-props {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.prop-tag {
  font-size: 10px;
  color: #666;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
}

.fiber-detail {
  margin-top: 16px;
  border: 1px solid #91d5ff;
  border-radius: 10px;
  padding: 16px;
  background: #f0f7ff;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.detail-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
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

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.detail-text {
  font-size: 13px;
  color: #333;
  line-height: 1.6;
  margin: 0;
}

.perf-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.perf-bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.perf-name {
  width: 50px;
  font-size: 11px;
  color: #666;
  flex-shrink: 0;
}

.perf-bar-wrap {
  flex: 1;
  height: 8px;
  background: #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}

.perf-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.perf-value {
  width: 35px;
  text-align: right;
  font-size: 11px;
  font-weight: 600;
  color: #333;
}

.related-recipes {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.related-recipe-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.related-recipe-item:hover {
  background: #e6f7ff;
}

.recipe-name {
  flex: 1;
  color: #333;
}

.recipe-ratio {
  color: #1890ff;
  font-weight: 500;
}

.recipe-rating {
  color: #faad14;
  font-size: 11px;
}

.correlation-section {
  margin-top: 16px;
}

.correlation-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.correlation-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #fafafa;
  border-radius: 6px;
  font-size: 11px;
}

.corr-fiber {
  font-weight: 500;
  color: #333;
}

.corr-arrow {
  color: #999;
}

.corr-perf {
  flex: 1;
  color: #666;
}

.corr-value {
  font-weight: 600;
  font-size: 12px;
}

.corr-value.positive {
  color: #52c41a;
}

.corr-value.negative {
  color: #ff4d4f;
}

.rankings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.ranking-col {
  display: flex;
  flex-direction: column;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #fafafa;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.ranking-item:hover {
  background: #e6f7ff;
}

.rank-no {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1890ff;
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 600;
}

.rank-name {
  flex: 1;
  color: #333;
}

.rank-stars {
  color: #faad14;
  font-size: 11px;
}

.rank-exp {
  color: #999;
  font-size: 11px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
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

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 600px;
  overflow-y: auto;
}

.recommendation-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s;
}

.recommendation-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.rec-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.rec-type {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.rec-type.improvement {
  background: #e6fffb;
  color: #13c2c2;
}

.rec-type.exploration {
  background: #fff7e6;
  color: #fa8c16;
}

.rec-type.classic {
  background: #f9f0ff;
  color: #722ed1;
}

.rec-confidence {
  font-size: 11px;
  color: #999;
}

.rec-title {
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.rec-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}

.rec-ratio,
.rec-performance {
  margin-bottom: 12px;
}

.rec-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

.ratio-preview {
  display: flex;
  height: 16px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 6px;
}

.ratio-segment {
  height: 100%;
  transition: width 0.3s;
  cursor: help;
}

.ratio-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ratio-detail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #666;
}

.ratio-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.mini-perf-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-perf-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-perf-name {
  width: 45px;
  font-size: 10px;
  color: #999;
}

.mini-perf-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.mini-perf-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.rec-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
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

.btn-default {
  background: #fff;
  color: #666;
  border: 1px solid #d9d9d9;
}

.btn-default:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.rec-date {
  font-size: 11px;
  color: #999;
}
</style>
