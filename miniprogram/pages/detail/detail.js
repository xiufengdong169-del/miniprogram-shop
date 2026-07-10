// pages/detail/detail.js
const app = getApp()

Page({
  data: {
    productId: '',
    product: null,
    loading: true,
    selectedVariantIndex: 0,
    showVariantPopup: false,
    popupMode: '', // 'cart' or 'buy'
    cartCount: 0
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ productId: options.id })
      this.loadProduct(options.id)
    }
  },

  onShow() {
    this.setData({ cartCount: app.getCartCount() })
  },

  // 加载商品详情（直接读本地 products.js，改完文件编译即生效）
  loadProduct(id) {
    this.setData({ loading: true })
    this.loadLocalProduct(id)
  },

  // 本地数据兜底
  loadLocalProduct(id) {
    const products = require('../../data/products.js')
    const product = products.find(p => p._id === id)
    if (product) {
      this.setData({ product, loading: false })
      wx.setNavigationBarTitle({ title: product.shortTitle || '商品详情' })
    } else {
      this.setData({ loading: false })
      wx.showToast({ title: '商品不存在', icon: 'none' })
    }
  },

  // 选择规格
  onVariantTap(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ selectedVariantIndex: index })
  },

  // 加入购物车
  onAddToCart() {
    const product = this.data.product
    if (!product) return

    if (product.isFree) {
      // 免费商品直接跳转（模拟服务入口）
      wx.showToast({ title: '正在跳转服务...', icon: 'success' })
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/checkout/checkout?mode=direct&productId=${product._id}`
        })
      }, 1000)
      return
    }

    if (product.variants && product.variants.length > 0) {
      this.setData({ showVariantPopup: true, popupMode: 'cart' })
    } else {
      this.doAddToCart()
    }
  },

  // 立即购买
  onBuyNow() {
    console.log('[detail] onBuyNow clicked')
    const product = this.data.product
    console.log('[detail] product:', product)
    if (!product) {
      console.log('[detail] product is null, return')
      return
    }

    if (product.isFree) {
      console.log('[detail] isFree, direct navigate')
      wx.showToast({ title: '正在跳转服务...', icon: 'success' })
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/checkout/checkout?mode=direct&productId=${product._id}`,
          success: () => console.log('[detail] navigate success'),
          fail: (err) => console.error('[detail] navigate fail:', err)
        })
      }, 500)
      return
    }

    if (product.variants && product.variants.length > 0) {
      this.setData({ showVariantPopup: true, popupMode: 'buy' })
    } else {
      this.doBuyNow()
    }
  },

  // 执行加入购物车
  doAddToCart() {
    const product = this.data.product
    const variant = product.variants && product.variants.length > 0
      ? product.variants[this.data.selectedVariantIndex]
      : null

    app.addToCart(product, variant)
    this.setData({
      cartCount: app.getCartCount(),
      showVariantPopup: false
    })
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },

  // 执行立即购买
  doBuyNow() {
    const product = this.data.product
    const variant = product.variants && product.variants.length > 0
      ? product.variants[this.data.selectedVariantIndex]
      : null

    const item = {
      productId: product._id,
      name: product.name,
      shortTitle: product.shortTitle,
      price: variant ? variant.price : product.price,
      originalPrice: variant ? variant.originalPrice : product.originalPrice,
      variantName: variant ? variant.name : '',
      image: product.localImage || product.image,
      quantity: 1
    }

    // 临时存储并跳转到下单页
    wx.setStorageSync('buyNowItem', item)
    this.setData({ showVariantPopup: false })
    wx.navigateTo({
      url: '/pages/checkout/checkout?mode=buyNow'
    })
  },

  // 弹窗确认
  onPopupConfirm() {
    if (this.data.popupMode === 'cart') {
      this.doAddToCart()
    } else {
      this.doBuyNow()
    }
  },

  // 关闭弹窗
  onPopupClose() {
    this.setData({ showVariantPopup: false })
  },

  // 跳转购物车
  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  // 预览图片
  onImagePreview() {
    const product = this.data.product
    if (product && product.localImage) {
      wx.previewImage({
        urls: [product.localImage]
      })
    }
  }
})
