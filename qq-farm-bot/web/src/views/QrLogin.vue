<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useAccountStore } from '@/stores/account'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const accountStore = useAccountStore()
const toast = useToastStore()

const step = ref<'idle' | 'loading' | 'ready' | 'waiting' | 'scanned' | 'success' | 'error'>('idle')
const qrImage = ref('')
const loginCode = ref('')
const qrMessage = ref('')
const uin = ref('')
const nickname = ref('')
const avatar = ref('')
const authCode = ref('')
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)
const adding = ref(false)
const errorDetail = ref('')

function avatarUrl(u: string) {
  return u ? `https://q1.qlogo.cn/g?b=qq&nk=${encodeURIComponent(u)}&s=100` : ''
}

async function startQR() {
  step.value = 'loading'
  qrMessage.value = '正在生成二维码...'
  errorDetail.value = ''
  try {
    const res = await api.post('/api/qr/create')
    if (res.data.ok) {
      qrImage.value = res.data.data.image
      loginCode.value = res.data.data.code
      step.value = 'ready'
      qrMessage.value = '请使用手机 QQ 扫描二维码登录'
      startPolling()
    }
    else {
      step.value = 'error'
      qrMessage.value = '生成二维码失败'
      errorDetail.value = res.data.error || ''
    }
  }
  catch (e: any) {
    step.value = 'error'
    qrMessage.value = '网络请求失败'
    errorDetail.value = e.message || '请检查后端服务是否正常运行'
  }
}

