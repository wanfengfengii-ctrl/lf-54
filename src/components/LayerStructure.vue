<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import { FIBER_INFO_LIST } from '../types'
import { generateLayerInfo, type LayerInfo } from '../utils/microstructure'
import type { FiberRatio, ProcessParams } from '../types'

class SeededRandom {
  private seed: number
  constructor(seed: number) { this.seed = seed >>> 0 }
  next(): number { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 0xffffffff }
  range(min: number, max: number): number { return min + this.next() * (max - min) }
  int(min: number, max: number): number { return Math.floor(this.range(min, max + 1)) }
}

function generateLayerSeed(ratio: FiberRatio, params: ProcessParams, salt: number = 0): number {
  let hash = 2166136261
  const values = [ratio.chuPi, ratio.hemp, ratio.bamboo, ratio.straw, params.beatingDegree, params.sheetThickness, params.pressingIntensity, params.dryingTemperature, params.dryingDuration, salt]
  for (const v of values) { hash ^= Math.round(v * 1000); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}

const store = useRecipeStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const canvasWidth = ref(600)
const canvasHeight = ref(300)

const microstructure = computed(() => store.currentMicrostructure)
const processParams = computed(() => store.processParams)
const fiberRatio = computed(() => store.currentRatio)

const layerCount = computed(() => microstructure.value.layerCount)
const layerBonding = computed(() => microstructure.value.layerBonding)
const uniformity = computed(() => microstructure.value.uniformity)

const layerInfo = computed<LayerInfo[]>(() => {
  return generateLayerInfo(fiberRatio.value, processParams.value, microstructure.value)
})

const layerFiberRng = computed(() => {
  return new SeededRandom(generateLayerSeed(fiberRatio.value, processParams.value, 4))
})

function getDominantFiber(fiberMix: FiberRatio): { name: string; color: string } {
  let maxKey: keyof FiberRatio = 'chuPi'
  let maxVal = 0
  const keys: Array<keyof FiberRatio> = ['chuPi', 'hemp', 'bamboo', 'straw']
  keys.forEach((k) => {
    const v = fiberMix[k]
    if (v > maxVal) {
      maxVal = v
      maxKey = k
    }
  })
  const info = FIBER_INFO_LIST.find(f => f.key === maxKey)
  return {
    name: info?.name || '',
    color: info?.color || '#999'
  }
}

function drawLayerStructure() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight.value)
  bgGradient.addColorStop(0, '#f9f5f0')
  bgGradient.addColorStop(1, '#f0ebe3')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  const padding = { top: 40, right: 120, bottom: 40, left: 80 }
  const chartWidth = canvasWidth.value - padding.left - padding.right
  const chartHeight = canvasHeight.value - padding.top - padding.bottom
  
  const totalThickness = processParams.value.sheetThickness
  let currentY = padding.top + chartHeight
  
  layerInfo.value.forEach((layer, index) => {
    const layerHeight = (layer.thickness / totalThickness) * chartHeight
    const layerY = currentY - layerHeight
    
    const dominant = getDominantFiber(layer.fiberMix)
    
    const layerGradient = ctx.createLinearGradient(padding.left, layerY, padding.left + chartWidth, layerY)
    const baseColor = dominant.color
    const alpha = 0.5 + (layer.density * 0.4)
    
    layerGradient.addColorStop(0, adjustColorAlpha(baseColor, alpha * 0.7))
    layerGradient.addColorStop(0.3, adjustColorAlpha(baseColor, alpha))
    layerGradient.addColorStop(0.7, adjustColorAlpha(baseColor, alpha))
    layerGradient.addColorStop(1, adjustColorAlpha(baseColor, alpha * 0.7))
    
    ctx.fillStyle = layerGradient
    ctx.fillRect(padding.left, layerY, chartWidth, layerHeight)
    
    ctx.strokeStyle = 'rgba(139, 115, 85, 0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 3])
    ctx.beginPath()
    ctx.moveTo(padding.left, layerY)
    ctx.lineTo(padding.left + chartWidth, layerY)
    ctx.stroke()
    ctx.setLineDash([])
    
    drawFibersInLayer(ctx, padding.left, layerY, chartWidth, layerHeight, layer, index, layerFiberRng.value)
    
    ctx.fillStyle = '#666'
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`第${layer.index + 1}层`, padding.left - 10, layerY + layerHeight / 2 + 4)
    
    ctx.fillStyle = dominant.color
    ctx.fillRect(padding.left + chartWidth + 10, layerY + layerHeight / 2 - 6, 12, 12)
    ctx.fillStyle = '#666'
    ctx.textAlign = 'left'
    ctx.fillText(dominant.name, padding.left + chartWidth + 28, layerY + layerHeight / 2 + 4)
    
    if (layer.isTop) {
      ctx.fillStyle = '#1890ff'
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('↑ 正面（光面）', padding.left + chartWidth + 10, layerY - 8)
    }
    if (layer.isBottom) {
      ctx.fillStyle = '#fa8c16'
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('↑ 反面（毛面）', padding.left + chartWidth + 10, layerY + layerHeight + 16)
    }
    
    currentY = layerY
  })
  
  ctx.strokeStyle = '#8B7355'
  ctx.lineWidth = 2
  ctx.strokeRect(padding.left, padding.top, chartWidth, chartHeight)
  
  ctx.fillStyle = '#333'
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`纸页截面层次结构（共${layerCount.value}层，总厚${totalThickness}μm）`, canvasWidth.value / 2, 20)
  
  ctx.fillStyle = '#666'
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`层间结合强度: ${layerBonding.value.toFixed(1)} | 匀度: ${uniformity.value.toFixed(1)}`, canvasWidth.value / 2, canvasHeight.value - 10)
}

function drawFibersInLayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  layer: LayerInfo,
  _layerIndex: number,
  rng: SeededRandom
) {
  const fiberCount = Math.floor(width / 30)
  const fiberColors = FIBER_INFO_LIST.map(f => f.color)
  const layerRatio = layer.fiberMix
  const totalMix = layerRatio.chuPi + layerRatio.hemp + layerRatio.bamboo + layerRatio.straw

  for (let i = 0; i < fiberCount; i++) {
    const fx = x + rng.next() * width
    const fy = y + rng.next() * height
    const fWidth = 30 + rng.next() * 60
    const fHeight = 1 + rng.next() * 2
    
    const angle = (rng.next() - 0.5) * 0.5
    
    let colorIndex = 0
    const r = rng.next() * totalMix
    let acc = 0
    const ratioArr = [layerRatio.chuPi, layerRatio.hemp, layerRatio.bamboo, layerRatio.straw]
    for (let j = 0; j < ratioArr.length; j++) {
      acc += ratioArr[j]
      if (r <= acc) { colorIndex = j; break }
    }
    
    ctx.save()
    ctx.translate(fx, fy)
    ctx.rotate(angle)
    
    ctx.fillStyle = adjustColorAlpha(fiberColors[colorIndex], 0.4 + rng.next() * 0.3)
    ctx.fillRect(-fWidth / 2, -fHeight / 2, fWidth, fHeight)
    
    ctx.restore()
  }
}

function adjustColorAlpha(color: string, alpha: number): string {
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function handleResize() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    canvasWidth.value = Math.max(400, rect.width - 40)
    canvasHeight.value = Math.max(250, Math.min(400, canvasWidth.value * 0.55))
  }
}

