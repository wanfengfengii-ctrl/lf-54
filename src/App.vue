<script setup lang="ts">
import { ref, provide } from 'vue'
import FiberSlider from './components/FiberSlider.vue'
import FiberPieChart from './components/FiberPieChart.vue'
import PerformanceRadar from './components/PerformanceRadar.vue'
import RecipeList from './components/RecipeList.vue'
import RecipeManager from './components/RecipeManager.vue'
import RecipeComparison from './components/RecipeComparison.vue'
import FiberAnalysisPanel from './components/FiberAnalysisPanel.vue'
import ExperimentArchive from './components/ExperimentArchive.vue'
import RatingManager from './components/RatingManager.vue'
import ResearchNotes from './components/ResearchNotes.vue'
import RecipeKnowledgeBase from './components/RecipeKnowledgeBase.vue'
import MicrostructureSimulationModule from './components/MicrostructureSimulationModule.vue'

const activeModule = ref<'recipe' | 'microstructure'>('recipe')
const rightTab = ref<'recipes' | 'rating' | 'experiments' | 'notes' | 'knowledge'>('recipes')

function switchModule(module: 'recipe' | 'microstructure') {
  activeModule.value = module
}

provide('switchModule', switchModule)
provide('activeModule', activeModule)
</script>

<template>
  <div class="app-container">
    <template v-if="activeModule === 'recipe'">
      <header class="app-header">
        <div class="header-content">
          <div class="logo">
            <svg class="logo-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="8" width="40" height="32" rx="2" stroke="#D4A574" stroke-width="2" fill="#FFF8F0"/>
              <path d="M12 16L14 24L18 20L22 28L26 22L30 26L36 18" stroke="#8B7355" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 28L16 32L20 28L24 34L28 30L32 36L36 32" stroke="#7CB342" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
            </svg>
            <div class="title-group">
              <h1 class="app-title">手工纸配方设计系统</h1>
              <p class="app-subtitle">探索纤维配比与纸张性能的奥秘</p>
            </div>
          </div>
          <div class="header-actions">
            <div class="module-switcher">
              <button
                class="module-btn"
                :class="{ active: activeModule === 'recipe' }"
                @click="switchModule('recipe')"
              >
                📋 配方设计
              </button>
              <button
                class="module-btn"
                :class="{ active: (activeModule as string) === 'microstructure' }"
                @click="switchModule('microstructure')"
              >
                🔬 微观模拟
              </button>
            </div>
          </div>
          <div class="header-decoration">
            <div class="fiber-dot dot-1"></div>
            <div class="fiber-dot dot-2"></div>
            <div class="fiber-dot dot-3"></div>
            <div class="fiber-dot dot-4"></div>
          </div>
        </div>
      </header>

    <main class="app-main">
      <div class="main-grid">
        <div class="left-column">
          <FiberSlider />
          <RecipeManager />
        </div>

        <div class="center-column">
          <div class="charts-row">
            <div class="chart-card">
              <FiberPieChart />
            </div>
            <div class="chart-card">
              <PerformanceRadar />
            </div>
          </div>

          <RecipeComparison />

          <FiberAnalysisPanel />
        </div>

        <div class="right-column">
          <div class="tab-container">
            <div class="tab-header">
              <button
                class="tab-btn"
                :class="{ active: rightTab === 'recipes' }"
                @click="rightTab = 'recipes'"
              >📋 历史配方</button>
              <button
                class="tab-btn"
                :class="{ active: rightTab === 'rating' }"
                @click="rightTab = 'rating'"
              >⭐ 评级管理</button>
              <button
                class="tab-btn"
                :class="{ active: rightTab === 'experiments' }"
                @click="rightTab = 'experiments'"
              >🔬 实验记录</button>
              <button
                class="tab-btn"
                :class="{ active: rightTab === 'notes' }"
                @click="rightTab = 'notes'"
              >📝 研究笔记</button>
              <button
                class="tab-btn"
                :class="{ active: rightTab === 'knowledge' }"
                @click="rightTab = 'knowledge'"
              >📚 知识库</button>
            </div>
            <div class="tab-content">
              <RecipeList v-show="rightTab === 'recipes'" />
              <RatingManager v-show="rightTab === 'rating'" />
              <ExperimentArchive v-show="rightTab === 'experiments'" />
              <ResearchNotes v-show="rightTab === 'notes'" />
              <RecipeKnowledgeBase v-show="rightTab === 'knowledge'" />
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <p>手工纸研究配方设计系统 · 基于传统工艺与现代材料科学</p>
    </footer>
    </template>

    <MicrostructureSimulationModule v-else />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f0e8 0%, #e8e4dc 100%);
}

.app-header {
  background: linear-gradient(135deg, #8B7355 0%, #D4A574 100%);
  color: #fff;
  padding: 20px 32px;
  box-shadow: 0 4px 16px rgba(139, 115, 85, 0.3);
  position: relative;
  overflow: hidden;
}

.header-content {
  max-width: 1800px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.header-actions {
  position: relative;
  z-index: 2;
}

.module-switcher {
  display: flex;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 4px;
  gap: 2px;
}

.module-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}

.module-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.module-btn.active {
  background: #fff;
  color: #8B7355;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.logo {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-icon {
  width: 48px;
  height: 48px;
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
}

.app-subtitle {
  margin: 0;
  font-size: 13px;
  opacity: 0.85;
  font-weight: 400;
}

.header-decoration {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 12px;
}

.fiber-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  opacity: 0.6;
  animation: float 3s ease-in-out infinite;
}

.dot-1 {
  background: #D4A574;
  animation-delay: 0s;
}

.dot-2 {
  background: #7CB342;
  animation-delay: 0.5s;
}

.dot-3 {
  background: #FDD835;
  animation-delay: 1s;
}

.dot-4 {
  background: #8B7355;
  animation-delay: 1.5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.app-main {
  flex: 1;
  padding: 24px;
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.main-grid {
  display: grid;
  grid-template-columns: 360px 1fr 400px;
  gap: 20px;
  align-items: start;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 24px;
}

.center-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  padding-right: 4px;
}

.right-column::-webkit-scrollbar {
  width: 6px;
}

.right-column::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.right-column::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  min-height: 360px;
}

.app-footer {
  background: #8B7355;
  color: rgba(255, 255, 255, 0.8);
  padding: 16px 32px;
  text-align: center;
  font-size: 13px;
}

.app-footer p {
  margin: 0;
}

.tab-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tab-header {
  display: flex;
  gap: 2px;
  background: #fff;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  flex-wrap: wrap;
}

.tab-btn {
  flex: 1;
  min-width: 70px;
  padding: 6px 4px;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  background: transparent;
  color: #666;
  transition: all 0.2s;
  font-family: inherit;
}

.tab-btn:hover {
  color: #333;
}

.tab-btn.active {
  background: #1890ff;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(24, 144, 255, 0.3);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 1400px) {
  .main-grid {
    grid-template-columns: 340px 1fr 360px;
  }
}

@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .right-column {
    max-height: none;
  }

  .left-column {
    position: static;
  }
}

@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }

  .app-title {
    font-size: 20px;
  }

  .app-subtitle {
    display: none;
  }
}
</style>
