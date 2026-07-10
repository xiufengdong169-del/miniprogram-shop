// getOrders 云函数 - 获取用户订单列表（管理员权限读取）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { status = -1, page = 0, pageSize = 50 } = event

  if (!openid) {
    return { code: -1, message: '用户未登录' }
  }

  try {
    let query = db.collection('orders').where({ openid })

    if (status >= 0) {
      query = query.where({ openid, status })
    }

    const result = await query
      .orderBy('createTime', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: result.data
    }
  } catch (err) {
    console.error('获取订单列表失败:', err)
    return {
      code: -1,
      message: '获取订单列表失败'
    }
  }
}
