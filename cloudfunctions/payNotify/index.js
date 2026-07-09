// payNotify 云函数 - 微信支付结果通知回调
// 微信支付服务器在用户完成支付后调用此云函数
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 商户API密钥（与pay云函数一致，部署时替换）
const API_KEY = 'YOUR_MCH_API_KEY_32_CHARS_LONG_xxxx'

/**
 * 验证签名
 */
function verifySign(params, key) {
  const sign = params.sign
  if (!sign) return false

  // 重新计算签名
  const sortedKeys = Object.keys(params).sort()
  let str = ''
  for (const k of sortedKeys) {
    if (params[k] !== '' && params[k] !== undefined && params[k] !== null && k !== 'sign') {
      str += `${k}=${params[k]}&`
    }
  }
  str += `key=${key}`
  const computedSign = crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase()

  return computedSign === sign
}

/**
 * 解析XML
 */
function parseXML(xml) {
  const result = {}
  const regex = /<!\[CDATA\[([^\]]*)\]\]><\/([^>]+)>/g
  let match
  while ((match = regex.exec(xml)) !== null) {
    result[match[2]] = match[1]
  }
  return result
}

/**
 * 构建XML响应
 */
function buildXMLResponse(code, message) {
  return `<xml>
    <return_code><![CDATA[${code}]]></return_code>
    <return_msg><![CDATA[${message}]]></return_msg>
  </xml>`
}

exports.main = async (event, context) => {
  console.log('收到支付回调:', JSON.stringify(event))

  try {
    // 解析回调数据
    const notifyData = event

    // 验证签名
    if (!verifySign(notifyData, API_KEY)) {
      console.error('签名验证失败')
      return buildXMLResponse('FAIL', '签名验证失败')
    }

    // 检查支付结果
    if (notifyData.return_code !== 'SUCCESS' || notifyData.result_code !== 'SUCCESS') {
      console.error('支付失败:', notifyData)
      return buildXMLResponse('FAIL', '支付失败')
    }

    const outTradeNo = notifyData.out_trade_no
    const transactionId = notifyData.transaction_id
    const totalFee = parseInt(notifyData.total_fee)

    // 查询订单
    const orderRes = await db.collection('orders').where({
      orderNo: outTradeNo
    }).get()

    if (orderRes.data.length === 0) {
      console.error('订单不存在:', outTradeNo)
      return buildXMLResponse('FAIL', '订单不存在')
    }

    const order = orderRes.data[0]

    // 金额校验
    if (order.totalAmount !== totalFee) {
      console.error('金额不匹配:', order.totalAmount, totalFee)
      return buildXMLResponse('FAIL', '金额不匹配')
    }

    // 防止重复处理
    if (order.status !== 0) {
      console.log('订单已处理，跳过:', outTradeNo)
      return buildXMLResponse('SUCCESS', 'OK')
    }

    // 更新订单状态为已支付
    await db.collection('orders').doc(order._id).update({
      data: {
        status: 1, // 已支付
        payTime: db.serverDate(),
        updateTime: db.serverDate(),
        transactionId: transactionId,
        statusHistory: db.command.push({
          status: 1,
          text: '支付成功',
          time: new Date()
        })
      }
    })

    console.log('订单支付成功:', outTradeNo, transactionId)
    return buildXMLResponse('SUCCESS', 'OK')
  } catch (err) {
    console.error('支付回调处理异常:', err)
    return buildXMLResponse('FAIL', err.message)
  }
}
