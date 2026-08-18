<script setup lang="ts">
import type { AdminTabKey } from '@/components/admin/AdminPanelTabs.vue'
import { onMounted, ref, watch } from 'vue'
import AdminAlertModal from '@/components/admin/AdminAlertModal.vue'
import AdminAnnouncementPanel from '@/components/admin/AdminAnnouncementPanel.vue'
import AdminCardConfirmModals from '@/components/admin/AdminCardConfirmModals.vue'
import AdminCardPanel from '@/components/admin/AdminCardPanel.vue'
import AdminLoginLogConfirmModal from '@/components/admin/AdminLoginLogConfirmModal.vue'
import AdminLoginLogPanel from '@/components/admin/AdminLoginLogPanel.vue'
import AdminPanelHeader from '@/components/admin/AdminPanelHeader.vue'
import AdminPanelTabs from '@/components/admin/AdminPanelTabs.vue'
import AdminSystemConfigConfirmModals from '@/components/admin/AdminSystemConfigConfirmModals.vue'
import AdminSystemPanel from '@/components/admin/AdminSystemPanel.vue'
import AdminUserConfirmModals from '@/components/admin/AdminUserConfirmModals.vue'
import AdminUserPanel from '@/components/admin/AdminUserPanel.vue'
import { useAdminAnnouncement } from '@/composables/useAdminAnnouncement'
import { useAdminCards } from '@/composables/useAdminCards'
import { useAdminLoginLogs } from '@/composables/useAdminLoginLogs'
import { useAdminSystemConfig } from '@/composables/useAdminSystemConfig'
import { useAdminUsers } from '@/composables/useAdminUsers'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const activeTab = ref<AdminTabKey>((localStorage.getItem('admin-active-tab') as AdminTabKey) || 'card')

watch(activeTab, (newTab) => {
  localStorage.setItem('admin-active-tab', newTab)
})

const tabs = [
  { key: 'card', label: '卡密', icon: 'i-carbon-ticket' },
  { key: 'user', label: '用户', icon: 'i-carbon-user-admin' },
  { key: 'log', label: '日志', icon: 'i-carbon-document' },
  { key: 'system', label: '系统', icon: 'i-carbon-settings' },
  { key: 'announcement', label: '公告', icon: 'i-carbon-notification' },
] as const

const modalVisible = ref(false)
const modalConfig = ref({
  title: '',
  message: '',
  type: 'primary' as 'primary' | 'danger',
  isAlert: true,
})

function showAlert(message: string, type: 'primary' | 'danger' = 'primary') {
  modalConfig.value = {
    title: type === 'danger' ? '错误' : '提示',
    message,
    type,
    isAlert: true,
  }
  modalVisible.value = true
}

const {
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
  requestBatchUpdateCards,
  confirmBatchUpdateCards,
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
  requestCreateCard,
  createCard,
  requestToggleCardStatus,
  toggleCardStatus,
  toggleCardClaimable,
  requestDeleteCard,
  confirmDeleteCard,
  requestDeleteSelectedCards,
  confirmDeleteSelectedCards,
  copyCode,
  copySelectedCards,
  toggleSelectAll,
  selectAllCards,
  toggleSelectCard,
  clearSelectedCards,
  claimLimitValue,
  claimLimitUnit,
  claimLimitSaving,
  saveClaimLimitHours,
} = useAdminCards({ showAlert })

const {
  showDeleteUserConfirm,
  pendingDeleteUser,
  deleteUserLoading,
  showRenewUserModal,
  showRenewUserConfirm,
  pendingRenewUser,
  renewUserCardCode,
  renewUserLoading,
  showToggleUserStatusConfirm,
  pendingToggleUser,
  toggleUserStatusLoading,
  showClearExpiredUsersConfirm,
  clearExpiredUsersLoading,
  showEditUserConfirm,
  users,
  usersLoading,
  userSearchQuery,
  filteredUsers,
  showEditModal,
  selectedUser,
  editForm,
  editLoading,
  currentUsername,
  activeUsersCount,
  expiredUsersCount,
  adminUsersCount,
  userManagementSummary,
  fetchUsers,
  requestToggleUserStatus,
  confirmToggleUserStatus,
  requestDeleteUser,
  confirmDeleteUser,
  openRenewUserModal,
  requestRenewUser,
  confirmRenewUser,
  openClearExpiredUsersConfirm,
  confirmClearExpiredUsers,
  openEditModal,
  handleEdit,
  confirmEditUser,
} = useAdminUsers()

