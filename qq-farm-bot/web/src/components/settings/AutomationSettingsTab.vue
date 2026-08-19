<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'

const props = withDefaults(defineProps<{
  currentAccountName: string | null
  currentAccountId: string | number | null | undefined
  loading: boolean
  saving: boolean
  fertilizerLandTypeOptions: { label: string, value: string }[]
  fertilizerOptions: { label: string, value: string | number }[]
  title?: string
  saveLabel?: string
}>(), {
  title: '自动控制',
  saveLabel: '保存自动控制',
})

const emit = defineEmits<{
  save: []
}>()

const badTipVisible = ref(false)

function toggleBadTip() {
  badTipVisible.value = !badTipVisible.value
}

interface AutomationSettings {
  automation: {
    farm: boolean
    task: boolean
    sell: boolean
    friend: boolean
    farm_push: boolean
    land_upgrade: boolean
    friend_steal: boolean
    friend_help: boolean
    friend_bad: boolean
    friend_golden_bug: boolean
    friend_help_exp_limit: boolean
    friend_turbo_mode: boolean
    golden_bug_clear: boolean
    fertilizer_gift: boolean
    fertilizer_buy_organic: boolean
    fertilizer_buy_normal: boolean
    fertilizer: string
    skip_own_weed_bug: boolean
    fertilizer_multi_season: boolean
    fertilizer_land_types: string[]
    fertilizer_smart_seconds: number
    qixi_dew_use: boolean
    qixi_bridge_build: boolean
    qixi_sachet_gift: boolean
    qixi_friend_priority: number[]
  }
  autoAcceptFriendMinLevel: number
  fertilizerBuyOrganicCount: number
  fertilizerBuyOrganicThresholdHours: number
  fertilizerBuyNormalCount: number
  fertilizerBuyNormalThresholdHours: number
  fertilizerBuyCheckIntervalMinutes: number
  goldenBugKeepCount: number
  goldenBugRoundLimit: number
}

const settings = defineModel<AutomationSettings>('settings', { required: true })

const router = useRouter()
function goToAdvancedFeatures() {
  localStorage.setItem('settings-active-tab', 'activate-card')
  localStorage.setItem('settings-scroll-to', 'advanced-features')
  router.push({ name: 'Settings' })
}

function isFastMatureFertilizerMode(mode: string) {
  return mode === 'smart' || mode === 'smart_only' || mode === 'smart_normal'
}

const qixiFriends = ref<Array<{ gid: number, name: string, level?: number }>>([])
function qixiPriority() {
  return Array.isArray(settings.value.automation.qixi_friend_priority)
    ? settings.value.automation.qixi_friend_priority
    : []
}
async function loadQixiFriends() {
  if (!props.currentAccountId)
    return
  try {
    const { data } = await api.get('/api/activity/qixi', { headers: { 'x-account-id': props.currentAccountId } })
    qixiFriends.value = data?.friends || []
  }
  catch { qixiFriends.value = [] }
}
function toggleQixiFriend(gid: number) {
  const list = qixiPriority()
  settings.value.automation.qixi_friend_priority = list.includes(gid) ? list.filter(id => id !== gid) : [...list, gid]
}
function moveQixiFriend(index: number, direction: number) {
  const list = [...qixiPriority()]
  const target = index + direction
  if (target < 0 || target >= list.length)
    return
  const currentValue = list[index]
  const targetValue = list[target]
  if (currentValue === undefined || targetValue === undefined)
    return
  list[index] = targetValue
  list[target] = currentValue
  settings.value.automation.qixi_friend_priority = list
}
function qixiFriendName(gid: number) {
  return qixiFriends.value.find(friend => friend.gid === gid)?.name || `好友 ${gid}`
}
onMounted(loadQixiFriends)
watch(() => props.currentAccountId, loadQixiFriends)
</script>

