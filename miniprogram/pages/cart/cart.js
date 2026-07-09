// pages/cart/cart.js
const app = getApp()

Page({
  data: {
    cartItems: [],
    totalAmount: 0,
    totalCount: 0,
    selectedIds: [],
    isAllSelected: true,
    editing: false
  },

  onShow() {
    this.refreshCart()
  },

  // 刷新购物车数据
  refreshCart() {
    const cart = app.globalData.cart
    const totalAmount = cart
      .filter(item => this.data.selectedIds.indexOf(item.id) > -1 || this.data.isAllSelected)
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
    const totalCount = cart
      .filter(item => this.data.selectedIds.indexOf(item.id) > -1 || this.data.isAllSelected)
      .reduce((sum, item) => sum + item.quantity, 0)

    // 初始化选中状态
    const selectedIds = this.data.selectedIds.length === 0 && this.data.isAllSelected
      ? cart.map(item => item.id)
      : this.data.selectedIds

    this.setData({
      cartItems: cart,
      totalAmount,
      totalCount,
      selectedIds
    })
  },

  // 数量减少
  onDecrease(e) {
    const itemId = e.currentTarget.dataset.id
    const item = this.data.cartItems.find(i => i.id === itemId)
    if (item && item.quantity > 1) {
      app.updateCartQuantity(itemId, item.quantity - 1)
    } else {
      app.removeFromCart(itemId)
    }
    this.setData({ selectedIds: this.data.selectedIds })
    this.refreshCart()
  },

  // 数量增加
  onIncrease(e) {
    const itemId = e.currentTarget.dataset.id
    const item = this.data.cartItems.find(i => i.id === itemId)
    if (item) {
      app.updateCartQuantity(itemId, item.quantity + 1)
    }
    this.refreshCart()
  },

  // 删除商品
  onRemove(e) {
    const itemId = e.currentTarget.dataset.id
    wx.showModal({
      title: '提示',
      content: '确定要删除这个商品吗？',
      success: (res) => {
        if (res.confirm) {
          app.removeFromCart(itemId)
          // 从选中列表中移除
          const selectedIds = this.data.selectedIds.filter(id => id !== itemId)
          this.setData({ selectedIds })
          this.refreshCart()
        }
      }
    })
  },

  // 切换选中状态
  onToggleSelect(e) {
    const itemId = e.currentTarget.dataset.id
    let selectedIds = [...this.data.selectedIds]
    const index = selectedIds.indexOf(itemId)
    if (index > -1) {
      selectedIds.splice(index, 1)
    } else {
      selectedIds.push(itemId)
    }
    this.setData({
      selectedIds,
      isAllSelected: selectedIds.length === this.data.cartItems.length
    })
    this.refreshCart()
  },

  // 全选/取消全选
  onToggleAll() {
    if (this.data.isAllSelected) {
      this.setData({ selectedIds: [], isAllSelected: false })
    } else {
      this.setData({
        selectedIds: this.data.cartItems.map(item => item.id),
        isAllSelected: true
      })
    }
    this.refreshCart()
  },

  // 去结算
  onCheckout() {
    const selectedIds = this.data.selectedIds
    if (selectedIds.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }

    // 将选中的商品存入临时存储
    const selectedItems = this.data.cartItems.filter(item => selectedIds.indexOf(item.id) > -1)
    wx.setStorageSync('checkoutItems', selectedItems)

    wx.navigateTo({
      url: '/pages/order/order?mode=cart'
    })
  },

  // 去逛逛
  goShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
