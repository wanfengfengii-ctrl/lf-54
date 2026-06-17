<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useRecipeStore } from '../stores/recipe'
import { generatePoreHistogram } from '../utils/microstructure'

const store = useRecipeStore()
const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const microstructure = computed(() => store.currentMicrostructure)
const processParams = computed(() => store.processParams)
const fiberRatio = computed(() => store.currentRatio)

const histogramData = computed(() => {
  return generatePoreHistogram(microstructure.value, fiberRatio.value, processParams.value)
})

const avgPoreSize = computed(() => microstructure.value.poreSize)
const poreDistribution = computed(() => microstructure.value.poreDistribution)

const selectedSnapshots = computed(() => store.selectedSnapshots)

const seriesData = computed(() => {
  const data: Array<{ name: string; data: number[]; color: string }> = []
  
  data.push({
    name: '当前模拟',
    data: histogramData.value.map(d => d.count),
    color: '#1890ff'
  })
  
  const snapshotColors = ['#52c41a', '#faad14', '#f5222d']
  selectedSnapshots.value.forEach((snapshot, index) => {
    const histData = snapshot.poreHistogram && snapshot.poreHistogram.length > 0
      ? snapshot.poreHistogram
      : generatePoreHistogram(snapshot.microstructure, snapshot.fiberRatio, snapshot.params)
    data.push({
      name: `快照 ${index + 1}: ${snapshot.note || new Date(snapshot.createdAt).toLocaleTimeString()}`,
      data: histData.map(d => d.count),
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
  
  const xAxisData = histogramData.value.map(d => `${d.range}μm`)
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        let result = `<div style="font-weight: 600; margin-bottom: 8px;">孔径分布</div>`
        params.forEach((item: any) => {
          result += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${item.color};"></span>
            <span>${item.seriesName}:</span>
            <span style="font-weight: 600;">${item.value} 个</span>
          </div>`
        })
        return result
      }
    },
    legend: {
      bottom: 0,
      textStyle: {
        fontSize: 12,
        color: '#666'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: {
        fontSize: 11,
        color: '#666',
        rotate: 0
      },
      axisLine: {
        lineStyle: {
          color: '#d9d9d9'
        }
      },
      axisTick: {
        show: false
      },
      name: '孔径范围 (μm)',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: {
        fontSize: 12,
        color: '#666'
      }
    },
    yAxis: {
      type: 'value',
      name: '孔隙数量',
      nameTextStyle: {
        fontSize: 12,
        color: '#666'
      },
      axisLabel: {
        fontSize: 11,
        color: '#666'
      },
      axisLine: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0',
          type: 'dashed'
        }
      }
    },
    series: seriesData.value.map((series, index) => ({
      name: series.name,
      type: 'bar',
      data: series.data,
      barWidth: seriesData.value.length > 1 ? `${60 / seriesData.value.length}%` : '50%',
      itemStyle: {
        color: series.color,
        borderRadius: [4, 4, 0, 0],
        opacity: 0.85
      },
      emphasis: {
        itemStyle: {
          opacity: 1,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.2)'
        }
      },
      animationDelay: index * 100
    }))
  }
  
  chartInstance.setOption(option)
}

function handleResize() {
  chartInstance?.resize()
}

watch(
  () => [histogramData.value, selectedSnapshots.value],
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
  <div class="pore-histogram-panel">
    <div class="panel-header">
      <h3 class="panel-title">孔隙分布分析</h3>
      <div class="pore-stats">
        <div class="stat-item">
          <span class="stat-icon">📏</span>
          <div class="stat-content">
            <span class="stat-label">平均孔径</span>
            <span class="stat-value">{{ avgPoreSize.toFixed(2) }} μm</span>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🎯</span>
          <div class="stat-content">
            <span class="stat-label">分布均匀度</span>
            <span class="stat-value">{{ poreDistribution.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div ref="chartRef" class="chart-container"></div>
    
    <div class="interpretation-box">
      <div class="interpretation-title">📊 结果解读</div>
      <div class="interpretation-content">
        <p v-if="avgPoreSize < 10">
          <strong>微孔结构：</strong>平均孔径较小（{{ avgPoreSize.toFixed(2) }}μm），纸张结构致密，
          适合需要高表面强度和低渗透性的应用，如印刷纸、包装纸。
        </p>
        <p v-else-if="avgPoreSize < 20">
          <strong>中孔结构：</strong>平均孔径适中（{{ avgPoreSize.toFixed(2) }}μm），
          在强度和吸墨性之间取得良好平衡，是书画用纸的理想范围。
        </p>
        <p v-else>
          <strong>大孔结构：</strong>平均孔径较大（{{ avgPoreSize.toFixed(2) }}μm），
          纸张孔隙丰富，吸墨性强但表面强度较低，适合吸墨纸、过滤纸等特殊用途。
        </p>
        <p v-if="poreDistribution > 80">
          孔径分布<span class="highlight good">非常均匀</span>，成纸质量稳定，性能一致性好。
        </p>
        <p v-else-if="poreDistribution > 60">
          孔径分布<span class="highlight normal">较为均匀</span>，整体性能良好。
        </p>
        <p v-else>
          孔径分布<span class="highlight warning">不够均匀</span>，
          建议提高打浆度或增加压榨压力以改善纤维分散和交织。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pore-histogram-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.pore-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #f6ffed 0%, #f0f9eb 100%);
  border-radius: 8px;
}

.stat-icon {
  font-size: 20px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 11px;
  color: #666;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #52c41a;
}

.chart-container {
  flex: 1;
  min-height: 280px;
  width: 100%;
}

.interpretation-box {
  margin-top: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 100%);
  border-radius: 8px;
  border: 1px solid #d6e4ff;
}

.interpretation-title {
  font-size: 13px;
  font-weight: 600;
  color: #2f54eb;
  margin-bottom: 8px;
}

.interpretation-content {
  font-size: 12px;
  color: #595959;
  line-height: 1.7;
}

.interpretation-content p {
  margin: 0 0 8px 0;
}

.interpretation-content p:last-child {
  margin-bottom: 0;
}

.highlight {
  font-weight: 600;
}

.highlight.good {
  color: #52c41a;
}

.highlight.normal {
  color: #1890ff;
}

.highlight.warning {
  color: #fa8c16;
}
</style>
