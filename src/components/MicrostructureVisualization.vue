<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import { generateFiberPaths } from '../utils/microstructure'
import { FIBER_INFO_LIST } from '../types'

const store = useRecipeStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const canvasWidth = ref(600)
const canvasHeight = ref(400)

const fiberPaths = computed(() => {
  return generateFiberPaths(
    store.currentRatio,
    store.processParams,
    canvasWidth.value,
    canvasHeight.value
  )
})

const microstructure = computed(() => store.currentMicrostructure)

const fiberLegend = computed(() => {
  return FIBER_INFO_LIST.map(f => ({
    name: f.name,
    color: f.color,
    ratio: store.currentRatio[f.key]
  })).filter(f => f.ratio > 0)
})

function drawFibers() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  const gradient = ctx.createLinearGradient(0, 0, canvasWidth.value, canvasHeight.value)
  gradient.addColorStop(0, '#fff8f0')
  gradient.addColorStop(1, '#f5ede0')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  ctx.strokeStyle = 'rgba(210, 180, 140, 0.1)'
  ctx.lineWidth = 1
  for (let i = 0; i < canvasWidth.value; i += 20) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, canvasHeight.value)
    ctx.stroke()
  }
  for (let i = 0; i < canvasHeight.value; i += 20) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(canvasWidth.value, i)
    ctx.stroke()
  }
  
  fiberPaths.value.forEach(fiber => {
    if (fiber.points.length < 2) return
    
    ctx.beginPath()
    ctx.moveTo(fiber.points[0].x, fiber.points[0].y)
    
    for (let i = 1; i < fiber.points.length; i++) {
      const xc = (fiber.points[i].x + fiber.points[i - 1].x) / 2
      const yc = (fiber.points[i].y + fiber.points[i - 1].y) / 2
      ctx.quadraticCurveTo(fiber.points[i - 1].x, fiber.points[i - 1].y, xc, yc)
    }
    
    ctx.strokeStyle = fiber.color
    ctx.lineWidth = fiber.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.85
    ctx.stroke()
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = fiber.width * 0.3
    ctx.stroke()
    
    ctx.globalAlpha = 1
  })
}

function handleResize() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    canvasWidth.value = Math.max(400, rect.width - 40)
    canvasHeight.value = Math.max(300, Math.min(450, rect.width * 0.65))
  }
}

watch(
  () => [store.currentRatio, store.processParams, canvasWidth.value, canvasHeight.value],
  () => {
    drawFibers()
  },
  { deep: true }
)

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  setTimeout(drawFibers, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="microstructure-panel">
    <div class="panel-header">
      <h3 class="panel-title">纤维交织微观结构</h3>
      <div class="micro-stats">
        <div class="stat-item">
          <span class="stat-label">交织度</span>
          <span class="stat-value">{{ microstructure.fiberInterweaving.toFixed(1) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">均匀度</span>
          <span class="stat-value">{{ microstructure.uniformity.toFixed(1) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">层间结合</span>
          <span class="stat-value">{{ microstructure.layerBonding.toFixed(1) }}</span>
        </div>
      </div>
    </div>
    
    <div ref="containerRef" class="canvas-container">
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        class="fiber-canvas"
      ></canvas>
    </div>
    
    <div class="legend-section">
      <div class="legend-title">纤维种类图例</div>
      <div class="legend-list">
        <div
          v-for="fiber in fiberLegend"
          :key="fiber.name"
          class="legend-item"
        >
          <span class="legend-color" :style="{ backgroundColor: fiber.color }"></span>
          <span class="legend-name">{{ fiber.name }}</span>
          <span class="legend-ratio">{{ fiber.ratio.toFixed(1) }}%</span>
        </div>
      </div>
    </div>
    
    <div class="info-tip">
      <span class="tip-icon">💡</span>
      <span class="tip-text">调整左侧原料配比和工艺参数，观察纤维交织状态的变化。长纤维（楮皮、麻）提供更好的交织强度，短纤维（竹、稻草）提升匀度。</span>
    </div>
  </div>
</template>

<style scoped>
.microstructure-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.micro-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  border-radius: 8px;
  min-width: 80px;
}

.stat-label {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1890ff;
}

.canvas-container {
  display: flex;
  justify-content: center;
  padding: 10px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.fiber-canvas {
  border-radius: 8px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.06);
  max-width: 100%;
}

.legend-section {
  margin-bottom: 12px;
}

.legend-title {
  font-size: 13px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.legend-list {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.legend-name {
  font-size: 13px;
  color: #333;
}

.legend-ratio {
  font-size: 12px;
  color: #1890ff;
  font-weight: 500;
}

.info-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  font-size: 12px;
  color: #874d00;
  line-height: 1.6;
}

.tip-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.tip-text {
  flex: 1;
}
</style>
