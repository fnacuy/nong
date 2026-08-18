<script setup lang="ts">
import type { CapitalModeConfig } from '@/components/CapitalModeCard.vue'
import type { PremiumQuietModeSlot, PremiumQuietModeType } from '@/stores/setting'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import CapitalModeCard from '@/components/CapitalModeCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import { useAccountStore } from '@/stores/account'
import { useSettingStore } from '@/stores/setting'
import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  currentAccountId: string | number | null | undefined
  currentAccountName: string | null
}>()

const settingStore = useSettingStore()
const userStore = useUserStore()
const toast = useToastStore()
const accountStore = useAccountStore()
const { currentAccount } = storeToRefs(accountStore)

const hasPremium = computed(() => userStore.hasPremiumPermission)
const accountRunning = computed(() => !!currentAccount.value?.running)

const loading = ref(false)
const saving = ref(false)

const capitalMode = ref<CapitalModeConfig>({
  enabled: false,
  guardSeconds: 10,
  dogId: 0,
})

const immersive = ref({
  enabled: false,
  start: '00:00',
  end: '06:00',
})

const turboMode = ref(false)

const quietMode = ref<{
  enabled: boolean
  slots: PremiumQuietModeSlot[]
}>({
  enabled: false,
  slots: [],
})

const quietModeOptions = [
  { label: '不偷不帮', value: 'no_steal_no_help' },
  { label: '只不偷菜', value: 'no_steal' },
  { label: '只不帮忙', value: 'no_help' },
]

let quietSlotSeq = 0

function clampGuardSeconds(value: number) {
  return Math.max(5, Math.min(300, Math.round(Number(value) || 10)))
}

function syncFromStore() {
  const s = settingStore.settings
  const auto = s.automation || {}
  capitalMode.value = {
    enabled: auto.capital_mode === true,
    guardSeconds: clampGuardSeconds(Number(auto.capital_mode_guard_seconds) || 10),
    dogId: Number(auto.capital_mode_dog_id) || 0,
  }
  immersive.value = {
    enabled: s.immersiveFarming?.enabled === true,
    start: s.immersiveFarming?.start || '00:00',
    end: s.immersiveFarming?.end || '06:00',
  }
  turboMode.value = auto.friend_turbo_mode === true
  const q = s.premiumQuietMode || {}
  quietMode.value = {
    enabled: q.enabled === true,
    slots: (q.slots || []).map(slot => ({
      id: String(slot.id || `s${Date.now()}_${++quietSlotSeq}`),
      mode: (slot.mode as PremiumQuietModeType) || 'no_steal_no_help',
      start: slot.start || '22:00',
      end: slot.end || '06:00',
    })),
  }
}

async function load() {
  if (!props.currentAccountId)
    return
  loading.value = true
  try {
    await settingStore.fetchSettings(String(props.currentAccountId))
    syncFromStore()
  }
  finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.currentAccountId, load)

function addQuietSlot() {
  quietMode.value.slots.push({
    id: `s${Date.now()}_${++quietSlotSeq}`,
    mode: 'no_steal_no_help',
    start: '22:00',
    end: '06:00',
  })
}

function removeQuietSlot(id: string) {
  quietMode.value.slots = quietMode.value.slots.filter(slot => slot.id !== id)
}

