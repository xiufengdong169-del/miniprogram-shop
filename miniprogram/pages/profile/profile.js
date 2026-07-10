// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    needUpdateProfile: false,
    openid: '',
    _nickTimer: null,
    orderStats: {
      pending: 0,
      paid: 0,
      service: 0,
      done: 0
    }
  },

  onShow() {
    this.loadUserInfo()
    this.loadOrderStats()
  },

  // 加载用户信息
  async loadUserInfo() {
    const openid = await app.getOpenid()
    this.setData({ openid: openid || '未获取' })

    // 尝试从数据库获取用户信息
    if (openid) {
      try {
        const db = wx.cloud.database()
        const result = await db.collection('users').where({ openid }).get()
        if (result.data.length > 0) {
          const user = result.data[0]
          const userInfo = {
            nickName: user.nickName || '微信用户',
            avatarUrl: user.avatarUrl || ''
          }
          this.setData({
            userInfo,
            hasUserInfo: true,
            needUpdateProfile: !user.nickName || user.nickName === '微信用户'
          })
        } else {
          // 数据库里还没有记录，标记为已登录等用户填写
          this.setData({ hasUserInfo: true })
        }
      } catch (e) {
        console.error('获取用户信息失败:', e)
      }
    }
  },

  // 加载订单统计
  async loadOrderStats() {
    try {
      const openid = await app.getOpenid()
      if (!openid) return

      const db = wx.cloud.database()

      const [pending, paid, service, done] = await Promise.all([
        db.collection('orders').where({ openid, status: 0 }).count(),
        db.collection('orders').where({ openid, status: 1 }).count(),
        db.collection('orders').where({ openid, status: 2 }).count(),
        db.collection('orders').where({ openid, status: 3 }).count()
      ])

      this.setData({
        orderStats: {
          pending: pending.total,
          paid: paid.total,
          service: service.total,
          done: done.total
        }
      })
    } catch (err) {
      console.error('加载订单统计失败:', err)
    }
  },

  // 点击登录：调用云函数获取 openid
  async onLogin() {
    wx.showLoading({ title: '登录中...' })
    try {
      const res = await wx.cloud.callFunction({ name: 'login' })
      if (res.result && res.result.openid) {
        this.setData({ openid: res.result.openid, hasUserInfo: true })
        wx.hideLoading()
        this.loadUserInfo()
      }
    } catch (err) {
      wx.hideLoading()
      console.error('登录失败:', err)
      wx.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  },

  // 选择微信头像
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    if (!avatarUrl) return

    this.setData({ 'userInfo.avatarUrl': avatarUrl })

    // 上传到云存储并更新数据库
    this._uploadAvatar(avatarUrl)
  },

  // 上传头像到云存储
  async _uploadAvatar(tempPath) {
    try {
      const cloudPath = `avatars/${this.data.openid}_${Date.now()}.png`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempPath
      })

      // 更新数据库
      await wx.cloud.callFunction({
        name: 'login',
        data: {
          avatarUrl: uploadRes.fileID
        }
      })

      this.setData({ 'userInfo.avatarUrl': uploadRes.fileID })
      wx.showToast({ title: '头像已更新', icon: 'success' })
    } catch (err) {
      console.error('头像上传失败:', err)
      // 上传失败也先显示临时路径
      wx.showToast({ title: '头像保存失败', icon: 'none' })
    }
  },

  // 昵称输入（防抖保存）
  onNicknameInput(e) {
    const nickName = e.detail.value
    this.setData({ 'userInfo.nickName': nickName })

    // 防抖：500ms 后保存
    if (this.data._nickTimer) clearTimeout(this.data._nickTimer)
    this.data._nickTimer = setTimeout(() => {
      this._saveNickname(nickName)
    }, 500)
  },

  // 昵称失焦保存
  onNicknameBlur(e) {
    const nickName = (e.detail.value || '').trim()
    if (!nickName || nickName === '微信用户') return

    this.setData({
      'userInfo.nickName': nickName,
      needUpdateProfile: false
    })
    this._saveNickname(nickName)
  },

  // 保存昵称到云数据库
  async _saveNickname(nickName) {
    if (!nickName || nickName === '微信用户') return
    try {
      await wx.cloud.callFunction({
        name: 'login',
        data: { nickName }
      })
      wx.showToast({ title: '昵称已保存', icon: 'none', duration: 1000 })
    } catch (err) {
      console.error('昵称保存失败:', err)
    }
  },

  // 跳转订单列表
  onOrderTab(e) {
    const status = e.currentTarget.dataset.status
    wx.switchTab({
      url: '/pages/order/order'
    })
  },

  // 菜单项跳转
  onMenuTap(e) {
    const type = e.currentTarget.dataset.type
    switch (type) {
      case 'orders':
        wx.switchTab({ url: '/pages/order/order' })
        break
      case 'cart':
        wx.switchTab({ url: '/pages/cart/cart' })
        break
      case 'about':
        wx.showModal({
          title: '关于数乘科技',
          content: '数乘科技 — 中小微企业数据资产服务商\n\n让企业的数据从"沉睡的成本"变成"看得见的资产"。',
          showCancel: false,
          confirmText: '知道了'
        })
        break
      case 'invoice':
        wx.showToast({ title: '请在订单中申请开票', icon: 'none' })
        break
      case 'privacy':
        wx.showModal({
          title: '隐私政策',
          content: '我们严格保护您的个人信息。所有数据仅用于提供服务，不会泄露给第三方。',
          showCancel: false,
          confirmText: '知道了'
        })
        break
    }
  }
})
