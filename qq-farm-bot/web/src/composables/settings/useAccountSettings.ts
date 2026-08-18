import { useIntervalFn } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useAddAccountGate } from '@/composables/useAddAccountGate'
import { useAccountStore } from '@/stores/account'
import { useUserStore } from '@/stores/user'

type AlertType = 'primary' | 'danger'

export function useAccountSettings(showAlert: (message: string, type?: AlertType) => void) {
  const router = useRouter()
  const accountStore = useAccountStore()
  const userStore = useUserStore()
  const { accounts, loading: accountsLoading, currentAccountId } = storeToRefs(accountStore)

  const showModal = ref(false)
  const showDeleteConfirm = ref(false)
  const deleteLoading = ref(false)
  const editingAccount = ref<any>(null)
  const accountToDelete = ref<any>(null)
  const showClearStoppedConfirm = ref(false)
  const clearStoppedLoading = ref(false)
  const refreshWxCodesLoading = ref(false)
  const showCodeCleanupModal = ref(false)
  const codeCleanupLoading = ref(false)
  const codeCleanupRunning = ref(false)
  const codeCleanupConfig = ref({
    enabled: false,
    retainDays: 7,
    failThreshold: 3,
    intervalHours: 0,
    lastRunAt: 0,
    lastCleanupCount: 0,
  })

  const userIsAdmin = computed(() => userStore.isAdmin)
  const userIsSuperAdmin = computed(() => userStore.isSuperAdmin)
  const {
    isAddAccountDisabled,
    addAccountDisabledReason,
    isAccountOpsDisabled,
  } = useAddAccountGate()

  const stoppedAccounts = computed(() => accounts.value.filter((acc: any) => !acc.running))
  const stoppedAccountsCount = computed(() => stoppedAccounts.value.length)
  const currentAccountName = computed(() => {
    const acc = accounts.value.find((item: any) => item.id === currentAccountId.value)
    return acc ? (acc.name || acc.nick || acc.id) : null
  })

  useIntervalFn(() => {
    accountStore.fetchAccounts()
  }, 3000)

  async function fetchAccounts() {
    await accountStore.fetchAccounts()
  }

  function selectFirstAccountIfNeeded() {
    if (!currentAccountId.value && accounts.value.length > 0 && accounts.value[0]) {
      accountStore.selectAccount(String(accounts.value[0].id))
    }
  }

  function openSettings(account: any) {
    accountStore.selectAccount(account.id)
    router.push('/settings')
  }

  function openAddModal() {
    editingAccount.value = null
    showModal.value = true
  }

  function openEditModal(account: any) {
    editingAccount.value = { ...account }
    showModal.value = true
  }

  function handleDelete(account: any) {
    accountToDelete.value = account
    showDeleteConfirm.value = true
  }

  async function confirmDelete() {
    if (accountToDelete.value) {
      try {
        deleteLoading.value = true
        await accountStore.deleteAccount(accountToDelete.value.id)
        accountToDelete.value = null
        showDeleteConfirm.value = false
      }
      finally {
        deleteLoading.value = false
      }
    }
  }

  async function toggleAccount(account: any) {
    if (account.running) {
      await accountStore.stopAccount(account.id)
    }
    else {
      await accountStore.startAccount(account.id)
    }
  }

  async function refreshWxCodesNow() {
    if (refreshWxCodesLoading.value)
      return

    refreshWxCodesLoading.value = true
    try {
      const result = await accountStore.refreshWxCodes()
      const data = result.data
      if (!result.ok) {
        if (data && data.total > 0) {
          showAlert(`微信 Code 刷新完成：成功 ${data.success} 个，失败 ${data.failed} 个`, 'danger')
        }
        else {
          showAlert(result.error || '没有可刷新的微信账号', 'danger')
        }
        return
      }

      const skippedText = data && data.skipped > 0 ? `，跳过 ${data.skipped} 个非微信账号` : ''
      showAlert(`微信 Code 刷新完成：成功 ${data?.success || 0} 个${skippedText}`, 'primary')
    }
    catch (error: any) {
      showAlert(error.response?.data?.error || error.message || '刷新微信 Code 失败', 'danger')
    }
    finally {
      refreshWxCodesLoading.value = false
    }
  }

  function handleSaved() {
    accountStore.fetchAccounts()
  }

  function selectAccount(account: any) {
    if (!account || !account.id)
      return
    accountStore.selectAccount(String(account.id))
  }

  function openClearStoppedConfirm() {
    if (stoppedAccountsCount.value === 0) {
      showAlert('没有已停止的账号需要清理', 'primary')
      return
    }
    showClearStoppedConfirm.value = true
  }

  async function confirmClearStopped() {
    clearStoppedLoading.value = true
    try {
      const stoppedIds = stoppedAccounts.value.map((acc: any) => acc.id)
      let deletedCount = 0
      for (const id of stoppedIds) {
        try {
          await accountStore.deleteAccount(id)
          deletedCount++
        }
        catch (e) {
          console.error(`删除账号 ${id} 失败:`, e)
        }
      }
      showClearStoppedConfirm.value = false
      showAlert(`成功清理 ${deletedCount} 个已停止的账号`, 'primary')
      await accountStore.fetchAccounts()
    }
    finally {
      clearStoppedLoading.value = false
    }
  }

  async function loadCodeCleanupConfig() {
    codeCleanupLoading.value = true
    try {
      const res = await api.get('/api/admin/accounts/code-cleanup-config')
      if (res.data.ok) {
        codeCleanupConfig.value = { ...codeCleanupConfig.value, ...res.data.data }
      }
      else {
        showAlert(res.data.error || '获取清理配置失败', 'danger')
      }
    }
    catch (error: any) {
      showAlert(error.response?.data?.error || error.message || '获取清理配置失败', 'danger')
    }
    finally {
      codeCleanupLoading.value = false
    }
  }

  async function saveCodeCleanupConfig() {
    if (codeCleanupLoading.value)
      return
    codeCleanupLoading.value = true
    try {
      const payload = {
        enabled: codeCleanupConfig.value.enabled,
        retainDays: Number(codeCleanupConfig.value.retainDays),
        failThreshold: Number(codeCleanupConfig.value.failThreshold),
        intervalHours: Number(codeCleanupConfig.value.intervalHours),
        confirmed: true,
      }
      const res = await api.post('/api/admin/accounts/code-cleanup-config', payload)
      if (res.data.ok) {
        codeCleanupConfig.value = { ...codeCleanupConfig.value, ...res.data.data }
        showCodeCleanupModal.value = false
        showAlert('失效 Code 清理配置已保存', 'primary')
      }
      else {
        showAlert(res.data.error || '保存清理配置失败', 'danger')
      }
    }
    catch (error: any) {
      showAlert(error.response?.data?.error || error.message || '保存清理配置失败', 'danger')
    }
    finally {
      codeCleanupLoading.value = false
    }
  }

  async function runExpiredCodeCleanup() {
    if (codeCleanupRunning.value)
      return
    codeCleanupRunning.value = true
    try {
      const res = await api.post('/api/admin/accounts/cleanup-expired-codes', { confirmed: true }, { timeout: 120000 })
      if (res.data.ok) {
        const data = res.data.data || {}
        showAlert(`失效 Code 清理完成：检查 ${data.checkedCount ?? 0} 个账号，删除 ${data.deletedCount ?? 0} 个`, 'primary')
        await accountStore.fetchAccounts()
      }
      else {
        showAlert(res.data.error || '执行失效 Code 清理失败', 'danger')
      }
    }
    catch (error: any) {
      showAlert(error.response?.data?.error || error.message || '执行失效 Code 清理失败', 'danger')
    }
    finally {
      codeCleanupRunning.value = false
    }
  }

  return {
    accounts,
    accountsLoading,
    currentAccountId,
    currentAccountName,
    userIsAdmin,
    userIsSuperAdmin,
    showModal,
    showDeleteConfirm,
    deleteLoading,
    editingAccount,
    accountToDelete,
    showClearStoppedConfirm,
    clearStoppedLoading,
    refreshWxCodesLoading,
    showCodeCleanupModal,
    codeCleanupLoading,
    codeCleanupRunning,
    codeCleanupConfig,
    stoppedAccountsCount,
    isAddAccountDisabled,
    addAccountDisabledReason,
    isAccountOpsDisabled,
    fetchAccounts,
    selectFirstAccountIfNeeded,
    openSettings,
    openAddModal,
    openEditModal,
    handleDelete,
    confirmDelete,
    toggleAccount,
    refreshWxCodesNow,
    handleSaved,
    selectAccount,
    openClearStoppedConfirm,
    confirmClearStopped,
    loadCodeCleanupConfig,
    saveCodeCleanupConfig,
    runExpiredCodeCleanup,
  }
}
