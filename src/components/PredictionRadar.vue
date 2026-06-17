<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useRecipeStore } from '../stores/recipe'
import { PREDICTION_KEYS } from '../types'
import type { PredictionIndicators } from '../types'

const props = defineProps<{
  showLegend?: boolean
}>()

const store = useRecipeStore()
const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const currentPrediction = computed(() => store.currentPrediction)
const selectedSnapshots = computed(() => store.selectedSnapshots)

function normalizeValue(key: keyof PredictionIndicators, value: number): number {
  const config = PREDICTION_KEYS.find(k => k.key === key)
  if (!config) return value
  
  switch (key) {
    case 'strength':
      return Math.min(100, (value / 10) * 100)
    case 'inkDiffusion':
      return Math.min(100, Math.max(0, (10 - value) / 10 * 100))
    case 'lightTransmittance':
      return value
    case 'surfaceFineness':
      return Math.min(100, Math.max(0, (20 - value) / 20 * 100))
    case 'durability':
      return Math.min(100, (value / 800) * 100)
    default:
      return value
  }
}

const radarIndicator = computed(() => {
  return PREDICTION_KEYS.map(key => ({
    name: key.name,
    max: 100,
    unit: key.unit
  }))
})

const seriesData = computed(() => {
  const data: Array<{ 
    name: string
    value: number[]
    rawValue: PredictionIndicators
    color: string
  }> = []
  
  data.push({
    name: '当前预测',
    value: PREDICTION_KEYS.map(key => normalizeValue(key.key, currentPrediction.value[key.key])),
    rawValue: { ...currentPrediction.value },
    color: '#1890ff'
  })
  
  const snapshotColors = ['#52c41a', '#faad14', '#f5222d']
  selectedSnapshots.value.forEach((snapshot, index) => {
    data.push({
      name: `快照 ${index + 1}: ${snapshot.note || new Date(snapshot.createdAt).toLocaleTimeString()}`,
      value: PREDICTION_KEYS.map(key => normalizeValue(key.key, snapshot.prediction[key.key])),
      rawValue: { ...snapshot.prediction },
      color: snapshotColors[index]
    })
  })
  
  return data
})

function initChart() {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chartInstance) return
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const seriesIndex = params.seriesIndex
        const series = seriesData.value[seriesIndex]
        if (!series) return ''
        
        let result = `<div style="font-weight: 600; margin-bottom: 8px;">${params.name}</div>`
        PREDICTION_KEYS.forEach((key) => {
          const rawVal = series.rawValue[key.key]
          result += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${key.color};"></span>
            <span>${key.name}:</span>
            <span style="font-weight: 600;">${rawVal.toFixed(key.key === 'durability' ? 0 : 2)} ${key.unit}</span>
          </div>`
        })
        return result
      }
    },
    legend: {
      show: props.showLegend !== false,
      bottom: 0,
      data: seriesData.value.map(d => d.name),
      textStyle: {
        fontSize: 12,
        color: '#666'
      }
    },
    radar: {
      indicator: radarIndicator.value,
      shape: 'polygon',
      splitNumber: 5,
      axisName: {
        color: '#333',
        fontSize: 12,
        formatter: (name?: string, indicator?: any) => {
          return `{name|${name || ''}}\n{unit|${indicator?.unit || ''}}`
        },
        rich: {
          name: {
            fontSize: 12,
            color: '#333',
            fontWeight: 500,
            lineHeight: 18
          },
          unit: {
            fontSize: 10,
            color: '#999',
            lineHeight: 14
          }
        }
      },
      splitLine: {
        lineStyle: {
          color: '#e8e8e8'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['#fafafa', '#f5f5f5']
        }
      },
      axisLine: {
        lineStyle: {
          color: '#d9d9d9'
        }
      }
    },
    series: [
      {
        name: '性能预测',
        type: 'radar',
        data: seriesData.value.map((item) => ({
          value: item.value,
          name: item.name,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: item.color
          },
          areaStyle: {
            opacity: 0.15,
            color: item.color
          },
          itemStyle: {
            color: item.color
          },
          emphasis: {
            areaStyle: {
              opacity: 0.25
            },
            lineStyle: {
              width: 3
            }
          }
        }))
      }
    ]
  }
  
  chartInstance.setOption(option)
}

function handleResize() {
  chartInstance?.resize()
}

watch(
  () => [currentPrediction.value, selectedSnapshots.value],
  () => {
    updateChart()
  },
  { deep: true }
)

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<template>
  <div class="prediction-radar-panel">
    <div class="panel-header">
      <h3 class="panel-title">性能指标预测</h3>
    </div>
    
    <div ref="chartRef" class="chart-container"></div>
    
    <div class="prediction-cards">
      <div
        v-for="key in PREDICTION_KEYS"
        :key="key.key"
        class="prediction-card"
        :style="{ borderLeftColor: key.color }"
      >
        <div class="card-header">
          <span class="card-icon" :style="{ backgroundColor: key.color + '20', color: key.color }">
            {{ key.key === 'strength' ? '💪' : 
               key.key === 'inkDiffusion' ? '🖋️' : 
               key.key === 'lightTransmittance' ? '💡' : 
               key.key === 'surfaceFineness' ? '✨' : '⏳' }}
          </span>
          <span class="card-name">{{ key.name }}</span>
        </div>
        <div class="card-value" :style="{ color: key.color }">
          {{ currentPrediction[key.key].toFixed(key.key === 'durability' ? 0 : 2) }}
          <span class="card-unit">{{ key.unit }}</span>
        </div>
        <div class="card-desc">{{ key.description }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prediction-radar-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  margin-bottom: 12px;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-container {
  flex: 1;
  min-height: 320px;
  width: 100%;
}

.prediction-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.prediction-card {
  padding: 12px;
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 8px;
  border-left: 4px solid #1890ff;
  transition: all 0.2s;
}

.prediction-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.card-name {
  font-size: 12px;
  font-weight: 500;
  color: #666;
}

.card-value {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1.2;
}

.card-unit {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.8;
  margin-left: 2px;
}

.card-desc {
  font-size: 11px;
  color: #999;
  line-height: 1.4;
}

@media (max-width: 1200px) {
  .prediction-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .prediction-cards {
    grid-template-columns: 1fr;
  }
}
</style>
