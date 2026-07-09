// initDatabase 云函数 - 初始化数据库集合和商品数据
const cloud = require('wx-server-sdk')
const products = require('./data/products.js')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const results = { collections: [], products: [] }

  // 1. 创建集合（如不存在）
  const collections = ['products', 'orders', 'users']
  for (const name of collections) {
    try {
      await db.createCollection(name)
      results.collections.push({ name, status: 'created' })
    } catch (e) {
      // 集合已存在
      results.collections.push({ name, status: 'exists' })
    }
  }

  // 2. 写入商品数据
  for (const product of products) {
    try {
      // 先尝试查询是否已存在
      const existing = await db.collection('products').doc(product._id).get()
      if (existing.data) {
        // 更新
        await db.collection('products').doc(product._id).update({
          data: {
            ...product,
            updateTime: db.serverDate()
          }
        })
        results.products.push({ id: product._id, status: 'updated' })
      }
    } catch (e) {
      // 不存在，新增
      await db.collection('products').add({
        data: {
          ...product,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      results.products.push({ id: product._id, status: 'added' })
    }
  }

  return {
    code: 0,
    message: '数据库初始化完成',
    data: results
  }
}
