// components/product-card/product-card.js
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

    formatPrice(price) {
      if (price === 0) return '免费'
      return '¥' + (price / 100).toFixed(2)
    }
  }
})
