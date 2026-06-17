<script setup lang="ts">
import { computed } from 'vue'
import { useRecipeStore } from '../stores/recipe'
import { PROCESS_PARAM_RANGES } from '../types'
import type { ProcessParams } from '../types'

const store = useRecipeStore()

const paramList = computed(() => {
  const keys = Object.keys(PROCESS_PARAM_RANGES) as Array<keyof ProcessParams>
  return keys.map(key => ({
    key,
    ...PROCESS_PARAM_RANGES[key],
    value: store.processParams[key]
  }))
})

function handleSliderChange(key: keyof ProcessParams, event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  store.setProcessParam(key, value)
}

function handleInputChange(key: keyof ProcessParams, event: Event) {
  const target = event.target as HTMLInputElement
  let value = parseFloat(target.value)
  if (isNaN(value)) value = PROCESS_PARAM_RANGES[key].min
  store.setProcessParam(key, value)
}

function handleReset() {
  store.resetProcessParams()
}
</script>

<template>
  <div class="process-params-panel">
    <div class="panel-header">
      <h3 class="panel-title">工艺参数设置</h3>
      <button class="reset-btn" @click="handleReset" title="重置为默认值">
        ↺ 重置
      </button>
    </div>
    
    <div class="params-list">
      <div
        v-for="param in paramList"
        :key="param.key"
        class="param-item"
      >
        <div class="param-header">
          <span class="param-name">{{ param.label }}</span>
          <div class="param-input-wrapper">
            <input
              type="number"
              :value="param.value"
              @change="handleInputChange(param.key, $event)"
              class="param-input"
              :min="param.min"
              :max="param.max"
              :step="param.step"
            />
            <span class="param-unit">{{ param.unit }}</span>
          </div>
        </div>
        
        <div class="param-slider">
          <input
            type="range"
            :value="param.value"
            @input="handleSliderChange(param.key, $event)"
            class="range-slider"
            :min="param.min"
            :max="param.max"
            :step="param.step"
          />
        </div>
        
        <div class="param-scale">
          <span>{{ param.min }}{{ param.unit }}</span>
          <span class="param-default" title="默认值">
            默: {{ param.key === 'beatingDegree' ? 40 : 
                    param.key === 'sheetThickness' ? 80 : 
                    param.key === 'pressingIntensity' ? 5 : 
                    param.key === 'dryingTemperature' ? 60 : 30 }}{{ param.unit }}
          </span>
          <span>{{ param.max }}{{ param.unit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.process-params-panel {
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
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.reset-btn {
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.reset-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
  background: #e6f7ff;
}

.params-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.param-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.param-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.param-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  text-align: right;
  transition: border-color 0.2s;
}

.param-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.param-unit {
  font-size: 13px;
  color: #666;
  min-width: 30px;
}

.param-slider {
  position: relative;
  height: 8px;
}

.range-slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, #1890ff 0%, #52c41a 100%);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #1890ff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.15s;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #1890ff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.param-scale {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #999;
}

.param-default {
  color: #1890ff;
  opacity: 0.8;
}
</style>
