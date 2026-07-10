// createOrder 云函数 - 创建订单
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 使用本地商品数据（与前端 products.js 同步）
const PRODUCTS = require('./data/products.js')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { items, contactInfo, remark = '' } = event

  // 参数校验
  if (!items || items.length === 0) {
    return { code: -1, message: '订单商品不能为空' }
  }

  if (!contactInfo || !contactInfo.name || !contactInfo.phone) {
    return { code: -1, message: '请填写联系人信息' }
  }

  try {
    // 计算订单总金额（单位：分）
    let totalAmount = 0
    const orderItems = []

    for (const item of items) {
      // 从本地商品数据中查询（不再依赖云数据库 products 集合）
      const product = PRODUCTS.find(p => p._id === item.productId)

      if (!product || !product.onShelf) {
        return { code: -1, message: `商品 ${item.productId} 不存在或已下架` }
      }

      // 确定单价
      let unitPrice = product.price
      let variantName = ''

      if (item.variantName && product.variants && product.variants.length > 0) {
        const variant = product.variants.find(v => v.name === item.variantName)
        if (variant) {
          unitPrice = variant.price
          variantName = variant.name
        }
      }

      const itemTotal = unitPrice * item.quantity
      totalAmount += itemTotal

      orderItems.push({
        productId: product._id,
        name: product.name,
        shortTitle: product.shortTitle,
        image: product.localImage || product.image,
        unitPrice,
        quantity: item.quantity,
        variantName,
        itemTotal
      })
    }

    // 生成订单号
    const now = new Date()
    const orderNo = 'SC' +
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0') +
      Math.floor(Math.random() * 10000).toString().padStart(4, '0')

    // 创建订单记录
    const orderData = {
      orderNo,
      openid,
      items: orderItems,
      totalAmount,
      contactInfo: {
        name: contactInfo.name,
        phone: contactInfo.phone,
        company: contactInfo.company || '',
        email: contactInfo.email || ''
      },
      remark,
      status: 0, // 0=待支付
      statusHistory: [{
        status: 0,
        text: '订单创建',
        time: db.serverDate()
      }],
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      payTime: null,
      isVirtual: true // 虚拟商品（服务类）
    }

    const result = await db.collection('orders').add({ data: orderData })

    return {
      code: 0,
      message: '订单创建成功',
      data: {
        orderId: result._id,
        orderNo,
        totalAmount,
        items: orderItems
      }
    }
  } catch (err) {
    console.error('创建订单失败:', err)
    return {
      code: -1,
      message: '创建订单失败: ' + err.message
    }
  }
}
