// app.js
App({
  globalData: {
    userInfo: null,
    openid: null,
    cart: [], // 购物车数据
    cloudEnv: 'cloudbase-d7gc2b32cd4196059' // 云开发环境ID
  },

  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: this.globalData.cloudEnv,
        traceUser: true
      })
    }

    // 从本地存储恢复购物车
    const cart = wx.getStorageSync('cart')
    if (cart) {
      this.globalData.cart = cart
    }

    // 获取用户openid
    this.getOpenid()
  },

  // 获取用户openid
  getOpenid() {
    if (this.globalData.openid) {
      return Promise.resolve(this.globalData.openid)
    }
    return wx.cloud.callFunction({
      name: 'login'
    }).then(res => {
      this.globalData.openid = res.result.openid
      return res.result.openid
    }).catch(err => {
      console.error('获取openid失败:', err)
      return null
    })
  },

  // 保存购物车到本地存储
  saveCart() {
    wx.setStorageSync('cart', this.globalData.cart)
  },

  // 添加商品到购物车
  addToCart(product, variant) {
    const cart = this.globalData.cart
    const itemId = variant ? `${product._id}_${variant.name}` : product._id
    const existing = cart.find(item => item.id === itemId)

    if (existing) {
      existing.quantity += 1
    } else {
      cart.push({
        id: itemId,
        productId: product._id,
        name: product.name,
        shortTitle: product.shortTitle,
        price: variant ? variant.price : product.price,
        originalPrice: variant ? variant.originalPrice : product.originalPrice,
        variantName: variant ? variant.name : '',
        image: product.image,
        quantity: 1,
        category: product.category
      })
    }
    this.saveCart()
    return cart.length
  },

  // 从购物车移除
  removeFromCart(itemId) {
    const cart = this.globalData.cart
    const index = cart.findIndex(item => item.id === itemId)
    if (index > -1) {
      cart.splice(index, 1)
      this.saveCart()
    }
  },

  // 更新购物车商品数量
  updateCartQuantity(itemId, quantity) {
    const cart = this.globalData.cart
    const item = cart.find(item => item.id === itemId)
    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(itemId)
      } else {
        item.quantity = quantity
        this.saveCart()
      }
    }
  },

  // 清空购物车
  clearCart() {
    this.globalData.cart = []
    this.saveCart()
  },

  // 获取购物车总数量
  getCartCount() {
    return this.globalData.cart.reduce((sum, item) => sum + item.quantity, 0)
  },

  // 获取购物车总金额
  getCartTotal() {
    return this.globalData.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }
})
