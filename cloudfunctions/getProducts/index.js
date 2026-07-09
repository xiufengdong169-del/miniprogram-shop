// getProducts 云函数 - 获取商品列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { category, onShelfOnly = true } = event

  try {
    // 构建查询条件
    let query = {}
    if (onShelfOnly) {
      query.onShelf = true
    }
    if (category && category !== '全部') {
      query.category = category
    }

    // 查询商品
    const result = await db.collection('products')
      .where(query)
      .orderBy('sortOrder', 'asc')
      .get()

    return {
      code: 0,
      message: 'success',
      data: result.data
    }
  } catch (err) {
    console.error('获取商品列表失败:', err)
    return {
      code: -1,
      message: '获取商品列表失败',
      data: []
    }
  }
}
