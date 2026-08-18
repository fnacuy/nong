import { ref } from 'vue'
import api from '@/api'

export interface Announcement {
  content: string
  showOnce: boolean
  updatedAt: number
}

interface UseAdminAnnouncementOptions {
  showAlert: (message: string, type?: 'primary' | 'danger') => void
}

export function useAdminAnnouncement(options: UseAdminAnnouncementOptions) {
  const announcementLoading = ref(false)
  const announcementSaving = ref(false)
  const showSaveAnnouncementConfirm = ref(false)
  const localAnnouncement = ref<Announcement>({ content: '', showOnce: true, updatedAt: 0 })

  async function loadAnnouncement() {
    announcementLoading.value = true
    try {
      const { data } = await api.get('/api/announcement')
      if (data?.ok && data.data) {
        localAnnouncement.value = {
          content: data.data.content || '',
          showOnce: data.data.showOnce !== false,
          updatedAt: data.data.updatedAt || 0,
        }
      }
    }
    catch (e: any) {
      console.error('加载公告失败:', e)
    }
    finally {
      announcementLoading.value = false
    }
  }

  function openSaveAnnouncementConfirm() {
    if (!String(localAnnouncement.value.content || '').trim()) {
      options.showAlert('公告内容不能为空', 'danger')
      return
    }
    showSaveAnnouncementConfirm.value = true
  }

  async function handleSaveAnnouncement() {
    showSaveAnnouncementConfirm.value = false
    announcementSaving.value = true
    try {
      const { data } = await api.post('/api/admin/announcement', {
        content: String(localAnnouncement.value.content || '').trim(),
        showOnce: localAnnouncement.value.showOnce !== false,
        confirmed: true,
      })
      if (data?.ok && data.data) {
        localAnnouncement.value = {
          content: data.data.content || '',
          showOnce: data.data.showOnce !== false,
          updatedAt: data.data.updatedAt || 0,
        }
        options.showAlert('公告已保存，普通用户登录后将看到新公告', 'primary')
      }
      else {
        options.showAlert(data?.error || '保存失败', 'danger')
      }
    }
    catch (e: any) {
      options.showAlert(e?.response?.data?.error || `保存失败: ${e.message || '未知错误'}`, 'danger')
    }
    finally {
      announcementSaving.value = false
    }
  }

  return {
    announcementLoading,
    announcementSaving,
    showSaveAnnouncementConfirm,
    localAnnouncement,
    loadAnnouncement,
    openSaveAnnouncementConfirm,
    handleSaveAnnouncement,
  }
}
