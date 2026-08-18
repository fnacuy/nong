import type { Card } from '@/stores/user'
import { computed, ref } from 'vue'
import api from '@/api'
import { useToastStore } from '@/stores/toast'
import { formatCardValue, useUserStore } from '@/stores/user'

export type CardStatusFilter = 'all' | 'used' | 'unused' | 'enabled' | 'disabled'
export type CardTypeFilter = 'all' | 'time' | 'quota' | 'turbo' | 'premium'

export interface NewCardForm {
  description: string
  days: number
  quota: number
  accountLimit: number
  durationUnit: 'hour' | 'day'
  count: number
  type: 'time' | 'quota' | 'premium'
  claimable: boolean
}

interface UseAdminCardsOptions {
  showAlert: (message: string, type?: 'primary' | 'danger') => void
}

export function formatCardDate(timestamp: number | null) {
  if (!timestamp)
    return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

export function getCardTypeLabel(card: Card) {
  if (card.type === 'quota')
    return '额度'
  if (card.type === 'turbo')
    return '极速务农'
  if (card.type === 'premium')
    return '高级功能'
  return '时间'
}

export function getCardValueLabel(card: Card) {
  return formatCardValue(card)
}

function formatDateForFile(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
}

export function useAdminCards(options: UseAdminCardsOptions) {
  const userStore = useUserStore()
  const toast = useToastStore()

  const cards = ref<Card[]>([])
  const cardsLoading = ref(false)
  const showCreateModal = ref(false)
  const newCard = ref<NewCardForm>({
    description: '',
    days: 30,
    quota: 1,
    accountLimit: 2,
    durationUnit: 'day',
    count: 1,
    type: 'time',
    claimable: false,
  })

  const selectedCards = ref<Set<string>>(new Set())
  const selectAll = ref(false)
  const searchQuery = ref('')
  const filterStatus = ref<CardStatusFilter>('all')
  const cardTypeFilter = ref<CardTypeFilter>('all')

  const cardClaimEnabled = ref(false)
  const cardClaimLoading = ref(false)
  const availableTimeCards = ref(0)
  const claimLimitValue = ref(360)
  const claimLimitUnit = ref<'minute' | 'hour' | 'day'>('hour')

  const showDeleteCardConfirm = ref(false)
  const pendingDeleteCard = ref<Card | null>(null)
  const deleteCardLoading = ref(false)
  const showCreateCardConfirm = ref(false)
  const createCardLoading = ref(false)
  const showToggleCardStatusConfirm = ref(false)
  const pendingToggleCard = ref<Card | null>(null)
  const toggleCardStatusLoading = ref(false)
  const showDeleteSelectedCardsConfirm = ref(false)
  const deleteSelectedCardsLoading = ref(false)
  const showBatchUpdateCardsConfirm = ref(false)
  const pendingBatchUpdate = ref<{ label: string, updates: Partial<Card> } | null>(null)
  const batchUpdateCardsLoading = ref(false)
  const showCardClaimConfirm = ref(false)
  const pendingCardClaimEnabled = ref<boolean | null>(null)

  const unusedTimeCardsCount = computed(() => {
    return cards.value.filter(c => c.type === 'time' && !c.usedBy && c.enabled && c.claimable === true).length
  })
  const usedCardsCount = computed(() => cards.value.filter(c => !!c.usedBy).length)
  const enabledCardsCount = computed(() => cards.value.filter(c => c.enabled).length)

  const filteredCards = computed(() => {
    let result = cards.value

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(card =>
        card.code.toLowerCase().includes(query)
        || card.description.toLowerCase().includes(query)
        || (card.usedBy && card.usedBy.toLowerCase().includes(query)),
      )
    }

    switch (filterStatus.value) {
      case 'used':
        result = result.filter(card => card.usedBy)
        break
      case 'unused':
        result = result.filter(card => !card.usedBy)
        break
      case 'enabled':
        result = result.filter(card => card.enabled)
        break
      case 'disabled':
        result = result.filter(card => !card.enabled)
        break
    }

    if (cardTypeFilter.value !== 'all')
      result = result.filter(card => card.type === cardTypeFilter.value)

    return result
  })

  const selectedCardCount = computed(() => selectedCards.value.size)
  const currentCardTypeLabel = computed(() => {
    const map: Record<CardTypeFilter, string> = {
      all: '全部卡密',
      time: '时间卡密',
      quota: '额度卡密',
      turbo: '极速务农卡',
      premium: '高级功能卡',
    }
    return map[cardTypeFilter.value] || '全部卡密'
  })
  const currentCardStatusLabel = computed(() => {
    const map: Record<CardStatusFilter, string> = {
      all: '全部状态',
      used: '已使用',
      unused: '未使用',
      enabled: '已启用',
      disabled: '已禁用',
    }
    return map[filterStatus.value] || '全部状态'
  })
  const filteredUnusedCardCount = computed(() =>
    filteredCards.value.filter(card => !card.usedBy).length,
  )
  const cardManagementSummary = computed(() => {
    if (selectedCardCount.value > 0)
      return `当前已选中 ${selectedCardCount.value} 个卡密，适合先复制或批量删除后再继续筛选。`
    if (filteredCards.value.length === 0)
      return '当前筛选下没有命中卡密，建议先放宽类型、状态或关键词条件。'
    if (filteredUnusedCardCount.value > 0)
      return `当前筛选结果里还有 ${filteredUnusedCardCount.value} 个未使用卡密，适合继续核对描述、状态与发放节奏。`
    return '当前筛选结果以已使用卡密为主，更适合回看使用者和创建时间做审计。'
  })

  async function fetchCards() {
    cardsLoading.value = true
    try {
      const result = await userStore.getAllCards()
      if (result.ok) {
        cards.value = result.data
        availableTimeCards.value = result.data.filter((card: Card) => card.type === 'time' && !card.usedBy && card.enabled && card.claimable === true).length
      }
      else {
        toast.error(result.error || '获取卡密列表失败')
      }
    }
    catch (e: any) {
      toast.error(e.message || '获取卡密列表失败')
    }
    finally {
      cardsLoading.value = false
    }
  }

  async function fetchCardClaimStatus() {
    cardClaimLoading.value = true
    try {
      const res = await api.get('/api/card-claim/status')
      if (res.data.ok) {
        cardClaimEnabled.value = res.data.enabled
        availableTimeCards.value = Number(res.data.availableTimeCards || 0)
        if (res.data.limitValue !== undefined && res.data.limitValue !== null) {
          claimLimitValue.value = Number(res.data.limitValue)
          if (['minute', 'hour', 'day'].includes(res.data.limitUnit))
            claimLimitUnit.value = res.data.limitUnit
          else if (res.data.limitHours)
            claimLimitValue.value = Number(res.data.limitHours)
        }
        else if (res.data.limitHours) {
          claimLimitValue.value = Number(res.data.limitHours)
        }
      }
    }
    catch (e: any) {
      console.error('获取卡密领取状态失败:', e)
    }
    finally {
      cardClaimLoading.value = false
    }
  }

  function requestToggleCardClaimStatus(enabled: boolean | undefined) {
    if (enabled === undefined)
      return

    if (enabled && availableTimeCards.value <= 0) {
      options.showAlert('当前没有可免费领取的时间卡密，请先在卡密列表中将时间卡设为「可免费领取」后再开启该功能。', 'danger')
      return
    }

    pendingCardClaimEnabled.value = enabled
    showCardClaimConfirm.value = true
  }

  async function confirmToggleCardClaimStatus() {
    if (pendingCardClaimEnabled.value === null)
      return

    const enabled = pendingCardClaimEnabled.value
    cardClaimLoading.value = true
    try {
      const res = await api.post('/api/admin/card-claim/status', {
        enabled,
        confirmed: true,
      })
      if (res.data.ok) {
        cardClaimEnabled.value = res.data.enabled
        availableTimeCards.value = Number(res.data.availableTimeCards || availableTimeCards.value || 0)
        showCardClaimConfirm.value = false
        pendingCardClaimEnabled.value = null
        toast.success(enabled ? '卡密领取功能已开启' : '卡密领取功能已关闭')
      }
      else {
        toast.error(res.data.error || '操作失败')
      }
    }
    catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || '操作失败'
      toast.error(msg)
    }
    finally {
      cardClaimLoading.value = false
    }
  }

  const claimLimitSaving = ref(false)

  async function saveClaimLimitHours(value?: number, unit?: 'minute' | 'hour' | 'day') {
    const parsed = value !== undefined ? Number(value) : Number(claimLimitValue.value)
    const targetUnit = unit || claimLimitUnit.value
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.warning('请输入大于 0 的领取间隔')
      return
    }
    claimLimitSaving.value = true
    try {
      const res = await api.post('/api/admin/card-claim/status', {
        enabled: cardClaimEnabled.value,
        limitValue: Math.floor(parsed),
        limitUnit: targetUnit,
        confirmed: true,
      })
      if (res.data.ok) {
        if (res.data.limitValue !== undefined && res.data.limitValue !== null) {
          claimLimitValue.value = Number(res.data.limitValue)
          if (['minute', 'hour', 'day'].includes(res.data.limitUnit))
            claimLimitUnit.value = res.data.limitUnit
        }
        toast.success('领取间隔已保存')
      }
      else {
        toast.error(res.data.error || '保存失败')
      }
    }
    catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || '保存失败'
      toast.error(msg)
    }
    finally {
      claimLimitSaving.value = false
    }
  }

  function requestCreateCard() {
    if (!newCard.value.description) {
      toast.warning('请输入卡密描述')
      return
    }
    if (newCard.value.type !== 'quota' && newCard.value.days !== -1 && Number(newCard.value.days) <= 0) {
      toast.warning('请输入大于 0 的时长，或输入 -1 创建永久卡')
      return
    }
    if (newCard.value.type === 'time' && Number(newCard.value.accountLimit) <= 0) {
      toast.warning('请输入大于 0 的额度数量')
      return
    }
    if (newCard.value.type === 'quota' && Number(newCard.value.quota) <= 0) {
      toast.warning('请输入大于 0 的额度数量')
      return
    }

    showCreateCardConfirm.value = true
  }

  async function createCard() {
    createCardLoading.value = true
    if (!newCard.value.description) {
      createCardLoading.value = false
      toast.warning('请输入卡密描述')
      return
    }
    if (newCard.value.type !== 'quota' && newCard.value.days !== -1 && Number(newCard.value.days) <= 0) {
      createCardLoading.value = false
      toast.warning('请输入大于 0 的时长，或输入 -1 创建永久卡')
      return
    }
    if (newCard.value.type === 'time' && Number(newCard.value.accountLimit) <= 0) {
      createCardLoading.value = false
      toast.warning('请输入大于 0 的额度数量')
      return
    }
    if (newCard.value.type === 'quota' && Number(newCard.value.quota) <= 0) {
      createCardLoading.value = false
      toast.warning('请输入大于 0 的额度数量')
      return
    }

    const count = Math.min(Math.max(Number.parseInt(String(newCard.value.count), 10) || 1, 1), 100)

    const quotaValue = Math.max(Number.parseInt(String(newCard.value.quota), 10) || 1, 1)
    const accountLimitValue = Math.max(Number.parseInt(String(newCard.value.accountLimit), 10) || 1, 1)
    const timeDays = newCard.value.days

    try {
      const result = await userStore.createCard(
        newCard.value.description,
        newCard.value.type === 'quota' ? quotaValue : timeDays,
        count > 1 ? count : undefined,
        newCard.value.type,
        {
          confirmed: true,
          durationValue: newCard.value.type === 'quota' ? undefined : timeDays,
          durationUnit: newCard.value.type === 'quota' ? undefined : newCard.value.durationUnit,
          value: newCard.value.type === 'quota' ? quotaValue : undefined,
          accountLimit: newCard.value.type === 'time' ? accountLimitValue : undefined,
          claimable: newCard.value.type === 'time' ? newCard.value.claimable : undefined,
        },
      )
      if (result.ok) {
        if (result.batch) {
          toast.success(`成功创建 ${result.count} 个卡密`)
          exportCardsToFile(result.data, `卡密批量导出_${newCard.value.description}_${formatDateForFile(Date.now())}.txt`)
        }
        else {
          toast.success('卡密创建成功')
        }
        showCreateCardConfirm.value = false
        showCreateModal.value = false
        newCard.value = { description: '', days: 30, quota: 1, accountLimit: 2, durationUnit: 'day', count: 1, type: 'time', claimable: false }
        await fetchCards()
      }
      else {
        toast.error(result.error || '创建卡密失败')
      }
    }
    catch (e: any) {
      toast.error(e.message || '创建卡密失败')
    }
    finally {
      createCardLoading.value = false
    }
  }

  function requestToggleCardStatus(card: Card) {
    pendingToggleCard.value = card
    showToggleCardStatusConfirm.value = true
  }

  const toggleCardClaimableLoading = ref(false)

  async function toggleCardClaimable(card: Card) {
    toggleCardClaimableLoading.value = true
    try {
      const result = await userStore.updateCard(card.code, { claimable: !card.claimable }, {
        confirmed: true,
      })
      if (result.ok) {
        toast.success(card.claimable ? '已取消免费领取' : '已设为可免费领取')
        await fetchCards()
      }
      else {
        toast.error(result.error || '操作失败')
      }
    }
    catch (e: any) {
      toast.error(e.message || '操作失败')
    }
    finally {
      toggleCardClaimableLoading.value = false
    }
  }

  async function toggleCardStatus() {
    if (!pendingToggleCard.value)
      return

    toggleCardStatusLoading.value = true
    showToggleCardStatusConfirm.value = false
    try {
      const card = pendingToggleCard.value
      const result = await userStore.updateCard(card.code, { enabled: !card.enabled }, {
        confirmed: true,
      })
      if (result.ok) {
        toast.success(card.enabled ? '卡密已禁用' : '卡密已启用')
        await fetchCards()
      }
      else {
        toast.error(result.error || '操作失败')
      }
    }
    catch (e: any) {
      toast.error(e.message || '操作失败')
    }
    finally {
      pendingToggleCard.value = null
      toggleCardStatusLoading.value = false
    }
  }

  function requestDeleteCard(card: Card) {
    pendingDeleteCard.value = card
    showDeleteCardConfirm.value = true
  }

  async function confirmDeleteCard() {
    if (!pendingDeleteCard.value)
      return

    deleteCardLoading.value = true
    try {
      const result = await userStore.deleteCard(pendingDeleteCard.value.code, {
        confirmed: true,
      })
      if (result.ok) {
        toast.success('卡密删除成功')
        showDeleteCardConfirm.value = false
        pendingDeleteCard.value = null
        showToggleCardStatusConfirm.value = false
        pendingToggleCard.value = null
        await fetchCards()
      }
      else {
        toast.error(result.error || '删除卡密失败')
      }
    }
    catch (e: any) {
      toast.error(e.message || '删除卡密失败')
    }
    finally {
      deleteCardLoading.value = false
    }
  }

  function requestDeleteSelectedCards() {
    const selectedCodes = Array.from(selectedCards.value)
    if (selectedCodes.length === 0) {
      toast.warning('请先选择要删除的卡密')
      return
    }

    showDeleteSelectedCardsConfirm.value = true
  }

  async function confirmDeleteSelectedCards() {
    const selectedCodes = Array.from(selectedCards.value)
    if (selectedCodes.length === 0) {
      showDeleteSelectedCardsConfirm.value = false
      return
    }

    deleteSelectedCardsLoading.value = true
    try {
      const result = await userStore.deleteCardsBatch(selectedCodes, {
        confirmed: true,
      })
      if (result.ok) {
        toast.success(`成功删除 ${result.deletedCount} 个卡密`)
        if (result.notFoundCount > 0)
          toast.warning(`${result.notFoundCount} 个卡密未找到`)
        showDeleteSelectedCardsConfirm.value = false
        selectedCards.value.clear()
        selectAll.value = false
        await fetchCards()
      }
      else {
        toast.error(result.error || '批量删除卡密失败')
      }
    }
    catch (e: any) {
      toast.error(e.message || '批量删除卡密失败')
    }
    finally {
      deleteSelectedCardsLoading.value = false
    }
  }

  function requestBatchUpdateCards(label: string, updates: Partial<Card>) {
    const selectedCodes = Array.from(selectedCards.value)
    if (selectedCodes.length === 0) {
      toast.warning('请先选择要操作的卡密')
      return
    }
    pendingBatchUpdate.value = { label, updates }
    showBatchUpdateCardsConfirm.value = true
  }

  async function confirmBatchUpdateCards() {
    if (!pendingBatchUpdate.value)
      return

    const selectedCodes = Array.from(selectedCards.value)
    if (selectedCodes.length === 0) {
      showBatchUpdateCardsConfirm.value = false
      return
    }

    batchUpdateCardsLoading.value = true
    try {
      const result = await userStore.updateCardsBatch(selectedCodes, pendingBatchUpdate.value.updates, {
        confirmed: true,
      })
      if (result.ok) {
        toast.success(`成功更新 ${result.updatedCount} 个卡密`)
        if (result.notFoundCount > 0)
          toast.warning(`${result.notFoundCount} 个卡密未找到`)
        showBatchUpdateCardsConfirm.value = false
        pendingBatchUpdate.value = null
        selectedCards.value.clear()
        selectAll.value = false
        await fetchCards()
      }
      else {
        toast.error(result.error || '批量更新卡密失败')
      }
    }
    catch (e: any) {
      toast.error(e.message || '批量更新卡密失败')
    }
    finally {
      batchUpdateCardsLoading.value = false
    }
  }

  async function copyCode(code: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code)
        toast.success('卡密已复制到剪贴板')
      }
      else {
        const textArea = document.createElement('textarea')
        textArea.value = code
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        toast.success('卡密已复制到剪贴板')
        document.body.removeChild(textArea)
      }
    }
    catch (e) {
      toast.error('复制失败，请手动复制')
      console.error('复制失败:', e)
    }
  }

  async function copySelectedCards() {
    const codes = Array.from(selectedCards.value)
    if (codes.length === 0)
      return

    try {
      const text = codes.join('\n')
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        toast.success(`已复制 ${codes.length} 个卡密到剪贴板`)
      }
      else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        toast.success(`已复制 ${codes.length} 个卡密到剪贴板`)
        document.body.removeChild(textArea)
      }
    }
    catch (e) {
      toast.error('复制失败，请手动复制')
      console.error('复制失败:', e)
    }
  }

  function exportCardsToFile(cardsToExport: Card[], filename?: string) {
    if (!cardsToExport || cardsToExport.length === 0) {
      toast.warning('没有可导出的卡密')
      return
    }

    const content = cardsToExport.map(card =>
      `卡密: ${card.code}\n描述: ${card.description}\n类型: ${getCardTypeLabel(card)}\n数值: ${getCardValueLabel(card)}\n状态: ${card.enabled ? '启用' : '禁用'}\n${card.usedBy ? `使用者: ${card.usedBy}\n使用时间: ${formatCardDate(card.usedAt)}` : '未使用'}\n创建时间: ${formatCardDate(card.createdAt)}\n${'='.repeat(40)}`,
    ).join('\n\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `卡密导出_${formatDateForFile(Date.now())}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`已导出 ${cardsToExport.length} 个卡密到文件`)
  }

  function toggleSelectAll() {
    if (selectAll.value) {
      filteredCards.value.forEach(card => selectedCards.value.delete(card.code))
    }
    else {
      filteredCards.value.forEach(card => selectedCards.value.add(card.code))
    }
  }

  function selectAllCards() {
    filteredCards.value.forEach(card => selectedCards.value.add(card.code))
    selectAll.value = filteredCards.value.length > 0
  }

  function toggleSelectCard(code: string) {
    if (selectedCards.value.has(code)) {
      selectedCards.value.delete(code)
      selectAll.value = false
    }
    else {
      selectedCards.value.add(code)
      if (filteredCards.value.every(card => selectedCards.value.has(card.code)))
        selectAll.value = true
    }
  }

  function clearSelectedCards() {
    selectedCards.value.clear()
    selectAll.value = false
  }

  return {
    cards,
    cardsLoading,
    showCreateModal,
    newCard,
    selectedCards,
    selectAll,
    searchQuery,
    filterStatus,
    cardTypeFilter,
    cardClaimEnabled,
    cardClaimLoading,
    availableTimeCards,
    claimLimitValue,
    claimLimitUnit,
    claimLimitSaving,
    showDeleteCardConfirm,
    pendingDeleteCard,
    deleteCardLoading,
    showCreateCardConfirm,
    createCardLoading,
    showToggleCardStatusConfirm,
    pendingToggleCard,
    toggleCardStatusLoading,
    showDeleteSelectedCardsConfirm,
    deleteSelectedCardsLoading,
    showBatchUpdateCardsConfirm,
    pendingBatchUpdate,
    batchUpdateCardsLoading,
    showCardClaimConfirm,
    pendingCardClaimEnabled,
    unusedTimeCardsCount,
    usedCardsCount,
    enabledCardsCount,
    filteredCards,
    selectedCardCount,
    currentCardTypeLabel,
    currentCardStatusLabel,
    cardManagementSummary,
    toggleCardClaimableLoading,
    fetchCards,
    fetchCardClaimStatus,
    requestToggleCardClaimStatus,
    confirmToggleCardClaimStatus,
    saveClaimLimitHours,
    requestCreateCard,
    createCard,
    requestToggleCardStatus,
    toggleCardStatus,
    toggleCardClaimable,
    requestDeleteCard,
    confirmDeleteCard,
    requestDeleteSelectedCards,
    confirmDeleteSelectedCards,
    requestBatchUpdateCards,
    confirmBatchUpdateCards,
    copyCode,
    copySelectedCards,
    toggleSelectAll,
    selectAllCards,
    toggleSelectCard,
    clearSelectedCards,
  }
}
