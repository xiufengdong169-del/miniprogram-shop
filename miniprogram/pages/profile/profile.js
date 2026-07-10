// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    needUpdateProfile: false,
    openid: '',
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
            nickName: user.nickName || '数乘用户',
            avatarUrl: user.avatarUrl || ''
          }
          this.setData({
            userInfo,
            hasUserInfo: true,
            needUpdateProfile: !user.nickName || user.nickName === '微信用户'
          })
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

  // 获取微信用户信息（使用 getUserProfile 获取真实昵称）
  onGetUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo
        this.setData({
          userInfo,
          hasUserInfo: true,
          needUpdateProfile: !userInfo.nickName || userInfo.nickName === '微信用户'
        })

        // 更新到云数据库
        wx.cloud.callFunction({
          name: 'login',
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl
          },
          success: () => {
            // 更新成功后重新加载，确保本地显示与数据库一致
            this.loadUserInfo()
          }
        })
      },
      fail: (err) => {
        console.error('获取用户资料失败:', err)
        wx.showToast({ title: '授权失败，请重试', icon: 'none' })
      }
    })
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
