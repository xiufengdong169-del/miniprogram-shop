// pages/orderDetail/orderDetail.js
const app = getApp()
const { showToast, formatDate } = require('../../utils/util.js')

Page({
  data: {
    orderId: '',
    order: null,
    loading: true,
    paying: false,
    statusText: '',
    statusColor: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ orderId: options.id })
      this.loadOrder(options.id)
    }
  },

  // 加载订单详情
  async loadOrder(orderId) {
    this.setData({ loading: true })

    try {
      const db = wx.cloud.database()
      const result = await db.collection('orders').doc(orderId).get()

      const order = result.data
      const statusMap = {
        0: { text: '待支付', color: '#f59e0b' },
        1: { text: '已支付', color: '#16a34a' },
        2: { text: '服务中', color: '#2563eb' },
        3: { text: '已完成', color: '#64748b' },
        4: { text: '已取消', color: '#94a3b8' },
        5: { text: '已退款', color: '#dc2626' }
      }
      const statusInfo = statusMap[order.status] || { text: '未知', color: '#94a3b8' }

      // 格式化时间
      if (order.createTime) {
        order.createTimeStr = formatDate(new Date(order.createTime))
      }
      if (order.payTime) {
        order.payTimeStr = formatDate(new Date(order.payTime))
      }

      this.setData({
        order,
        loading: false,
        statusText: statusInfo.text,
        statusColor: statusInfo.color
      })
    } catch (err) {
      console.error('加载订单详情失败:', err)
      this.setData({ loading: false })
      showToast('订单加载失败')
    }
  },

  // 去支付
  async onPay() {
    if (this.data.paying) return
    this.setData({ paying: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'pay',
        data: { orderId: this.data.orderId }
      })

      if (res.result && res.result.code === 0) {
        if (res.result.data.isFree) {
          this.loadOrder(this.data.orderId)
          return
        }

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
              this.loadOrder(this.data.orderId)
              this.setData({ paying: false })
            }, 1500)
          },
          fail: () => {
            showToast('支付未完成')
            this.setData({ paying: false })
          }
        })
      } else {
        showToast(res.result?.message || '支付失败')
        this.setData({ paying: false })
      }
    } catch (err) {
      console.error('支付异常:', err)
      showToast('支付服务异常')
      this.setData({ paying: false })
    }
  },

  // 取消订单
  onCancel() {
    wx.showModal({
      title: '提示',
      content: '确定要取消此订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            await db.collection('orders').doc(this.data.orderId).update({
              data: {
                status: 4,
                updateTime: db.serverDate()
              }
            })
            showToast('订单已取消')
            this.loadOrder(this.data.orderId)
          } catch (err) {
            showToast('取消失败')
          }
        }
      }
    })
  },

  // 复制订单号
  onCopyOrderNo() {
    wx.setClipboardData({
      data: this.data.order.orderNo,
      success: () => {
        showToast('已复制订单号', 'success')
      }
    })
  },

  // 联系客服
  onContactService() {
    wx.showToast({ title: '请联系客服微信', icon: 'none' })
  }
})
