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

  // 2. 写入商品数据（使用 _id 查询，存在则更新，不存在则新增）
  for (const product of products) {
    try {
      const existing = await db.collection('products').where({ _id: product._id }).get()
      if (existing.data && existing.data.length > 0) {
        // 已存在，更新
        await db.collection('products').doc(product._id).update({
          data: {
            ...product,
            updateTime: db.serverDate()
          }
        })
        results.products.push({ id: product._id, status: 'updated' })
      } else {
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
    } catch (e) {
      console.error(`商品 ${product._id} 初始化失败:`, e)
      results.products.push({ id: product._id, status: 'failed', error: e.message })
    }
  }

  return {
    code: 0,
    message: '数据库初始化完成',
    data: results
  }
}