async function save() {
  if (!props.currentAccountId) {
    toast.error('请先选择账号')
    return
  }
  saving.value = true
  try {
    const automation = {
      ...settingStore.settings.automation,
      capital_mode: capitalMode.value.enabled,
      capital_mode_guard_seconds: clampGuardSeconds(capitalMode.value.guardSeconds),
      capital_mode_dog_id: capitalMode.value.dogId,
      friend_turbo_mode: turboMode.value,
    }
    const fullSettings = {
      ...settingStore.settings,
      immersiveFarming: {
        enabled: immersive.value.enabled,
        start: immersive.value.start,
        end: immersive.value.end,
      },
      premiumQuietMode: {
        enabled: quietMode.value.enabled,
        slots: quietMode.value.slots.map(slot => ({
          id: slot.id,
          mode: slot.mode,
          start: slot.start,
          end: slot.end,
        })),
      },
      automation,
    }
    const res = await settingStore.saveSettings(String(props.currentAccountId), fullSettings)
    if (res.ok) {
      toast.success('高级功能设置已保存')
      syncFromStore()
    }
    else {
      toast.error(res.error || '保存失败')
    }
  }
  catch (e: any) {
    toast.error(e?.message || '保存失败')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="flex items-center gap-2 text-lg text-gray-900 font-bold max-sm:text-base dark:text-gray-100">
        <div class="i-carbon-wifi-bridge" />
        高级功能
        <span v-if="currentAccountName" class="ml-2 text-sm text-gray-500 font-normal dark:text-gray-400">
          ({{ currentAccountName }})
        </span>
      </h3>
    </div>

    <!-- 未激活引导 -->
    <div
      v-if="!hasPremium"
      class="border border-amber-200 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <div class="mb-1 flex items-center gap-2 font-medium">
        <div class="i-carbon-locked" />
        高级功能未激活
      </div>
      <p class="leading-5">
        资本模式、沉浸式务农、疯狗模式与高级静谧模式需要「高级功能」权限。请先在「激活卡密」中激活高级功能卡密，激活后即可配置。
      </p>
    </div>

    <div v-if="loading" class="py-4 text-center text-gray-500">
      <div class="i-svg-spinners-ring-resize mx-auto mb-2 text-2xl" />
      <p>加载中...</p>
    </div>

    <div
      v-else-if="!currentAccountId"
      class="py-8 text-center text-gray-500"
    >
      <div class="i-carbon-settings-adjust mx-auto mb-2 text-3xl text-gray-400" />
      <p>请先选择账号</p>
    </div>

    <div
      v-else
      class="space-y-4"
      :class="hasPremium ? '' : 'pointer-events-none select-none opacity-50'"
    >
      <CapitalModeCard
        v-model="capitalMode"
        :account-id="String(currentAccountId)"
        :account-running="accountRunning"
      />

      <!-- 沉浸式务农 -->
      <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-base text-gray-900 font-bold dark:text-gray-100">
              沉浸式务农
            </div>
            <div class="text-xs text-gray-400">
              时段内仅保留好友帮助，暂停自家农场、偷菜、活动、商店等自动化
            </div>
          </div>
          <BaseSwitch v-model="immersive.enabled" />
        </div>
        <div class="mt-3 flex items-center gap-2">
          <input
            v-model="immersive.start"
            type="time"
            class="w-24 border border-gray-200 rounded bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            :disabled="!immersive.enabled"
          >
          <span class="text-xs text-gray-500">-</span>
          <input
            v-model="immersive.end"
            type="time"
            class="w-24 border border-gray-200 rounded bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            :disabled="!immersive.enabled"
          >
        </div>
      </div>

      <!-- 疯狗模式 -->
      <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-base text-gray-900 font-bold dark:text-gray-100">
              疯狗模式
            </div>
            <div class="text-xs text-gray-400">
              只帮护主犬，快速刷盒子
            </div>
          </div>
          <BaseSwitch v-model="turboMode" />
        </div>
      </div>

      <!-- 高级静谧模式 -->
      <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="text-base text-gray-900 font-bold dark:text-gray-100">
              高级静谧模式
            </div>
            <div class="text-xs text-gray-400">
              在指定时间段内调整偷菜/帮忙行为，支持多个时段；捣乱不受影响
            </div>
          </div>
          <BaseSwitch v-model="quietMode.enabled" />
        </div>

        <div v-if="quietMode.enabled" class="mt-4 space-y-3">
          <div
            v-for="slot in quietMode.slots"
            :key="slot.id"
            class="flex flex-wrap items-center gap-3 border border-gray-200 rounded-lg p-3 dark:border-gray-700"
          >
            <BaseSelect
              v-model="slot.mode"
              :options="quietModeOptions"
              class="min-w-36"
            />
            <div class="flex items-center gap-2">
              <input
                v-model="slot.start"
                type="time"
                class="w-24 border border-gray-200 rounded bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
              <span class="text-xs text-gray-500">-</span>
              <input
                v-model="slot.end"
                type="time"
                class="w-24 border border-gray-200 rounded bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
            </div>
            <BaseButton variant="danger" size="sm" @click="removeQuietSlot(slot.id)">
              删除
            </BaseButton>
          </div>

          <p v-if="quietMode.slots.length === 0" class="text-xs text-gray-400">
            尚未配置时间段，点击下方按钮添加。
          </p>

          <BaseButton variant="secondary" size="sm" @click="addQuietSlot">
            添加时间段
          </BaseButton>

          <p class="text-xs text-gray-400 leading-5">
            模式说明：不偷不帮（停止偷菜与帮忙）、只不偷菜（仅停止偷菜）、只不帮忙（仅停止帮忙）。<br>
            时间段可跨午夜，例如 22:00 - 06:00 表示隔天凌晨结束。<br>
            捣乱（放草虫）不受静谧模式影响。
          </p>
        </div>
      </div>

      <!-- 保存 -->
      <div class="flex justify-end gap-2 border-t pt-3 dark:border-gray-700">
        <BaseButton
          variant="primary"
          size="sm"
          :loading="saving"
          :disabled="!hasPremium"
          @click="save"
        >
          保存高级功能
        </BaseButton>
      </div>
    </div>
  </div>
</template>
