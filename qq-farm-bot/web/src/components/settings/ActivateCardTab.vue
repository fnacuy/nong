<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import AdvancedFeaturesTab from '@/components/settings/AdvancedFeaturesTab.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

defineProps<{
  showActivateCardConfirm: boolean
  activateCardLoading: boolean
  activateUsername: string
  activateCardCode: string
  currentAccountId: string | number | null | undefined
  currentAccountName: string | null
}>()

const emit = defineEmits<{
  requestActivateCard: []
  confirmActivateCard: []
  closeActivateCardConfirm: []
}>()

const activateUsernameModel = defineModel<string>('activateUsername', { required: true })
const activateCardCodeModel = defineModel<string>('activateCardCode', { required: true })

const userStore = useUserStore()
const appStore = useAppStore()
const purchaseUrl = computed(() => appStore.loginPageConfig.purchaseUrl)

const advancedFeaturesRef = ref<HTMLElement | null>(null)

onMounted(async () => {
  appStore.fetchLoginPageConfig()
  if (localStorage.getItem('settings-scroll-to') === 'advanced-features') {
    localStorage.removeItem('settings-scroll-to')
    await nextTick()
    advancedFeaturesRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 class="text-lg text-gray-900 font-bold dark:text-gray-100">
        激活卡密
      </h3>
      <BaseButton
        v-if="purchaseUrl"
        :href="purchaseUrl"
        target="_blank"
        rel="noopener noreferrer"
        variant="secondary"
        size="sm"
      >
        <span class="i-carbon-shopping-cart mr-1.5" />
        购买卡密
      </BaseButton>
    </div>

    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-5">
      <div class="mb-3 text-sm text-gray-700 font-medium dark:text-gray-300">
        当前权限状态
      </div>
      <div class="grid grid-cols-1 gap-3">
        <div
          class="border rounded-xl p-3"
          :class="userStore.hasPremiumPermission
            ? 'border-rose-200 bg-rose-50/60 dark:border-rose-800/60 dark:bg-rose-900/10'
            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'"
        >
          <div class="text-xs text-gray-500 dark:text-gray-400">
            高级功能
          </div>
          <div
            class="mt-1 text-sm font-semibold"
            :class="userStore.hasPremiumPermission ? 'text-rose-700 dark:text-rose-300' : 'text-gray-500 dark:text-gray-400'"
          >
            {{ userStore.hasPremiumPermission ? '已激活' : '未激活' }}
          </div>
          <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ userStore.premiumExpireTimeText }}
          </div>
        </div>

        <div
          class="border rounded-xl p-3"
          :class="userStore.isExpired
            ? 'border-red-200 bg-red-50/60 dark:border-red-800/60 dark:bg-red-900/10'
            : 'border-blue-200 bg-blue-50/60 dark:border-blue-800/60 dark:bg-blue-900/10'"
        >
          <div class="text-xs text-gray-500 dark:text-gray-400">
            账号到期时间
          </div>
          <div
            class="mt-1 text-sm font-semibold"
            :class="userStore.isExpired ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'"
          >
            {{ userStore.isExpired ? '已到期' : '有效中' }}
          </div>
          <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ userStore.expireTimeText }}
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-5">
      <p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
        输入用户名与卡密，为用户激活/续费卡密。
      </p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm text-gray-700 font-medium dark:text-gray-300">
            用户名
          </label>
          <BaseInput
            v-model="activateUsernameModel"
            placeholder="请输入目标用户名"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-700 font-medium dark:text-gray-300">
            卡密
          </label>
          <BaseInput
            v-model="activateCardCodeModel"
            placeholder="请输入卡密"
          />
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <BaseButton
          variant="primary"
          :disabled="activateCardLoading"
          @click="emit('requestActivateCard')"
        >
          <div class="i-carbon-key mr-2" />
          下一步
        </BaseButton>
      </div>
    </div>

    <div ref="advancedFeaturesRef" class="scroll-mt-24">
      <AdvancedFeaturesTab
        :current-account-id="currentAccountId"
        :current-account-name="currentAccountName"
      />
    </div>

    <ConfirmModal
      :show="showActivateCardConfirm"
      :loading="activateCardLoading"
      title="确认激活卡密"
      :message="`确定要为用户 ${activateUsername.trim() || '-'} 使用卡密 ${activateCardCode.trim() || '-'} 激活/续费吗？`"
      confirm-text="确认激活"
      type="danger"
      @close="!activateCardLoading && emit('closeActivateCardConfirm')"
      @cancel="!activateCardLoading && emit('closeActivateCardConfirm')"
      @confirm="emit('confirmActivateCard')"
    />
  </div>
</template>