const showClearLogsConfirm = ref(false)
const {
  loginLogs,
  loginLogsLoading,
  loginLogsTotal,
  clearLogsLoading,
  loginSuccessCount,
  loginFailedCount,
  loginLogSummary,
  fetchLoginLogs,
  clearLoginLogs,
} = useAdminLoginLogs()

function openClearLogsConfirm() {
  if (loginLogsTotal.value === 0) {
    toast.warning('暂无日志可清空')
    return
  }
  showClearLogsConfirm.value = true
}

async function confirmClearLogs() {
  const cleared = await clearLoginLogs()
  if (cleared)
    showClearLogsConfirm.value = false
}

const {
  systemConfigSaving,
  wxConfigSaving,
  captureConfigSaving,
  captureConfigTesting,
  loginLinksSaving,
  loginLogoUploading,
  showResetSystemConfirm,
  showSaveSystemConfirm,
  showResetLoginLinksConfirm,
  showResetWxConfigConfirm,
  showSaveWxConfigConfirm,
  localSystemConfig,
  defaultSystemConfig,
  localWxConfig,
  localCaptureConfig,
  localLoginLinks,
  platformOptions,
  osOptions,
  loadWxConfig,
  loadCaptureConfig,
  handleTestCaptureConfig,
  handleSaveCaptureConfig,
  loadLoginLinks,
  handleSaveLoginLinks,
  handleResetLoginLinks,
  openResetLoginLinksConfirm,
  handleUploadLoginLogo,
  handleSaveWxConfig,
  handleResetWxConfig,
  openResetWxConfigConfirm,
  openSaveWxConfigConfirm,
  loadSystemConfig,
  handleSaveSystemConfig,
  handleResetSystemConfig,
  openResetSystemConfirm,
  openSaveSystemConfirm,
} = useAdminSystemConfig({ showAlert })

const {
  announcementLoading,
  announcementSaving,
  showSaveAnnouncementConfirm,
  localAnnouncement,
  loadAnnouncement,
  openSaveAnnouncementConfirm,
  handleSaveAnnouncement,
} = useAdminAnnouncement({ showAlert })

onMounted(() => {
  fetchCards()
  fetchUsers()
  fetchLoginLogs()
  loadSystemConfig()
  loadWxConfig()
  loadCaptureConfig()
  loadLoginLinks()
  fetchCardClaimStatus()
  loadAnnouncement()
})
</script>

