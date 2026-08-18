<script setup lang="ts">
import type { Announcement } from '@/composables/useAdminAnnouncement'
import ConfirmModal from '@/components/ConfirmModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'

defineProps<{
  announcementLoading: boolean
  announcementSaving: boolean
  showSaveAnnouncementConfirm: boolean
}>()

const emit = defineEmits<{
  save: []
  saveConfirmed: []
  closeSaveConfirm: []
}>()

const localAnnouncement = defineModel<Announcement>('localAnnouncement', { required: true })

function formatTime(timestamp: number) {
  if (!timestamp)
    return '从未发布'
  return new Date(timestamp).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg text-gray-900 font-bold dark:text-gray-100">
      公告管理
    </h3>

    <div class="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
      保存后普通用户登录即可看到公告。公告支持长文本，保存时自动去除首尾空白。
    </div>

    <div class="border border-gray-200 rounded-lg bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div class="grid mb-3 gap-3 text-sm md:grid-cols-2">
        <div class="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
          <div class="text-xs text-gray-500 dark:text-gray-400">
            当前状态
          </div>
          <div class="mt-1 font-semibold">
            {{ localAnnouncement.content ? '已发布' : '未发布' }}
          </div>
        </div>
        <div class="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
          <div class="text-xs text-gray-500 dark:text-gray-400">
            最近更新时间
          </div>
          <div class="mt-1 font-semibold">
            {{ formatTime(localAnnouncement.updatedAt) }}
          </div>
        </div>
      </div>

      <div class="mb-3 rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
        <div>开启「仅提醒一次」：每个用户看到并关闭后不再重复弹出。</div>
        <div class="mt-1">
          关闭「仅提醒一次」：每次登录都会弹出公告，直到再次修改公告内容。
        </div>
      </div>

      <BaseTextarea
        v-model="localAnnouncement.content"
        label="公告内容"
        placeholder="输入要展示给所有用户的公告内容…"
        :rows="6"
        :disabled="announcementLoading"
      />

      <div class="mt-4">
        <BaseSwitch
          v-model="localAnnouncement.showOnce"
          label="仅提醒一次"
        />
      </div>

      <div class="mt-3 flex justify-end gap-2">
        <BaseButton
          variant="primary"
          size="sm"
          :loading="announcementSaving"
          @click="$emit('save')"
        >
          保存公告
        </BaseButton>
      </div>
    </div>

    <ConfirmModal
      :show="showSaveAnnouncementConfirm"
      title="确认保存公告"
      message="保存后公告会立即对普通用户生效。确定要发布当前公告内容吗？"
      type="danger"
      :loading="announcementSaving"
      confirm-text="确认发布"
      cancel-text="取消"
      @confirm="emit('saveConfirmed')"
      @close="$emit('closeSaveConfirm')"
      @cancel="$emit('closeSaveConfirm')"
    />
  </div>
</template>
