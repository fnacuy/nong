<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/api'
import BaseButton from '@/components/ui/BaseButton.vue'

const visible = ref(false)
const content = ref('')
const updatedAt = ref(0)
const loaded = ref(false)

async function loadAnnouncement() {
  if (loaded.value)
    return
  loaded.value = true
  try {
    const { data } = await api.get('/api/announcement')
    if (data?.ok && data.data) {
      content.value = data.data.content || ''
      updatedAt.value = data.data.updatedAt || 0
      if (data.data.shouldShow && content.value) {
        visible.value = true
      }
    }
  }
  catch {
    // 静默失败，不影响页面主流程
  }
}

async function markRead() {
  visible.value = false
  try {
    await api.post('/api/announcement/read')
  }
  catch {
    // 忽略已读上报失败
  }
}

function formatTime(timestamp: number) {
  if (!timestamp)
    return ''
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

onMounted(loadAnnouncement)

defineExpose({ loadAnnouncement })
</script>

<template>
  <Transition name="announcement-modal">
    <div v-if="visible" class="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4" @click.self="markRead">
      <div class="announcement-panel max-w-md w-full overflow-hidden rounded-2xl shadow-2xl" :style="{ background: 'var(--theme-bg)' }">
        <div class="flex items-center justify-between border-b px-5 py-4" :style="{ borderColor: 'var(--theme-border, rgba(15,23,42,0.09))' }">
          <div class="flex items-center gap-2 text-base font-semibold" :style="{ color: 'var(--theme-text)' }">
            <span class="i-carbon-notification text-lg" :style="{ color: 'var(--theme-primary)' }" />
            公告
          </div>
          <span v-if="updatedAt" class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatTime(updatedAt) }}
          </span>
        </div>

        <div class="custom-scrollbar max-h-[60vh] overflow-y-auto px-5 py-4 text-sm leading-relaxed" :style="{ color: 'var(--theme-text)' }">
          <div class="whitespace-pre-wrap">
            {{ content }}
          </div>
        </div>

        <div class="flex justify-end border-t px-5 py-3" :style="{ borderColor: 'var(--theme-border, rgba(15,23,42,0.09))' }">
          <BaseButton variant="primary" size="sm" @click="markRead">
            我知道了
          </BaseButton>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.announcement-modal-enter-active,
.announcement-modal-leave-active {
  transition: opacity 0.2s ease;
}

.announcement-modal-enter-from,
.announcement-modal-leave-to {
  opacity: 0;
}

.announcement-modal-enter-active .announcement-panel,
.announcement-modal-leave-active .announcement-panel {
  transition: transform 0.2s ease;
}

.announcement-modal-enter-from .announcement-panel,
.announcement-modal-leave-to .announcement-panel {
  transform: translateY(8px) scale(0.97);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
}
</style>
