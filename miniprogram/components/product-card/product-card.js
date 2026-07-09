// components/product-card/product-card.js
const app = getApp()

Component({
  properties: {
    product: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTap() {
      const id = this.data.product._id
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}`
      })
    },

    // 按钮点击：免费商品直接跳转详情页，付费商品加入购物车
    onActionTap() {
      const product = this.data.product
      if (product.isFree) {
        // 免费商品直接跳转详情页
        wx.navigateTo({
          url: `/pages/detail/detail?id=${product._id}`
        })
      } else {
        // 付费商品加入购物车
        app.addToCart(product, null)
        wx.showToast({ title: '已加入购物车', icon: 'success' })
        wx.vibrateShort({ type: 'light' })
      }
    },

    formatPrice(price) {
      if (price === 0) return '免费'
      return '¥' + (price / 100).toFixed(2)
    }
  }
})
