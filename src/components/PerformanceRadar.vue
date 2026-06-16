<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useRecipeStore } from '../stores/recipe'
import { PERFORMANCE_KEYS } from '../types'

const props = defineProps<{
  title?: string
  showLegend?: boolean
}>()

const store = useRecipeStore()
const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const radarIndicator = computed(() => {
  return PERFORMANCE_KEYS.map(key => ({
    name: key.name,
    max: 100
  }))
})

const selectedRecipes = computed(() => {
  return store.recipes.filter(r => store.selectedRecipeIds.includes(r.id))
})

const seriesData = computed(() => {
  const data: Array<{ name: string; value: number[] }> = []

  data.push({
    name: '当前配方',
    value: PERFORMANCE_KEYS.map(key => store.currentPerformance[key.key])
  })

  selectedRecipes.value.forEach(recipe => {
    data.push({
      name: recipe.name,
      value: PERFORMANCE_KEYS.map(key => recipe.performance[key.key])
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

  const seriesColors = ['#1890ff', '#52c41a', '#faad14', '#f5222d']

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item'
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
        fontSize: 13
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
        name: '纸张性能',
        type: 'radar',
        data: seriesData.value.map((item, index) => ({
          value: item.value,
          name: item.name,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: seriesColors[index]
          },
          areaStyle: {
            opacity: 0.15,
            color: seriesColors[index]
          },
          itemStyle: {
            color: seriesColors[index]
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
  () => [store.currentPerformance, store.selectedRecipeIds],
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
  <div class="chart-panel">
    <h3 class="panel-title">{{ title || '纸张性能雷达图' }}</h3>
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<style scoped>
.chart-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  flex-shrink: 0;
}

.chart-container {
  flex: 1;
  min-height: 300px;
  width: 100%;
}
</style>
