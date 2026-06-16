<script setup lang="ts">
import { computed } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import { FIBER_INFO_LIST } from '../types'
import type { FiberRatio } from '../types'

const store = useRecipeStore()

const fiberList = computed(() => {
  return FIBER_INFO_LIST.map(fiber => ({
    ...fiber,
    value: store.currentRatio[fiber.key]
  }))
})

function handleSliderChange(key: keyof FiberRatio, event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  store.setFiberRatio(key, value)
}

function handleInputChange(key: keyof FiberRatio, event: Event) {
  const target = event.target as HTMLInputElement
  let value = parseFloat(target.value)
  if (isNaN(value)) value = 0
  value = Math.max(0, Math.min(100, value))
  store.setFiberRatio(key, value)
}
</script>

<template>
  <div class="fiber-slider-panel">
    <h3 class="panel-title">原料配比调整</h3>
    <div class="total-ratio" :class="{ invalid: !store.isRatioValid }">
      <span>合计：</span>
      <span class="ratio-value">{{ store.totalRatio.toFixed(2) }}%</span>
      <span v-if="!store.isRatioValid" class="error-tip">{{ store.ratioErrorMessage }}</span>
    </div>
    <div class="slider-list">
      <div
        v-for="fiber in fiberList"
        :key="fiber.key"
        class="slider-item"
      >
        <div class="slider-header">
          <span class="fiber-color" :style="{ backgroundColor: fiber.color }"></span>
          <span class="fiber-name">{{ fiber.name }}</span>
          <div class="fiber-input-wrapper">
            <input
              type="number"
              :value="fiber.value.toFixed(2)"
              @change="handleInputChange(fiber.key, $event)"
              class="fiber-input"
              min="0"
              max="100"
              step="0.01"
            />
            <span class="unit">%</span>
          </div>
        </div>
        <div class="slider-track">
          <input
            type="range"
            :value="fiber.value"
            @input="handleSliderChange(fiber.key, $event)"
            class="range-slider"
            min="0"
            max="100"
            step="0.01"
            :style="{ '--slider-color': fiber.color }"
          />
        </div>
        <div class="slider-scale">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
    <div class="ratio-bar">
      <div
        v-for="fiber in fiberList"
        :key="fiber.key"
        class="ratio-segment"
        :style="{
          width: fiber.value + '%',
          backgroundColor: fiber.color
        }"
        :title="`${fiber.name}: ${fiber.value.toFixed(2)}%`"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.fiber-slider-panel {
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

.total-ratio {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.total-ratio.invalid {
  background: #fff1f0;
  border: 1px solid #ffccc7;
}

.ratio-value {
  font-weight: 600;
  color: #1890ff;
  font-size: 16px;
}

.total-ratio.invalid .ratio-value {
  color: #ff4d4f;
}

.error-tip {
  color: #ff4d4f;
  font-size: 12px;
}

.slider-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.slider-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fiber-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

.fiber-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.fiber-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.fiber-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  text-align: right;
  transition: border-color 0.2s;
}

.fiber-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.unit {
  font-size: 13px;
  color: #666;
}

.slider-track {
  position: relative;
  height: 8px;
}

.range-slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #f0f0f0;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--slider-color, #1890ff);
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.15s;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.range-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--slider-color, #1890ff);
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.slider-scale {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #999;
}

.ratio-bar {
  display: flex;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 20px;
  background: #f0f0f0;
}

.ratio-segment {
  height: 100%;
  transition: width 0.3s ease;
}
</style>
