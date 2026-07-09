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

  // 加载商品列表
  loadProducts() {
    this.setData({ loading: true })

    wx.cloud.callFunction({
      name: 'getProducts',
      data: {
        category: this.data.activeCategory,
        onShelfOnly: true
      }
    }).then(res => {
      if (res.result && res.result.code === 0) {
        this.setData({
          products: res.result.data,
          loading: false
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    }).catch(err => {
      console.error('加载商品失败:', err)
      this.setData({ loading: false })

      // 云函数未部署时使用本地模拟数据
      this.loadLocalProducts()
    })
  },

  // 本地模拟数据（开发阶段使用）
  loadLocalProducts() {
    const products = require('../../data/products.js')
    let filtered = products.filter(p => p.onShelf)
    if (this.data.activeCategory !== '全部') {
      filtered = filtered.filter(p => p.category === this.data.activeCategory)
    }
    filtered.sort((a, b) => a.sortOrder - b.sortOrder)
    this.setData({ products: filtered, loading: false })
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
