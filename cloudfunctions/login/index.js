// login 云函数 - 获取用户openid
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 记录用户信息到users集合
  const db = cloud.database()
  try {
    const existing = await db.collection('users').where({ openid }).get()
    if (existing.data.length === 0) {
      await db.collection('users').add({
        data: {
          openid,
          nickName: event.nickName || '',
          avatarUrl: event.avatarUrl || '',
          phone: '',
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    } else {
      // 更新用户信息
      if (event.nickName || event.avatarUrl) {
        await db.collection('users').doc(existing.data[0]._id).update({
          data: {
            nickName: event.nickName || existing.data[0].nickName,
            avatarUrl: event.avatarUrl || existing.data[0].avatarUrl,
            updateTime: db.serverDate()
          }
        })
      }
    }
  } catch (e) {
    console.error('用户信息处理失败:', e)
  }

  return {
    openid,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID || ''
  }
}
