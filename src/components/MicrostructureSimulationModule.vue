<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import FiberSlider from './FiberSlider.vue'
import ProcessParamsPanel from './ProcessParamsPanel.vue'
import MicrostructureVisualization from './MicrostructureVisualization.vue'
import PoreHistogram from './PoreHistogram.vue'
import PredictionRadar from './PredictionRadar.vue'
import LayerStructure from './LayerStructure.vue'
import SimulationSnapshotPanel from './SimulationSnapshotPanel.vue'
import ReproducibleExperimentMode from './ReproducibleExperimentMode.vue'
import { MICROSTRUCTURE_KEYS } from '../types'

const switchModule = inject<(module: 'recipe' | 'microstructure') => void>('switchModule')!
const activeModule = inject('activeModule') as any
const store = useRecipeStore()

const currentMicrostructure = computed(() => store.currentMicrostructure)
const showReproMode = ref(true)
</script>

<template>
  <div class="micro-module">
    <div class="module-header">
      <div class="header-content">
        <div class="module-title-group">
          <span class="module-icon">🔬</span>
          <div>
            <h2 class="module-title">手工纸微观结构模拟与工艺预测</h2>
            <p class="module-subtitle">
              结合纤维配比与工艺参数，模拟纤维交织状态、孔隙分布与层次结构，预测成纸性能指标
            </p>
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
              :class="{ active: activeModule === 'microstructure' }"
              @click="switchModule('microstructure')"
            >
              🔬 微观模拟
            </button>
          </div>
        </div>
        <div class="module-badges">
          <span class="badge">
            <span class="badge-icon">🧪</span>
            <span>5项工艺参数</span>
          </span>
          <span class="badge">
            <span class="badge-icon">📊</span>
            <span>6项微观指标</span>
          </span>
          <span class="badge">
            <span class="badge-icon">🎯</span>
            <span>5项性能预测</span>
          </span>
          <span class="badge" :class="{ active: showReproMode }" @click="showReproMode = !showReproMode" style="cursor:pointer;">
            <span class="badge-icon">{{ showReproMode ? '✅' : '🔬' }}</span>
            <span>{{ showReproMode ? '复现模式开启' : '复现实验模式' }}</span>
          </span>
        </div>
      </div>
    </div>

    <div class="module-main">
      <div class="left-column">
        <FiberSlider />
        <ProcessParamsPanel />
        
        <div class="quick-reference">
          <h4 class="section-title">📖 参数说明</h4>
          <div class="reference-grid">
            <div class="ref-item">
              <div class="ref-icon">⚙️</div>
              <div class="ref-content">
                <div class="ref-title">打浆度</div>
                <div class="ref-desc">反映纤维细纤维化程度。打浆度越高，纤维越细短，交织越好，但纸张脆化风险增加。</div>
              </div>
            </div>
            <div class="ref-item">
              <div class="ref-icon">📏</div>
              <div class="ref-content">
                <div class="ref-title">抄纸厚度</div>
                <div class="ref-desc">纸页成型厚度。厚度增加会降低透光性，但可提升强度和层次感。</div>
              </div>
            </div>
            <div class="ref-item">
              <div class="ref-icon">💪</div>
              <div class="ref-content">
                <div class="ref-title">压榨强度</div>
                <div class="ref-desc">湿纸页压榨压力。压力越大，纤维结合越紧密，孔隙越小，强度越高。</div>
              </div>
            </div>
            <div class="ref-item">
              <div class="ref-icon">🌡️</div>
              <div class="ref-content">
                <div class="ref-title">干燥条件</div>
                <div class="ref-desc">温度和时长影响纤维氢键结合。温和干燥可获得最佳层间结合力。</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="center-column">
        <MicrostructureVisualization />
        
        <div class="charts-row">
          <div class="chart-card">
            <PoreHistogram />
          </div>
          <div class="chart-card">
            <PredictionRadar />
          </div>
        </div>
        
        <LayerStructure />

        <ReproducibleExperimentMode v-show="showReproMode" />
      </div>

      <div class="right-column">
        <div class="indicator-panels">
          <div class="panel-section">
            <h4 class="section-title">🔬 微观结构指标</h4>
            <div class="indicator-list">
              <div
                v-for="key in MICROSTRUCTURE_KEYS"
                :key="key.key"
                class="indicator-item"
              >
                <div class="indicator-header">
                  <span class="indicator-name">{{ key.name }}</span>
                  <span class="indicator-value" :style="{ color: key.color }">
                    {{ key.format === 'int' ? Math.round(currentMicrostructure[key.key]) : currentMicrostructure[key.key].toFixed(1) }}
                    <span class="indicator-unit">{{ key.unit }}</span>
                  </span>
                </div>
                <div class="indicator-bar">
                  <div
                    class="indicator-fill"
                    :style="{
                      width: Math.min(100, (currentMicrostructure[key.key] / key.max) * 100) + '%',
                      backgroundColor: key.color
                    }"
                  ></div>
                </div>
                <div class="indicator-desc">{{ key.description }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <SimulationSnapshotPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.micro-module {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f0e8 0%, #e8e4dc 100%);
}

.module-header {
  background: linear-gradient(135deg, #5c3d2e 0%, #8B7355 50%, #D4A574 100%);
  color: #fff;
  padding: 24px 32px;
  box-shadow: 0 4px 16px rgba(92, 61, 46, 0.3);
  position: relative;
  overflow: hidden;
}

.module-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  border-radius: 50%;
}

.header-content {
  max-width: 1800px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
  gap: 20px;
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
  color: #5c3d2e;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.module-title-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.module-icon {
  font-size: 48px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
}

.module-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.module-subtitle {
  margin: 6px 0 0 0;
  font-size: 14px;
  opacity: 0.9;
  font-weight: 400;
  line-height: 1.5;
  max-width: 600px;
}

.module-badges {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.badge-icon {
  font-size: 16px;
}

.module-main {
  max-width: 1800px;
  margin: 0 auto;
  padding: 24px;
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
  min-height: 400px;
}

.quick-reference {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.reference-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ref-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  transition: all 0.2s;
}

.ref-item:hover {
  background: #f5f5f5;
  transform: translateX(4px);
}

.ref-icon {
  font-size: 20px;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ref-content {
  flex: 1;
  min-width: 0;
}

.ref-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.ref-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.indicator-panels {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.panel-section {
  margin-bottom: 0;
}

.indicator-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.indicator-item {
  padding-bottom: 16px;
  border-bottom: 1px dashed #f0f0f0;
}

.indicator-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.indicator-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.indicator-value {
  font-size: 20px;
  font-weight: 700;
}

.indicator-unit {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.8;
  margin-left: 2px;
}

.indicator-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.indicator-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.indicator-desc {
  font-size: 11px;
  color: #999;
  line-height: 1.4;
}

@media (max-width: 1400px) {
  .module-main {
    grid-template-columns: 340px 1fr 360px;
  }
}

@media (max-width: 1200px) {
  .module-main {
    grid-template-columns: 1fr;
  }
  
  .left-column,
  .right-column {
    position: static;
    max-height: none;
  }
  
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .module-header {
    padding: 20px 16px;
  }
  
  .module-title {
    font-size: 22px;
  }
  
  .module-main {
    padding: 16px;
  }
  
  .module-badges {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
