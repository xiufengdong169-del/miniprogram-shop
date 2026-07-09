// utils/util.js - 通用工具函数

/**
 * 格式化价格为显示字符串
 * @param {number} price - 价格（分）
 * @returns {string} 格式化后的价格
 */
function formatPrice(price) {
  if (price === 0) return '免费'
  return '¥' + (price / 100).toFixed(2)
}

/**
 * 格式化日期
 * @param {Date|number} date - 日期对象或时间戳
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  if (typeof date === 'number') {
    date = new Date(date)
  }
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

/**
 * 生成订单号
 * @returns {string} 订单号
 */
function generateOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `SC${y}${m}${d}${h}${min}${s}${random}`
}

/**
 * 显示提示
 */
function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 })
}

/**
 * 显示加载
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

/**
 * 隐藏加载
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 订单状态映射
 */
const ORDER_STATUS = {
  0: { text: '待支付', color: '#f59e0b' },
  1: { text: '已支付', color: '#16a34a' },
  2: { text: '服务中', color: '#2563eb' },
  3: { text: '已完成', color: '#64748b' },
  4: { text: '已取消', color: '#94a3b8' },
  5: { text: '已退款', color: '#dc2626' }
}

function getOrderStatusText(status) {
  return ORDER_STATUS[status] ? ORDER_STATUS[status].text : '未知'
}

function getOrderStatusColor(status) {
  return ORDER_STATUS[status] ? ORDER_STATUS[status].color : '#94a3b8'
}

module.exports = {
  formatPrice,
  formatDate,
  generateOrderNo,
  showToast,
  showLoading,
  hideLoading,
  getOrderStatusText,
  getOrderStatusColor,
  ORDER_STATUS
}
