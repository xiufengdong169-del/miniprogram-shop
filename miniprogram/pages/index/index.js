// pages/index/index.js
const app = getApp()

Page({
  data: {
    banner: '/images/banner.png',
    categories: ['全部', '免费速测', '数据体检', '入表潜力测算', '数据产权登记', '数据合规包', '企业数字名片', '入表实施', '融资对接'],
    activeCategory: '全部',
    products: [],
    loading: true,
    cartCount: 0
  },

  onLoad() {
    this.loadProducts()
  },

  onShow() {
    // 更新购物车数量
    this.setData({ cartCount: app.getCartCount() })
  },

  // 加载商品列表（直接读本地 products.js，改完文件编译即生效）
  loadProducts() {
    this.setData({ loading: true })
    const products = this.getLocalProducts()
    this.setData({ products, loading: false })
  },

  // 获取本地过滤后的商品数据
  getLocalProducts() {
    const products = require('../../data/products.js')
    let filtered = products.filter(p => p.onShelf)
    if (this.data.activeCategory !== '全部') {
      filtered = filtered.filter(p => p.category === this.data.activeCategory)
    }
    filtered.sort((a, b) => a.sortOrder - b.sortOrder)
    return filtered
  },

  // 切换分类
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ activeCategory: category })
    this.loadProducts()
  },

  // 跳转购物车
  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadProducts()
    wx.stopPullDownRefresh()
  }
})
