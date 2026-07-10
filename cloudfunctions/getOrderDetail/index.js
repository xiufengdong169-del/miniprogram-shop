// getOrderDetail 云函数 - 获取订单详情 / 取消订单（管理员权限，不受集合权限限制）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { orderId, action } = event

  if (!orderId) {
    return { code: -1, message: '缺少订单ID' }
  }

  try {
    // 取消订单
    if (action === 'cancel') {
      const orderRes = await db.collection('orders').doc(orderId).get()
      const order = orderRes.data

      if (order.openid !== openid) {
        return { code: -1, message: '无权操作此订单' }
      }

      if (order.status !== 0) {
        return { code: -1, message: '订单状态异常，无法取消' }
      }

      await db.collection('orders').doc(orderId).update({
        data: {
          status: 4,
          updateTime: db.serverDate(),
          statusHistory: db.command.push({
            status: 4,
            text: '用户取消订单',
            time: new Date()
          })
        }
      })

      return { code: 0, message: '订单已取消' }
    }

    // 获取订单详情
    const result = await db.collection('orders').doc(orderId).get()
    const order = result.data

    // 安全校验：只能查看自己的订单
    if (order.openid !== openid) {
      return { code: -1, message: '无权查看此订单' }
    }

    return {
      code: 0,
      data: order
    }
  } catch (err) {
    console.error('操作订单失败:', err)
    return {
      code: -1,
      message: '订单不存在或已被删除'
    }
  }
}
