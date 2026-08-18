<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted, computed, ref, watch } from 'vue'
import { usePetStore } from '@/stores/pet'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  accountId: string
  accountRunning: boolean
}>()

const petStore = usePetStore()
const toast = useToastStore()
const { overview, dogs, dogFoods, guardLogs, loading, currentTab, feedLoading } = storeToRefs(petStore)

const error = ref('')
const qualityColors = {
  普通: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
  稀有: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  珍品: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  天工: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
} as Record<string, string>

const TABS = [
  { key: 'overview', label: '狗狗总览', desc: '查看与管理守护狗狗', icon: 'i-carbon-paw' },
  { key: 'food', label: '狗粮管理', desc: '查看狗粮库存与喂食', icon: 'i-carbon-basketball' },
  { key: 'logs', label: '守护日志', desc: '查看防护日志记录', icon: 'i-carbon-notebook' },
] as const

const brokenImages = ref<Set<string>>(new Set())

const firstOwnedDog = computed(
  () => dogs.value.find(d => d.status === 'guarding' || d.status === 'active') || null,
)

function markImageBroken(key: string) {
  brokenImages.value.add(key)
}

function formatGuardTime(ts: number | string): string {
  if (!ts)
    return ''
  const num = typeof ts === 'string' ? Number.parseInt(ts) : ts
  if (Number.isNaN(num) || num <= 0)
    return ''
  const d = new Date(num * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function handleDeploy(dogId: number) {
  if (!props.accountId)
    return
  const result = await petStore.deployDog(props.accountId, dogId)
  if (result?.ok)
    toast.success('上阵成功')
  else toast.error(result?.error || '上阵失败')
}

async function handleWithdraw() {
  if (!props.accountId)
    return
  const result = await petStore.withdrawDog(props.accountId)
  if (result?.ok)
    toast.success('已收起')
  else toast.error(result?.error || '操作失败')
}

async function handleFeed(foodId: number) {
  if (!props.accountId)
    return
  try {
    await petStore.feedDog(props.accountId, foodId, 1)
    toast.success('喂食成功')
    refreshCurrentTab()
  }
  catch (e: any) {
    toast.error(e.message || '喂食失败')
  }
}

async function refreshCurrentTab() {
  error.value = ''
  if (!props.accountId)
    return
  if (!props.accountRunning) {
    error.value = '当前账号未运行，请先启动账号后再查看宠物。'
    return
  }
  switch (currentTab.value) {
    case 'overview':
      await petStore.fetchOverview(props.accountId)
      break
    case 'food':
      await Promise.all([petStore.fetchFoodItems(props.accountId), petStore.fetchPetStatus(props.accountId)])
      break
    case 'logs':
      await petStore.fetchGuardLogs(props.accountId)
      break
  }
}

watch(() => props.accountId, (newId) => {
  if (newId) {
    petStore.clear()
    refreshCurrentTab()
  }
})
watch(() => props.accountRunning, () => {
  if (props.accountId)
    refreshCurrentTab()
})
onMounted(() => {
  if (props.accountId)
    refreshCurrentTab()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 子选项卡导航 -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="tab in TABS" :key="tab.key"
        class="min-h-[44px] flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors"
        :class="currentTab === tab.key
          ? 'text-white shadow-md'
          : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
        :style="currentTab === tab.key ? { backgroundColor: 'var(--theme-primary)' } : {}"
        @click="currentTab = tab.key; refreshCurrentTab()"
      >
        <div class="text-lg" :class="[tab.icon]" />
        <div class="text-left text-sm leading-tight">
          <div>{{ tab.label }}</div>
          <div class="text-xs opacity-70">
            {{ tab.desc }}
          </div>
        </div>
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
      <div class="flex items-center gap-2">
        <span class="i-carbon-warning text-lg" />
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- 内容区 -->
    <div>
      <!-- ===== 狗狗总览 ===== -->
      <template v-if="currentTab === 'overview'">
        <!-- 顶部概要卡片 -->
        <div v-if="dogs.length > 0" class="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <div class="h-16 w-16 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                <img
                  v-if="!brokenImages.has('overview-dog')"
                  :src="overview?.currentDog?.image || firstOwnedDog?.image"
                  :alt="overview?.currentDog?.name || firstOwnedDog?.name"
                  class="h-full w-full object-cover"
                  @error="markImageBroken('overview-dog')"
                >
                <div v-else class="h-full w-full flex items-center justify-center text-gray-300">
                  <div class="i-carbon-dog-walker text-3xl" />
                </div>
              </div>
            </div>
            <div class="flex-1">
              <div class="mb-1 flex items-center gap-2">
                <span class="text-lg font-bold">{{ overview?.currentDog?.name || firstOwnedDog?.name || '未部署' }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="qualityColors[(overview?.currentDog?.quality || firstOwnedDog?.quality || '')] || 'text-gray-500 bg-gray-100'"
                >
                  {{ overview?.currentDog?.quality || firstOwnedDog?.quality || '-' }}
                </span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="overview?.currentDog
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
                >
                  {{ overview?.currentDog ? overview.currentDog.statusLabel : '未部署' }}
                </span>
              </div>
              <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
                {{ overview?.currentDog?.description || firstOwnedDog?.description || '' }}
              </p>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <div class="text-xs text-gray-400">
                    狗狗数量
                  </div>
                  <div class="font-bold">
                    {{ overview?.dogCount ?? 0 }}
                  </div>
                  <div class="text-xs text-gray-400">
                    已激活 {{ overview?.activeCount ?? 0 }} 只
                  </div>
                </div>
                <div>
                  <div class="text-xs text-gray-400">
                    守护概率
                  </div>
                  <div class="font-bold">
                    {{ overview?.probability ?? 0 }}%
                  </div>
                  <div class="text-xs text-gray-400">
                    当前展示狗狗
                  </div>
                </div>
                <div v-if="overview?.currentDog || (overview?.feedRemainSec ?? 0) > 0">
                  <div class="text-xs text-gray-400">
                    狗粮剩余时间
                  </div>
                  <div class="font-bold">
                    {{ overview?.feedRemainText ?? '无' }}
                  </div>
                  <div class="text-xs text-gray-400">
                    当前守护可用时长
                  </div>
                </div>
                <div>
                  <div class="text-xs text-gray-400">
                    狗粮折合时间
                  </div>
                  <div class="font-bold">
                    {{ overview?.totalFeedText ?? '无' }}
                  </div>
                  <div class="text-xs text-gray-400">
                    库存 {{ overview?.foodStockCount ?? 0 }} 个
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载或空状态 -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="i-carbon-circle-dash animate-spin text-2xl text-gray-400" />
          <span class="ml-2 text-gray-400">加载中...</span>
        </div>
        <div v-else-if="!dogs.length" class="py-12 text-center text-gray-400">
          暂无狗狗数据
        </div>

        <!-- 狗狗列表 -->
        <div v-else>
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-lg font-bold">
              狗狗列表
            </h3>
            <button
              class="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="refreshCurrentTab()"
            >
              <span class="i-carbon-renew mr-1" /> 刷新
            </button>
          </div>
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-3 md:grid-cols-2">
            <div
              v-for="dog in dogs" :key="dog.dogId"
              class="rounded-xl bg-white p-4 shadow-sm transition-shadow dark:bg-gray-800"
              :class="dog.status === 'notOwned' ? 'opacity-60' : 'hover:shadow-md'"
            >
              <div class="mb-3 flex items-start gap-3">
                <div class="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                  <img
                    v-if="!brokenImages.has(`dog-${dog.dogId}`)"
                    :src="dog.image"
                    :alt="dog.name"
                    class="h-full w-full object-cover"
                    @error="markImageBroken(`dog-${dog.dogId}`)"
                  >
                  <div v-else class="h-full w-full flex items-center justify-center text-gray-300">
                    <div class="i-carbon-dog-walker text-2xl" />
                  </div>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold">{{ dog.name }}</span>
                    <span
                      class="rounded-full px-1.5 py-0.5 text-xs font-medium"
                      :class="qualityColors[dog.quality] || 'text-gray-500 bg-gray-100'"
                    >
                      {{ dog.quality }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-400">
                    {{ dog.statusLabel }}
                  </div>
                </div>
              </div>
              <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
                {{ dog.description }}
              </p>
              <div class="grid grid-cols-3 mb-3 gap-2 text-center text-xs">
                <div>
                  <div class="text-gray-400">
                    状态
                  </div>
                  <div class="font-medium">
                    {{ dog.statusLabel }}
                  </div>
                </div>
                <div>
                  <div class="text-gray-400">
                    概率
                  </div>
                  <div class="font-medium">
                    {{ dog.probability }}%
                  </div>
                </div>
                <div>
                  <div class="text-gray-400">
                    品质
                  </div>
                  <div class="font-medium">
                    {{ dog.quality }}
                  </div>
                </div>
              </div>
              <!-- 操作按钮 -->
              <button
                v-if="dog.status === 'active'"
                class="w-full rounded-lg py-2 text-sm text-white font-medium transition-opacity hover:opacity-90"
                :style="{ backgroundColor: 'var(--theme-primary)' }"
                @click="handleDeploy(dog.dogId)"
              >
                上阵
              </button>
              <button
                v-else-if="dog.status === 'guarding'"
                class="w-full rounded-lg bg-red-500 py-2 text-sm text-white font-medium transition-opacity hover:opacity-90"
                @click="handleWithdraw()"
              >
                收起
              </button>
              <div
                v-else
                class="w-full rounded-lg bg-gray-100 py-2 text-center text-sm font-medium text-gray-400 dark:bg-gray-700 dark:text-gray-500"
              >
                未拥有
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ===== 狗粮管理 ===== -->
      <template v-if="currentTab === 'food'">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-bold">
            狗粮库存
          </h3>
          <div v-if="overview" class="text-xs text-gray-400">
            剩余容量: {{ overview.feedRemainText || '-' }} / 30天
          </div>
        </div>
        <div v-if="loading" class="py-12 text-center text-gray-400">
          加载中...
        </div>
        <div v-else-if="!dogFoods.length" class="py-12 text-center text-gray-400">
          暂无狗粮
        </div>
        <div v-else class="grid grid-cols-1 gap-3 lg:grid-cols-3 sm:grid-cols-2">
          <div
            v-for="food in dogFoods" :key="food.id"
            class="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
          >
            <div class="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
              <img
                v-if="!brokenImages.has(`food-${food.id}`)"
                :src="petStore.getDogFoodImageUrl(food.id)"
                :alt="food.name"
                class="h-full w-full object-cover"
                @error="markImageBroken(`food-${food.id}`)"
              >
              <div v-else class="h-full w-full flex items-center justify-center text-gray-300">
                <div class="i-carbon-basketball text-2xl" />
              </div>
            </div>
            <div class="flex-1">
              <div class="font-bold">
                {{ food.name }}
              </div>
              <div class="text-xs text-gray-400">
                {{ food.days }}天狗粮
              </div>
              <div class="mt-1 text-sm text-gray-500">
                x{{ food.count }}
              </div>
            </div>
            <button
              class="rounded-lg px-4 py-2 text-sm text-white font-medium transition-opacity disabled:opacity-40 hover:opacity-90"
              :style="{ backgroundColor: 'var(--theme-primary)' }"
              :disabled="food.count <= 0 || feedLoading"
              @click="handleFeed(food.id)"
            >
              <span v-if="feedLoading" class="i-carbon-loading mr-1 animate-spin" />
              {{ feedLoading ? '喂食中...' : '喂食' }}
            </button>
          </div>
        </div>
      </template>

      <!-- ===== 守护日志 ===== -->
      <template v-if="currentTab === 'logs'">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-lg font-bold">
            防护日志
          </h3>
          <button
            class="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            @click="refreshCurrentTab()"
          >
            <span class="i-carbon-renew mr-1" /> 刷新
          </button>
        </div>
        <div v-if="loading" class="py-12 text-center text-gray-400">
          加载中...
        </div>
        <div v-else-if="!guardLogs.length" class="py-12 text-center text-gray-400">
          暂无防护日志
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(log, idx) in guardLogs" :key="idx"
            class="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800"
          >
            <div class="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <img
                v-if="log.friendAvatar && !brokenImages.has(`avatar-${idx}`)"
                :src="log.friendAvatar"
                :alt="log.friendName"
                class="h-full w-full object-cover"
                @error="markImageBroken(`avatar-${idx}`)"
              >
              <div v-else class="h-full w-full flex items-center justify-center text-gray-300">
                <div class="i-carbon-user text-lg" />
              </div>
            </div>
            <div class="flex-1">
              <div class="font-medium">
                {{ log.friendName }}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">
                被{{ log.dogName }}咬了{{ log.biteCount }}次，拦截了{{ log.goldIntercepted }}金币
              </div>
            </div>
            <div class="text-right text-xs text-gray-400">
              <div>{{ formatGuardTime(log.timestamp) }}</div>
              <div class="text-green-500 font-medium">
                {{ log.status }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