<template>
  <div class="pb-20 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg text-gray-900 font-bold max-sm:text-base dark:text-gray-100">
        {{ title }}
        <span v-if="currentAccountName" class="ml-2 text-sm text-gray-500 font-normal dark:text-gray-400">
          ({{ currentAccountName }})
        </span>
      </h3>
    </div>

    <div v-if="loading" class="py-4 text-center text-gray-500">
      <div class="i-svg-spinners-ring-resize mx-auto mb-2 text-2xl" />
      <p>加载中...</p>
    </div>

    <div v-else-if="!currentAccountId" class="py-8 text-center text-gray-500">
      <div class="i-carbon-settings-adjust mx-auto mb-2 text-3xl text-gray-400" />
      <p>请先选择账号</p>
    </div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-2 gap-2 sm:gap-3">
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">自动种植收获</span>
          <BaseSwitch v-model="settings.automation.farm" />
        </div>
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">自动做任务</span>
          <BaseSwitch v-model="settings.automation.task" />
        </div>
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">自动卖果实</span>
          <BaseSwitch v-model="settings.automation.sell" />
        </div>
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">自动好友互动</span>
          <BaseSwitch v-model="settings.automation.friend" />
        </div>
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">推送触发巡田</span>
          <BaseSwitch v-model="settings.automation.farm_push" />
        </div>
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">自动升级土地</span>
          <BaseSwitch v-model="settings.automation.land_upgrade" />
        </div>
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">自动填充化肥</span>
          <BaseSwitch v-model="settings.automation.fertilizer_gift" />
        </div>
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">自动购买有机化肥</span>
          <BaseSwitch v-model="settings.automation.fertilizer_buy_organic" />
        </div>
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">自动购买无机化肥</span>
          <BaseSwitch v-model="settings.automation.fertilizer_buy_normal" />
        </div>
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">不除自己草虫</span>
          <BaseSwitch v-model="settings.automation.skip_own_weed_bug" />
        </div>
        <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <span class="text-[13px] text-gray-800 dark:text-gray-100">自动清除黄金虫</span>
          <BaseSwitch v-model="settings.automation.golden_bug_clear" />
        </div>
        <div class="flex items-center justify-center border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
          <button type="button" class="rainbow-text text-[13px] font-bold" @click="goToAdvancedFeatures">
            高级模式
          </button>
        </div>
      </div>

      <div class="rounded bg-violet-50 p-3 text-sm space-y-3 dark:bg-violet-900/20">
        <div class="text-violet-700 font-medium dark:text-violet-300">
          鹊桥寄情活动
        </div>
        <div class="grid grid-cols-2 gap-2 sm:gap-3">
          <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
            <span class="whitespace-nowrap text-[13px] text-gray-800 dark:text-gray-100">自动使用鹊羽灵露</span>
            <BaseSwitch v-model="settings.automation.qixi_dew_use" />
          </div>
          <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
            <span class="text-[13px] text-gray-800 dark:text-gray-100">自动驻建鹊桥</span>
            <BaseSwitch v-model="settings.automation.qixi_bridge_build" />
          </div>
          <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
            <span class="whitespace-nowrap text-[13px] text-gray-800 dark:text-gray-100">自动赠送鹊羽香囊</span>
            <BaseSwitch v-model="settings.automation.qixi_sachet_gift" />
          </div>
        </div>

        <div v-if="settings.automation.qixi_sachet_gift" class="border border-violet-200 rounded-lg bg-white p-4 dark:border-violet-800/60 dark:bg-gray-800">
          <div class="mb-3">
            <div class="text-sm text-gray-900 font-medium dark:text-white">
              香囊好友优先级
            </div>
            <div class="mt-1 text-xs text-gray-500">
              只向所选好友赠送；序号越小优先级越高，名单外好友不会自动获赠。
            </div>
          </div>
          <div v-if="qixiPriority().length" class="mb-3 space-y-2">
            <div v-for="(gid, index) in qixiPriority()" :key="gid" class="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900/40">
              <span class="w-6 text-gray-400">{{ index + 1 }}</span><span class="min-w-0 flex-1 truncate">{{ qixiFriendName(gid) }}</span>
              <button type="button" class="text-gray-500 disabled:opacity-30" :disabled="index === 0" @click="moveQixiFriend(index, -1)">
                <span class="i-carbon-arrow-up" />
              </button>
              <button type="button" class="text-gray-500 disabled:opacity-30" :disabled="index === qixiPriority().length - 1" @click="moveQixiFriend(index, 1)">
                <span class="i-carbon-arrow-down" />
              </button>
              <button type="button" class="text-red-500" @click="toggleQixiFriend(gid)">
                <span class="i-carbon-close" />
              </button>
            </div>
          </div>
          <div class="max-h-44 flex flex-wrap gap-2 overflow-y-auto">
            <button v-for="friend in qixiFriends.filter(item => !qixiPriority().includes(item.gid))" :key="friend.gid" type="button" class="border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 hover:border-violet-400 dark:text-gray-200" @click="toggleQixiFriend(friend.gid)">
              + {{ friend.name }}
            </button>
            <span v-if="!qixiFriends.length" class="text-xs text-gray-500">账号运行后可加载好友列表。</span>
          </div>
        </div>
      </div>

      <div v-if="settings.automation.fertilizer_buy_organic || settings.automation.fertilizer_buy_normal" class="rounded bg-green-50 p-3 text-sm space-y-3 dark:bg-green-900/20">
        <div v-if="settings.automation.fertilizer_buy_organic" class="space-y-2">
          <div class="text-green-700 font-medium dark:text-green-400">
            有机化肥设置
          </div>
          <div class="flex flex-wrap gap-4">
            <BaseInput
              v-model.number="settings.fertilizerBuyOrganicCount"
              label="购买数量"
              type="number"
              min="1"
              max="10000"
            />
            <BaseInput
              v-model.number="settings.fertilizerBuyOrganicThresholdHours"
              label="触发阈值 (小时)"
              type="number"
              min="1"
              max="990"
            />
          </div>
        </div>
        <div v-if="settings.automation.fertilizer_buy_normal" class="space-y-2">
          <div class="text-green-700 font-medium dark:text-green-400">
            无机化肥设置
          </div>
          <div class="flex flex-wrap gap-4">
            <BaseInput
              v-model.number="settings.fertilizerBuyNormalCount"
              label="购买数量"
              type="number"
              min="1"
              max="10000"
            />
            <BaseInput
              v-model.number="settings.fertilizerBuyNormalThresholdHours"
              label="触发阈值 (小时)"
              type="number"
              min="1"
              max="990"
            />
          </div>
        </div>
        <div class="flex flex-wrap gap-4">
          <BaseInput
            v-model.number="settings.fertilizerBuyCheckIntervalMinutes"
            label="检测间隔 (分钟)"
            type="number"
            min="1"
            max="1440"
          />
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          系统会按照设定的检测间隔定时检测化肥容器剩余量，当低于触发阈值时自动购买。保存设置后会立即检测一次。同时开启两种化肥购买时，优先购买有机化肥。
        </p>
      </div>

      <div v-if="settings.automation.friend" class="space-y-2">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          好友互动
        </div>
        <div class="grid grid-cols-2 gap-2 sm:gap-3">
          <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
            <span class="text-[13px] text-gray-800 dark:text-gray-100">自动偷菜</span>
            <BaseSwitch v-model="settings.automation.friend_steal" />
          </div>
          <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
            <span class="text-[13px] text-gray-800 dark:text-gray-100">自动帮忙</span>
            <BaseSwitch v-model="settings.automation.friend_help" />
          </div>
          <div class="relative z-10 flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
            <div class="min-w-0 flex items-center gap-1.5">
              <span class="text-[13px] text-gray-800 dark:text-gray-100">自动捣乱</span>
              <span
                class="h-4 w-4 flex cursor-pointer select-none items-center justify-center rounded-full text-[11px] text-white font-bold leading-none"
                style="background: #ef4444"
                title="频繁掉线勿开启"
                @click.stop="toggleBadTip"
              >!</span>
            </div>
            <div class="relative">
              <transition
                enter-active-class="transition-opacity duration-150"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-150"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <div
                  v-if="badTipVisible"
                  class="absolute top-6 z-10 whitespace-nowrap border border-[var(--theme-border)] rounded-lg bg-white px-3 py-1.5 text-xs text-gray-700 shadow-lg -right-[3em] dark:bg-gray-800 dark:text-gray-200"
                >
                  频繁掉线勿开启
                </div>
              </transition>
            </div>
            <BaseSwitch v-model="settings.automation.friend_bad" />
          </div>
          <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
            <span class="text-[13px] text-gray-800 dark:text-gray-100">自动放黄金虫</span>
            <BaseSwitch v-model="settings.automation.friend_golden_bug" />
          </div>
          <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
            <span class="text-[13px] text-gray-800 dark:text-gray-100">经验满只帮护主犬</span>
            <BaseSwitch v-model="settings.automation.friend_help_exp_limit" />
          </div>
        </div>
      </div>

      <div v-if="settings.automation.friend && settings.automation.friend_golden_bug" class="grid grid-cols-1 gap-3 rounded bg-amber-50 p-3 text-sm md:grid-cols-2 dark:bg-amber-900/20">
        <BaseInput
          v-model.number="settings.goldenBugKeepCount"
          label="黄金虫保留数量"
          type="number"
          min="0"
          max="9999"
        />
        <BaseInput
          v-model.number="settings.goldenBugRoundLimit"
          label="黄金虫单轮上限"
          type="number"
          min="1"
          max="100"
        />
      </div>

      <div v-if="settings.automation.friend" class="rounded bg-sky-50 p-3 text-sm dark:bg-sky-900/20">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <BaseInput
            v-model.number="settings.autoAcceptFriendMinLevel"
            label="自动通过好友最低等级"
            type="number"
            min="0"
            max="200"
          />
        </div>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          设为 `0` 表示不限制等级；启用好友相关自动化后，系统会按这里的最低等级自动通过好友申请。
        </p>
      </div>

      <div class="space-y-3">
        <div class="border border-amber-200 rounded bg-amber-50/60 p-3 dark:border-amber-800/60 dark:bg-amber-900/10">
          <div class="mb-2 text-sm text-amber-800 font-medium dark:text-amber-300">
            施肥范围
          </div>
          <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
            <label
              v-for="option in fertilizerLandTypeOptions"
              :key="option.value"
              class="flex cursor-pointer items-center gap-1.5 rounded bg-white px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <input
                v-model="settings.automation.fertilizer_land_types"
                :value="option.value"
                type="checkbox"
                class="h-3.5 w-3.5"
              >
              <span>{{ option.label }}</span>
            </label>
          </div>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            施肥前会优先按土地类型过滤，仅对命中范围的地块执行施肥策略。
          </p>
        </div>

        <div class="flex items-center gap-4">
          <BaseSelect
            v-model="settings.automation.fertilizer"
            label="施肥策略"
            :options="fertilizerOptions"
            class="flex-1"
          />
        </div>

        <div class="grid grid-cols-2 gap-2 sm:gap-3">
          <div class="flex items-center justify-between border border-white/40 rounded-full bg-[var(--theme-glass)] px-3 py-2.5 shadow-sm backdrop-blur-md dark:border-white/10">
            <span class="text-[13px] text-gray-800 dark:text-gray-100">多季补肥</span>
            <BaseSwitch v-model="settings.automation.fertilizer_multi_season" />
          </div>
        </div>

        <div v-if="isFastMatureFertilizerMode(settings.automation.fertilizer)" class="rounded bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
          <div class="mb-2 text-sm text-gray-900 font-medium dark:text-gray-100">
            快成熟判定秒数
          </div>
          <div class="flex flex-wrap items-end gap-4">
            <BaseInput
              v-model.number="settings.automation.fertilizer_smart_seconds"
              label="秒数"
              type="number"
              min="30"
              max="3600"
              class="w-40"
            />
            <span class="pb-2 text-xs text-gray-500 dark:text-gray-400">
              距离成熟时间 ≤ 此秒数时施肥（默认300秒=5分钟）
            </span>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t pt-3 dark:border-gray-700">
        <BaseButton
          variant="primary"
          size="sm"
          :loading="saving"
          @click="emit('save')"
        >
          {{ saveLabel }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rainbow-text {
  background-image: linear-gradient(90deg, #f43f5e, #f97316, #eab308, #22c55e, #0ea5e9, #6366f1, #a855f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
</style>
