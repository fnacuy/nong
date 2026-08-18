<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/api'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'

export interface CapitalModeConfig {
  enabled: boolean
  guardSeconds: number
  dogId: number
}

const props = defineProps<{
  accountId: string
  accountRunning: boolean
}>()

const model = defineModel<CapitalModeConfig>('modelValue', { required: true })

const DOGS = [
  { id: 90001, name: '田园犬', guardRate: 10 },
  { id: 90002, name: '牧羊犬', guardRate: 30 },
  { id: 90003, name: '斑点狗', guardRate: 50 },
  { id: 90011, name: '柯基', guardRate: 50 },
  { id: 90021, name: '护主犬', guardRate: 50 },
]

const enabled = computed({
  get: () => model.value.enabled,
  set: (v) => { model.value = { ...model.value, enabled: v } },
})
const guardSeconds = computed({
  get: () => model.value.guardSeconds,
  set: (v) => { model.value = { ...model.value, guardSeconds: Number(v) } },
})
const selectedDogId = computed({
  get: () => model.value.dogId,
  set: (v) => { model.value = { ...model.value, dogId: v } },
})

const loading = ref(false)
const ownedDogIds = ref<Set<number>>(new Set())
const inactiveDogIds = ref<Set<number>>(new Set())
const dogsLoading = ref(false)

function clampGuardSeconds(value: number) {
  return Math.max(5, Math.min(300, Math.round(Number(value) || 10)))
}

function isOwned(dogId: number) {
  return ownedDogIds.value.has(dogId)
}

function isInactive(dogId: number) {
  return inactiveDogIds.value.has(dogId)
}

async function fetchOwnedDogs() {
  if (!props.accountId)
    return
  dogsLoading.value = true
  ownedDogIds.value = new Set()
  inactiveDogIds.value = new Set()
  try {
    const res = await api.get('/api/dog/info', {
      headers: { 'x-account-id': props.accountId },
      timeout: 20000,
    })
    const result = res.data?.data
    if (result && result.ok !== false && Array.isArray(result.dogs)) {
      const owned = new Set<number>()
      const inactive = new Set<number>()
      for (const dog of result.dogs) {
        const id = Number(dog?.id)
        if (id <= 0)
          continue
        // active=1 表示已激活、可上阵；active=0 表示已拥有但未激活
        if (Number(dog?.active) === 1)
          owned.add(id)
        else
          inactive.add(id)
      }
      ownedDogIds.value = owned
      inactiveDogIds.value = inactive
    }
    if (selectedDogId.value && !ownedDogIds.value.has(selectedDogId.value))
      selectedDogId.value = 0
  }
  catch {
    // 查询失败保留空集合，界面提示暂未查询到已拥有的狗狗
  }
  finally {
    dogsLoading.value = false
  }
}

onMounted(fetchOwnedDogs)
watch(() => props.accountId, fetchOwnedDogs)

function toggleDog(id: number) {
  if (!isOwned(id))
    return
  selectedDogId.value = selectedDogId.value === id ? 0 : id
}
</script>

<template>
  <div class="space-y-4">
    <!-- 说明 -->
    <div class="rounded-lg bg-purple-50 p-3 text-sm text-purple-800 dark:bg-purple-900/20 sm:p-4 dark:text-purple-200">
      <div class="mb-1 flex items-center gap-2 font-medium">
        <div class="i-carbon-dog-walker" />
        资本模式
      </div>
      <ul class="list-disc pl-5 text-purple-700/90 space-y-1 dark:text-purple-200/80">
        <li>开启后，当自己土地的农作物即将成熟时，自动上阵选中的狗狗进行守护。</li>
        <li>收获完成后延迟 5 秒自动收回狗狗。</li>
      </ul>
    </div>

    <!-- 账号在线提示 -->
    <div
      v-if="!accountRunning"
      class="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 sm:p-4 dark:text-amber-300"
    >
      <div class="i-carbon-warning-alt" />
      当前账号未在线，启动该账号后资本模式才会生效。
    </div>

    <!-- 配置卡片 -->
    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-5">
      <div v-if="loading" class="py-4 text-center text-gray-500">
        <div class="i-svg-spinners-ring-resize mx-auto mb-2 text-2xl" />
        <p>加载中...</p>
      </div>

      <div v-else class="space-y-5">
        <!-- 启用开关 -->
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-base text-gray-900 font-bold dark:text-gray-100">
              资本模式
            </div>
            <div class="text-xs text-gray-400">
              农作物成熟前自动放狗，收获后延迟 5 秒收狗
            </div>
          </div>
          <BaseSwitch v-model="enabled" />
        </div>

        <!-- 成熟前放狗秒数 -->
        <div class="max-w-xs">
          <BaseInput
            v-model="guardSeconds"
            type="number"
            label="成熟前放狗秒数"
            placeholder="10"
            :disabled="!enabled"
            @blur="guardSeconds = clampGuardSeconds(Number(guardSeconds))"
          />
          <p class="mt-1 text-xs text-gray-400">
            当距离农作物成熟时间 ≤ 此秒数时，自动上阵选中的狗狗（范围 5-300 秒，默认 10 秒）
          </p>
        </div>

        <!-- 选择上阵的狗狗 -->
        <div>
          <div class="mb-2 text-sm text-gray-600 font-medium dark:text-gray-300">
            选择上阵的狗狗
          </div>
          <div class="text-xs text-gray-400">
            仅能选择已拥有的狗狗，点击已选中的可取消
          </div>
          <div class="grid grid-cols-1 mt-3 gap-3 sm:grid-cols-3">
            <button
              v-for="dog in DOGS"
              :key="dog.id"
              type="button"
              class="border rounded-xl px-4 py-3 text-left transition-colors"
              :class="selectedDogId === dog.id
                ? 'cursor-pointer border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-600 dark:bg-purple-900/30 dark:text-purple-200'
                : isOwned(dog.id)
                  ? 'cursor-pointer border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-300'
                  : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'"
              :disabled="!isOwned(dog.id)"
              @click="toggleDog(dog.id)"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium">{{ dog.name }}</span>
                <span
                  v-if="selectedDogId === dog.id"
                  class="h-5 w-5 flex items-center justify-center rounded-full bg-purple-500 text-white"
                >
                  <div class="i-carbon-checkmark text-sm" />
                </span>
                <span
                  v-else-if="isInactive(dog.id)"
                  class="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                >
                  未激活
                </span>
                <span
                  v-else-if="!isOwned(dog.id)"
                  class="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                >
                  未拥有
                </span>
              </div>
              <div class="mt-1 text-xs opacity-80">
                守护概率 {{ dog.guardRate }}%
              </div>
            </button>
          </div>
          <p v-if="dogsLoading" class="mt-2 text-xs text-gray-400">
            正在查询已拥有的狗狗...
          </p>
          <p v-else-if="ownedDogIds.size === 0" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {{ inactiveDogIds.size > 0 ? '已拥有的狗狗均未激活，无法上阵。' : '暂未查询到已拥有的狗狗，请确保账号已在线。' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