<template>
  <div class="admin-panel">
    <AdminPanelHeader
      :total-cards="cards.length"
      :unused-time-cards-count="unusedTimeCardsCount"
      :total-users="users.length"
      :login-logs-total="loginLogsTotal"
    />

    <AdminPanelTabs v-model:active-tab="activeTab" :tabs="tabs">
      <AdminCardPanel
        v-if="activeTab === 'card'"
        v-model:show-create-modal="showCreateModal"
        v-model:new-card="newCard"
        v-model:select-all="selectAll"
        v-model:search-query="searchQuery"
        v-model:filter-status="filterStatus"
        v-model:card-type-filter="cardTypeFilter"
        :cards="cards"
        :cards-loading="cardsLoading"
        :used-cards-count="usedCardsCount"
        :enabled-cards-count="enabledCardsCount"
        :unused-time-cards-count="unusedTimeCardsCount"
        :card-management-summary="cardManagementSummary"
        :card-claim-enabled="cardClaimEnabled"
        :card-claim-loading="cardClaimLoading"
        :claim-limit-value="claimLimitValue"
        :claim-limit-unit="claimLimitUnit"
        :claim-limit-saving="claimLimitSaving"
        :filtered-cards="filteredCards"
        :selected-cards="selectedCards"
        :selected-card-count="selectedCardCount"
        :current-card-type-label="currentCardTypeLabel"
        :current-card-status-label="currentCardStatusLabel"
        :create-card-loading="createCardLoading"
        :toggle-card-claimable-loading="toggleCardClaimableLoading"
        @refresh="fetchCards"
        @create="requestCreateCard"
        @toggle-claim="requestToggleCardClaimStatus"
        @copy-selected="copySelectedCards"
        @delete-selected="requestDeleteSelectedCards"
        @batch-disable="requestBatchUpdateCards('禁用', { enabled: false })"
        @batch-unclaim="requestBatchUpdateCards('取消领取', { enabled: true, claimable: false })"
        @batch-claimable="requestBatchUpdateCards('设为可领', { enabled: true, claimable: true })"
        @clear-selected="clearSelectedCards"
        @toggle-select-all="toggleSelectAll"
        @select-all-cards="selectAllCards"
        @toggle-select-card="toggleSelectCard"
        @copy-code="copyCode"
        @toggle-card-status="requestToggleCardStatus"
        @toggle-card-claimable="toggleCardClaimable"
        @delete-card="requestDeleteCard"
        @save-claim-limit-hours="saveClaimLimitHours"
      />

      <AdminUserPanel
        v-else-if="activeTab === 'user'"
        v-model:show-renew-user-modal="showRenewUserModal"
        v-model:pending-renew-user="pendingRenewUser"
        v-model:renew-user-card-code="renewUserCardCode"
        v-model:show-edit-modal="showEditModal"
        v-model:edit-form="editForm"
        v-model:user-search-query="userSearchQuery"
        :users="users"
        :filtered-users="filteredUsers"
        :users-loading="usersLoading"
        :current-username="currentUsername"
        :active-users-count="activeUsersCount"
        :expired-users-count="expiredUsersCount"
        :admin-users-count="adminUsersCount"
        :user-management-summary="userManagementSummary"
        :renew-user-loading="renewUserLoading"
        :edit-loading="editLoading"
        @clear-expired="openClearExpiredUsersConfirm"
        @refresh="fetchUsers"
        @open-renew-user="openRenewUserModal"
        @open-edit-user="openEditModal"
        @toggle-user-status="requestToggleUserStatus"
        @delete-user="requestDeleteUser"
        @renew-user="requestRenewUser"
        @edit-user="handleEdit"
      />

      <AdminLoginLogPanel
        v-else-if="activeTab === 'log'"
        :logs="loginLogs"
        :loading="loginLogsLoading"
        :total="loginLogsTotal"
        :success-count="loginSuccessCount"
        :failed-count="loginFailedCount"
        :summary="loginLogSummary"
        @refresh="fetchLoginLogs"
        @clear="openClearLogsConfirm"
      />

      <AdminSystemPanel
        v-else-if="activeTab === 'system'"
        v-model:local-system-config="localSystemConfig"
        v-model:local-wx-config="localWxConfig"
        v-model:local-capture-config="localCaptureConfig"
        v-model:local-login-links="localLoginLinks"
        :default-system-config="defaultSystemConfig"
        :platform-options="platformOptions"
        :os-options="osOptions"
        :system-config-saving="systemConfigSaving"
        :wx-config-saving="wxConfigSaving"
        :capture-config-saving="captureConfigSaving"
        :capture-config-testing="captureConfigTesting"
        :login-links-saving="loginLinksSaving"
        :login-logo-uploading="loginLogoUploading"
        @reset-system="openResetSystemConfirm"
        @save-system="openSaveSystemConfirm"
        @reset-login-links="openResetLoginLinksConfirm"
        @reset-wx="openResetWxConfigConfirm"
        @save-wx="openSaveWxConfigConfirm"
        @test-capture="handleTestCaptureConfig"
        @save-capture="handleSaveCaptureConfig"
        @save-login-links="handleSaveLoginLinks"
        @upload-login-logo="handleUploadLoginLogo"
      />

      <AdminAnnouncementPanel
        v-else-if="activeTab === 'announcement'"
        v-model:local-announcement="localAnnouncement"
        :announcement-loading="announcementLoading"
        :announcement-saving="announcementSaving"
        :show-save-announcement-confirm="showSaveAnnouncementConfirm"
        @save="openSaveAnnouncementConfirm"
        @save-confirmed="handleSaveAnnouncement"
        @close-save-confirm="showSaveAnnouncementConfirm = false"
      />
    </AdminPanelTabs>

    <AdminLoginLogConfirmModal
      v-model:show="showClearLogsConfirm"
      :total="loginLogsTotal"
      :loading="clearLogsLoading"
      @clear="confirmClearLogs"
    />

    <AdminCardConfirmModals
      v-model:show-card-claim-confirm="showCardClaimConfirm"
      v-model:pending-card-claim-enabled="pendingCardClaimEnabled"
      v-model:show-create-card-confirm="showCreateCardConfirm"
      v-model:show-toggle-card-status-confirm="showToggleCardStatusConfirm"
      v-model:pending-toggle-card="pendingToggleCard"
      v-model:show-delete-card-confirm="showDeleteCardConfirm"
      v-model:pending-delete-card="pendingDeleteCard"
      v-model:show-delete-selected-cards-confirm="showDeleteSelectedCardsConfirm"
      v-model:show-batch-update-cards-confirm="showBatchUpdateCardsConfirm"
      v-model:pending-batch-update="pendingBatchUpdate"
      :new-card="newCard"
      :selected-card-count="selectedCardCount"
      :available-time-cards="availableTimeCards"
      :card-claim-loading="cardClaimLoading"
      :create-card-loading="createCardLoading"
      :toggle-card-status-loading="toggleCardStatusLoading"
      :delete-card-loading="deleteCardLoading"
      :delete-selected-cards-loading="deleteSelectedCardsLoading"
      :batch-update-cards-loading="batchUpdateCardsLoading"
      @toggle-card-claim-status="confirmToggleCardClaimStatus"
      @create-card="createCard"
      @toggle-card-status="toggleCardStatus"
      @delete-card="confirmDeleteCard"
      @delete-selected-cards="confirmDeleteSelectedCards"
      @batch-update-cards="confirmBatchUpdateCards"
    />

    <AdminUserConfirmModals
      v-model:show-toggle-user-status-confirm="showToggleUserStatusConfirm"
      v-model:pending-toggle-user="pendingToggleUser"
      v-model:show-delete-user-confirm="showDeleteUserConfirm"
      v-model:pending-delete-user="pendingDeleteUser"
      v-model:show-renew-user-confirm="showRenewUserConfirm"
      v-model:pending-renew-user="pendingRenewUser"
      v-model:show-clear-expired-users-confirm="showClearExpiredUsersConfirm"
      v-model:show-edit-user-confirm="showEditUserConfirm"
      v-model:selected-user="selectedUser"
      :renew-user-card-code="renewUserCardCode"
      :expired-users-count="expiredUsersCount"
      :edit-form="editForm"
      :toggle-user-status-loading="toggleUserStatusLoading"
      :delete-user-loading="deleteUserLoading"
      :renew-user-loading="renewUserLoading"
      :clear-expired-users-loading="clearExpiredUsersLoading"
      :edit-loading="editLoading"
      @toggle-user-status="confirmToggleUserStatus"
      @delete-user="confirmDeleteUser"
      @renew-user="confirmRenewUser"
      @clear-expired-users="confirmClearExpiredUsers"
      @edit-user="confirmEditUser"
    />

    <AdminSystemConfigConfirmModals
      v-model:show-reset-system-confirm="showResetSystemConfirm"
      v-model:show-save-system-confirm="showSaveSystemConfirm"
      v-model:show-reset-login-links-confirm="showResetLoginLinksConfirm"
      v-model:show-reset-wx-config-confirm="showResetWxConfigConfirm"
      v-model:show-save-wx-config-confirm="showSaveWxConfigConfirm"
      :system-config-saving="systemConfigSaving"
      :wx-config-saving="wxConfigSaving"
      :login-links-saving="loginLinksSaving"
      @reset-login-links="handleResetLoginLinks"
      @reset-system="handleResetSystemConfig"
      @save-system="handleSaveSystemConfig"
      @reset-wx="handleResetWxConfig"
      @save-wx="handleSaveWxConfig"
    />

    <AdminAlertModal
      v-model:show="modalVisible"
      :config="modalConfig"
    />
  </div>
</template>

<style scoped lang="postcss">
.admin-panel {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
}
</style>