watch(
  () => [microstructure.value, canvasWidth.value, canvasHeight.value],
  () => {
    drawLayerStructure()
  },
  { deep: true }
)

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  setTimeout(drawLayerStructure, 100)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="layer-structure-panel">
    <div class="panel-header">
      <h3 class="panel-title">纸页层次结构分析</h3>
      <div class="layer-stats">
        <div class="stat-item">
          <span class="stat-label">总层数</span>
          <span class="stat-value">{{ layerCount }}</span>
        </div>
        <div class="stat-item primary">
          <span class="stat-label">层间结合</span>
          <span class="stat-value">{{ layerBonding.toFixed(1) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总厚度</span>
          <span class="stat-value">{{ processParams.sheetThickness }}μm</span>
        </div>
      </div>
    </div>
    
    <div ref="containerRef" class="canvas-container">
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        class="layer-canvas"
      ></canvas>
    </div>
    
    <div class="layer-detail">
      <div class="detail-title">📋 各层详情</div>
      <div class="layer-list">
        <div
          v-for="(layer, index) in layerInfo"
          :key="index"
          class="layer-item"
          :class="{ 'top-layer': layer.isTop, 'bottom-layer': layer.isBottom }"
        >
          <div class="layer-index">
            <span v-if="layer.isTop" class="layer-badge">正面</span>
            <span v-else-if="layer.isBottom" class="layer-badge bottom">反面</span>
            <span v-else>第{{ layer.index + 1 }}层</span>
          </div>
          <div class="layer-props">
            <span class="prop">厚度: {{ layer.thickness.toFixed(1) }}μm</span>
            <span class="prop">密度: {{ (layer.density * 100).toFixed(0) }}%</span>
          </div>
          <div class="layer-fibers">
            <span
              v-for="(ratio, key) in layer.fiberMix"
              :key="key"
              class="fiber-tag"
              :style="{
                backgroundColor: (FIBER_INFO_LIST.find(f => f.key === key)?.color || '#999') + '20',
                color: FIBER_INFO_LIST.find(f => f.key === key)?.color || '#999'
              }"
            >
              {{ FIBER_INFO_LIST.find(f => f.key === key)?.name }} {{ (ratio as number).toFixed(0) }}%
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="info-tip">
      <span class="tip-icon">📚</span>
      <span class="tip-text">
        <strong>工艺影响：</strong>
        压榨强度提升会增加层数和层间结合力；打浆度提高使纤维更细，层次更均匀；
        干燥温度过高会降低层间结合。传统手工纸通常具有3-8层结构，正面较细腻、反面较粗糙。
      </span>
    </div>
  </div>
</template>

<style scoped>
.layer-structure-panel {
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

.layer-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 14px;
  background: #f5f5f5;
  border-radius: 8px;
  min-width: 70px;
}

.stat-item.primary {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
}

.stat-label {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.stat-item.primary .stat-value {
  color: #fa8c16;
}

.canvas-container {
  display: flex;
  justify-content: center;
  padding: 10px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.layer-canvas {
  border-radius: 8px;
  max-width: 100%;
}

.layer-detail {
  margin-bottom: 12px;
}

.detail-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 8px;
}

.layer-list::-webkit-scrollbar {
  width: 6px;
}

.layer-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.layer-list::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 3px solid #d9d9d9;
  flex-wrap: wrap;
}

.layer-item.top-layer {
  border-left-color: #1890ff;
  background: linear-gradient(to right, #e6f7ff 0%, #fafafa 100%);
}

.layer-item.bottom-layer {
  border-left-color: #fa8c16;
  background: linear-gradient(to right, #fff7e6 0%, #fafafa 100%);
}

.layer-index {
  min-width: 60px;
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.layer-badge {
  padding: 2px 8px;
  background: #1890ff;
  color: #fff;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.layer-badge.bottom {
  background: #fa8c16;
}

.layer-props {
  display: flex;
  gap: 16px;
}

.prop {
  font-size: 12px;
  color: #666;
}

.layer-fibers {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  justify-content: flex-end;
}

.fiber-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.info-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #f9f0ff;
  border: 1px solid #d3adf7;
  border-radius: 8px;
  font-size: 12px;
  color: #391085;
  line-height: 1.6;
}

.tip-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.tip-text {
  flex: 1;
}

.tip-text strong {
  color: #531dab;
}
</style>
