<script setup lang="ts">
import FiberSlider from './components/FiberSlider.vue'
import FiberPieChart from './components/FiberPieChart.vue'
import PerformanceRadar from './components/PerformanceRadar.vue'
import RecipeList from './components/RecipeList.vue'
import RecipeManager from './components/RecipeManager.vue'
</script>

<template>
  <div class="app-container">
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

          <div class="comparison-section">
            <div class="section-header">
              <h3 class="section-title">历史配方对比</h3>
              <span class="section-tip">在右侧选择配方，在雷达图中查看对比</span>
            </div>
          </div>
        </div>

        <div class="right-column">
          <RecipeList />
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <p>手工纸研究配方设计系统 · 基于传统工艺与现代材料科学</p>
    </footer>
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
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
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
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.main-grid {
  display: grid;
  grid-template-columns: 360px 1fr 380px;
  gap: 20px;
  align-items: start;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.center-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-column {
  min-height: 600px;
  max-height: calc(100vh - 160px);
  overflow: hidden;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  min-height: 360px;
}

.comparison-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.section-tip {
  font-size: 12px;
  color: #999;
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

@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .right-column {
    min-height: auto;
    max-height: none;
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
