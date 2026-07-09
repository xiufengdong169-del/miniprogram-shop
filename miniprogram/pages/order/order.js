// pages/order/order.js
const app = getApp()
const { formatPrice, generateOrderNo, showToast } = require('../../utils/util.js')

Page({
  data: {
    mode: 'list', // 'list' = 订单列表, 'checkout' = 下单确认
    // 订单列表数据
    orders: [],
    activeTab: -1, // -1=全部, 0=待支付, 1=已支付, 2=服务中, 3=已完成
    orderTabs: [
      { status: -1, text: '全部' },
      { status: 0, text: '待支付' },
      { status: 1, text: '已支付' },
      { status: 3, text: '已完成' }
    ],
    loadingList: true,
    // 下单数据
    checkoutItems: [],
    totalAmount: 0,
    contactInfo: {
      name: '',
      phone: '',
      company: '',
      email: ''
    },
    remark: '',
    submitting: false
  },

  onLoad(options) {
    if (options.mode) {
      this.setData({ mode: 'checkout' })
      this.initCheckout(options)
    } else {
      this.setData({ mode: 'list' })
    }
  },

  onShow() {
    if (this.data.mode === 'list') {
      this.loadOrders()
    }
  },

  // ============ 下单相关 ============

  // 初始化下单
  initCheckout(options) {
    let items = []

    if (options.mode === 'cart') {
      // 从购物车结算
      items = wx.getStorageSync('checkoutItems') || []
    } else if (options.mode === 'buyNow') {
      // 立即购买
      const item = wx.getStorageSync('buyNowItem')
      if (item) {
        items = [item]
      }
    } else if (options.mode === 'direct' && options.productId) {
      // 免费商品直接进入
      const products = require('../../data/products.js')
      const product = products.find(p => p._id === options.productId)
      if (product) {
        items = [{
          productId: product._id,
          name: product.name,
          shortTitle: product.shortTitle,
          price: product.price,
          originalPrice: product.originalPrice,
          variantName: '',
          image: product.localImage || product.image,
          quantity: 1
        }]
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    this.setData({
      checkoutItems: items,
      totalAmount
    })

    // 加载已保存的联系人信息
    const savedContact = wx.getStorageSync('contactInfo')
    if (savedContact) {
      this.setData({ contactInfo: savedContact })
    }
  },

  // 输入联系人信息
  onInputName(e) {
    this.setData({ 'contactInfo.name': e.detail.value })
  },

  onInputPhone(e) {
    this.setData({ 'contactInfo.phone': e.detail.value })
  },

  onInputCompany(e) {
    this.setData({ 'contactInfo.company': e.detail.value })
  },

  onInputEmail(e) {
    this.setData({ 'contactInfo.email': e.detail.value })
  },

  onInputRemark(e) {
    this.setData({ remark: e.detail.value })
  },

  // 验证手机号
  validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone)
  },

  // 提交订单
  async onSubmitOrder() {
    const { contactInfo, checkoutItems, remark } = this.data

    // 表单验证
    if (!contactInfo.name.trim()) {
      showToast('请输入联系人姓名')
      return
    }
    if (!contactInfo.phone.trim()) {
      showToast('请输入联系电话')
      return
    }
    if (!this.validatePhone(contactInfo.phone)) {
      showToast('请输入正确的手机号')
      return
    }
    if (checkoutItems.length === 0) {
      showToast('订单商品为空')
      return
    }

    this.setData({ submitting: true })

    // 保存联系人信息
    wx.setStorageSync('contactInfo', contactInfo)

    try {
      // 确保openid已获取
      await app.getOpenid()

      // 调用云函数创建订单
      const res = await wx.cloud.callFunction({
        name: 'createOrder',
        data: {
          items: checkoutItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            variantName: item.variantName || ''
          })),
          contactInfo,
          remark
        }
      })

      if (res.result && res.result.code === 0) {
        const orderId = res.result.data.orderId
        const isFree = res.result.data.totalAmount === 0

        // 如果是购物车来的，清除已下单的商品
        if (this.data.mode === 'checkout') {
          const checkoutItemIds = checkoutItems.map(item => item.id).filter(Boolean)
          checkoutItemIds.forEach(id => app.removeFromCart(id))
        }

        // 清除临时存储
        wx.removeStorageSync('checkoutItems')
        wx.removeStorageSync('buyNowItem')

        if (isFree) {
          // 免费商品，直接完成
          wx.showToast({ title: '提交成功', icon: 'success' })
          setTimeout(() => {
            wx.redirectTo({
              url: `/pages/orderDetail/orderDetail?id=${orderId}`
            })
          }, 1500)
        } else {
          // 付费商品，发起支付
          this.initiatePayment(orderId)
        }
      } else {
        this.setData({ submitting: false })
        showToast(res.result?.message || '创建订单失败')
      }
    } catch (err) {
      console.error('创建订单失败:', err)
      this.setData({ submitting: false })
      showToast('创建订单失败，请重试')
    }
  },

  // 发起微信支付
  async initiatePayment(orderId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'pay',
        data: { orderId }
      })

      if (res.result && res.result.code === 0) {
        if (res.result.data.isFree) {
          // 免费商品
          wx.showToast({ title: '提交成功', icon: 'success' })
          setTimeout(() => {
            wx.redirectTo({
              url: `/pages/orderDetail/orderDetail?id=${orderId}`
            })
          }, 1500)
          return
        }

        // 调用微信支付
        const payParams = res.result.data.paymentParams
        wx.requestPayment({
          timeStamp: payParams.timeStamp,
          nonceStr: payParams.nonceStr,
          package: payParams.package,
          signType: payParams.signType,
          paySign: payParams.paySign,
          success: () => {
            wx.showToast({ title: '支付成功', icon: 'success' })
            setTimeout(() => {
              wx.redirectTo({
                url: `/pages/orderDetail/orderDetail?id=${orderId}`
              })
            }, 1500)
          },
          fail: (err) => {
            console.error('支付失败:', err)
            this.setData({ submitting: false })
            wx.showModal({
              title: '支付提示',
              content: '支付未完成，您可以在订单中重新支付',
              showCancel: false,
              confirmText: '查看订单',
              success: () => {
                wx.redirectTo({
                  url: `/pages/orderDetail/orderDetail?id=${orderId}`
                })
              }
            })
          }
        })
      } else {
        this.setData({ submitting: false })
        wx.showModal({
          title: '提示',
          content: res.result?.message || '支付服务异常，请在订单中重试',
          showCancel: false
        })
      }
    } catch (err) {
      console.error('支付异常:', err)
      this.setData({ submitting: false })
      showToast('支付服务异常')
    }
  },

  // ============ 订单列表相关 ============

  // 加载订单列表
  async loadOrders() {
    this.setData({ loadingList: true })

    try {
      const openid = await app.getOpenid()
      const db = wx.cloud.database()
      const _ = db.command

      let query = { openid }
      if (this.data.activeTab >= 0) {
        query.status = this.data.activeTab
      }

      const result = await db.collection('orders')
        .where(query)
        .orderBy('createTime', 'desc')
        .limit(50)
        .get()

      this.setData({
        orders: result.data,
        loadingList: false
      })
    } catch (err) {
      console.error('加载订单列表失败:', err)
      this.setData({ loadingList: false })
    }
  },

  // 切换订单状态tab
  onTabTap(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ activeTab: status })
    this.loadOrders()
  },

  // 跳转订单详情
  onOrderTap(e) {
    const orderId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/orderDetail/orderDetail?id=${orderId}`
    })
  },

  // 去逛逛
  goShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