function startPolling() {
  stopPolling()
  step.value = 'waiting'
  pollTimer.value = setInterval(async () => {
    try {
      const res = await api.post('/api/qr/check', { code: loginCode.value })
      if (!res.data.ok)
        return

      const data = res.data.data
      if (data.status === 'OK') {
        stopPolling()
        step.value = 'success'
        qrMessage.value = '扫码成功'
        uin.value = data.uin || ''
        nickname.value = data.nickname || ''
        authCode.value = data.code || ''
        await doAddAccount()
      }
      else if (data.status === 'Used') {
        stopPolling()
        step.value = 'error'
        qrMessage.value = '二维码已失效，请重新生成'
        errorDetail.value = '登录码已被使用或已过期'
      }
      else if (data.status === 'Error') {
        stopPolling()
        step.value = 'error'
        qrMessage.value = '扫码失败'
        errorDetail.value = data.error || ''
      }
    }
    catch {
      // 单次轮询失败不中断，继续等待
    }
  }, 2000)
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

async function doAddAccount() {
  adding.value = true
  try {
    const targetUin = String(uin.value || '').trim()
    const existing = accountStore.accounts.find(
      (acc) => targetUin && String(acc.uin || '') === targetUin && acc.platform === 'qq',
    )

    if (existing) {
      await accountStore.updateAccount(String(existing.id), {
        code: authCode.value,
        name: nickname.value || existing.name,
        uin: targetUin,
      })
      await accountStore.startAccount(String(existing.id))
      toast.success(`QQ 账号 ${nickname.value || uin.value} 已更新 Code 并启动`)
    } else {
      await accountStore.addAccount({
        name: nickname.value || `QQ_${uin.value}`,
        code: authCode.value,
        platform: 'qq',
        uin: targetUin,
      })
      toast.success(`QQ 账号 ${nickname.value || uin.value} 添加成功`)
    }

    router.push('/')
  }
  catch (e: any) {
    step.value = 'error'
    qrMessage.value = '添加账号失败'
    errorDetail.value = e.response?.data?.error || e.message || '未知错误'
    toast.error(errorDetail.value)
  }
  finally {
    adding.value = false
  }
}

function reset() {
  stopPolling()
  step.value = 'idle'
  qrImage.value = ''
  loginCode.value = ''
  qrMessage.value = ''
  uin.value = ''
  nickname.value = ''
  avatar.value = ''
  authCode.value = ''
  errorDetail.value = ''
}

onBeforeUnmount(() => stopPolling())
</script>

<template>
  <div class="mx-auto max-w-md space-y-6 py-8">
    <div class="text-center">
      <h1 class="text-2xl font-bold">
        QQ 扫码登录
      </h1>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        使用手机 QQ 扫描二维码，自动获取农场 Code 并添加账号
      </p>
    </div>

    <!-- 初始状态 -->
    <div v-if="step === 'idle'" class="text-center">
      <button
        class="rounded-xl px-8 py-4 text-lg font-medium text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl"
        :style="{ backgroundColor: 'var(--theme-primary)' }"
        @click="startQR"
      >
        生成二维码
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="step === 'loading'" class="flex flex-col items-center gap-4 py-12">
      <div class="i-carbon-circle-dash animate-spin text-4xl text-gray-400" />
      <span class="text-gray-500">{{ qrMessage }}</span>
    </div>

    <!-- 二维码展示 -->
    <div
      v-if="step === 'ready' || step === 'waiting'"
      class="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-md dark:bg-gray-800"
    >
      <div class="overflow-hidden rounded-xl border-2 border-gray-200 dark:border-gray-700">
        <img
          :src="qrImage"
          alt="QQ 扫码登录二维码"
          class="h-64 w-64 object-contain"
        >
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span
          v-if="step === 'waiting'"
          class="i-carbon-circle-dash animate-spin text-blue-500"
        />
        <span
          v-else
          class="i-carbon-view text-green-500"
        />
        <span class="text-gray-600 dark:text-gray-300">{{ qrMessage }}</span>
      </div>
      <button
        class="mt-2 rounded-lg px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        @click="reset"
      >
        重新生成
      </button>
    </div>

    <!-- 扫码成功，正在添加 -->
    <div
      v-if="step === 'success'"
      class="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-md dark:bg-gray-800"
    >
      <div class="h-20 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <img
          v-if="uin"
          :src="avatarUrl(uin)"
          :alt="nickname"
          class="h-full w-full object-cover"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        >
        <div
          v-else
          class="flex h-full w-full items-center justify-center text-gray-300"
        >
          <div class="i-carbon-user text-3xl" />
        </div>
      </div>
      <div class="text-center">
        <div class="text-lg font-bold">
          {{ nickname || `QQ ${uin}` }}
        </div>
        <div class="text-sm text-gray-400">
          QQ {{ uin }}
        </div>
      </div>
      <div
        class="flex items-center gap-2 rounded-full px-4 py-2 text-sm"
        :class="adding ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'"
      >
        <span
          v-if="adding"
          class="i-carbon-circle-dash animate-spin"
        />
        <span
          v-else
          class="i-carbon-checkmark"
        />
        <span>{{ adding ? '正在添加账号...' : '扫码成功' }}</span>
      </div>
    </div>

    <!-- 错误状态 -->
    <div
      v-if="step === 'error'"
      class="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-md dark:bg-gray-800"
    >
      <div class="i-carbon-close-outline text-4xl text-red-400" />
      <div class="text-center">
        <div class="font-bold text-red-500">
          {{ qrMessage }}
        </div>
        <div
          v-if="errorDetail"
          class="mt-1 text-sm text-gray-400"
        >
          {{ errorDetail }}
        </div>
      </div>
      <button
        class="rounded-xl px-6 py-3 font-medium text-white shadow-lg transition-all hover:opacity-90"
        :style="{ backgroundColor: 'var(--theme-primary)' }"
        @click="reset(); startQR()"
      >
        重新生成二维码
      </button>
    </div>

    <!-- 使用说明 -->
    <div class="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <h3 class="mb-2 font-bold text-sm">
        使用说明
      </h3>
      <ol class="list-inside list-decimal space-y-1 text-sm text-gray-500 dark:text-gray-400">
        <li>点击「生成二维码」获取登录码</li>
        <li>打开手机 QQ，扫描页面上的二维码</li>
        <li>在手机上确认登录</li>
        <li>系统自动获取农场 Code 并添加账号</li>
        <li>添加成功后自动跳转到首页</li>
      </ol>
    </div>
  </div>
</template>