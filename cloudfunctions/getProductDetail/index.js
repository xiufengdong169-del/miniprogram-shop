// getProductDetail 云函数 - 获取商品详情
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { productId } = event

  try {
    const result = await db.collection('products').doc(productId).get()
    return {
      code: 0,
      message: 'success',
      data: result.data
    }
  } catch (err) {
    console.error('获取商品详情失败:', err)
    return {
      code: -1,
      message: '商品不存在',
      data: null
    }
  }
}
