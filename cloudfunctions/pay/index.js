// pay 云函数 - 微信支付统一下单
// 商户号: 1114910204
// 支付方式: 普通商户模式 + 虚拟支付（服务类产品）
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ============ 配置项（部署时替换为实际值） ============
const CONFIG = {
  // 小程序AppID
  appid: 'wxb4537bc29860a8f7',
  // 商户号
  mch_id: '1114910204',
  // 商户API密钥（v2密钥，32位，部署时替换）
  api_key: '13318876505Zonken188198045899999',
  // 支付回调云函数路径
  notify_url: 'https://cloudbase-d7gc2b32cd4196059-1451883116.ap-shanghai.app.tcloudbase.com/payNotify',
  // 交易类型
  trade_type: 'JSAPI'
}

// ============ 工具函数 ============

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let str = ''
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return str
}

/**
 * 生成签名（MD5）
 * @param {object} params - 参数对象
 * @param {string} key - API密钥
 * @returns {string} 签名
 */
function generateSign(params, key) {
  // 1. 按key字典序排序
  const sortedKeys = Object.keys(params).sort()
  // 2. 拼接成字符串（跳过空值和sign字段）
  let str = ''
  for (const k of sortedKeys) {
    if (params[k] !== '' && params[k] !== undefined && params[k] !== null && k !== 'sign') {
      str += `${k}=${params[k]}&`
    }
  }
  // 3. 拼接API密钥
  str += `key=${key}`
  // 4. MD5加密并转大写
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase()
}

/**
 * 生成XML
 */
function buildXML(params) {
  let xml = '<xml>'
  for (const key in params) {
    xml += `<${key}><![CDATA[${params[key]}]]></${key}>`
  }
  xml += '</xml>'
  return xml
}

/**
 * 解析XML响应
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
 * 调用微信支付统一下单API
 */
async function unifiedOrder(params) {
  const https = require('https')

  return new Promise((resolve, reject) => {
    const xml = buildXML(params)
    const postData = xml

    const options = {
      hostname: 'api.mch.weixin.qq.com',
      path: '/pay/unifiedorder',
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const result = parseXML(data)
          resolve(result)
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', (e) => reject(e))
    req.write(postData)
    req.end()
  })
}

// ============ 主函数 ============

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { orderId } = event

  if (!orderId) {
    return { code: -1, message: '缺少订单ID' }
  }

  try {
    // 查询订单
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    if (!order) {
      return { code: -1, message: '订单不存在' }
    }

    if (order.openid !== openid) {
      return { code: -1, message: '无权操作此订单' }
    }

    if (order.status !== 0) {
      return { code: -1, message: '订单状态异常，无法支付' }
    }

    // 免费商品：直接标记为已支付
    if (order.totalAmount === 0) {
      await db.collection('orders').doc(orderId).update({
        data: {
          status: 1,
          payTime: db.serverDate(),
          updateTime: db.serverDate(),
          'statusHistory': db.command.push({
            status: 1,
            text: '免费商品自动确认',
            time: new Date()
          })
        }
      })
      return {
        code: 0,
        message: '免费商品，无需支付',
        data: {
          isFree: true,
          orderId,
          orderNo: order.orderNo
        }
      }
    }

    // 付费商品：调用微信支付统一下单
    const nonceStr = generateNonceStr()
    const outTradeNo = order.orderNo
    const totalFee = order.totalAmount // 单位：分
    const body = order.items.length === 1
      ? order.items[0].shortTitle || order.items[0].name
      : '数乘科技服务订单'

    // 统一下单参数
    const unifiedParams = {
      appid: CONFIG.appid,
      mch_id: CONFIG.mch_id,
      nonce_str: nonceStr,
      body: body,
      out_trade_no: outTradeNo,
      total_fee: totalFee,
      spbill_create_ip: '127.0.0.1',
      notify_url: CONFIG.notify_url,
      trade_type: CONFIG.trade_type,
      openid: openid
    }

    // 生成签名
    unifiedParams.sign = generateSign(unifiedParams, CONFIG.api_key)

    // 调用统一下单API
    const unifiedResult = await unifiedOrder(unifiedParams)

    if (unifiedResult.return_code !== 'SUCCESS') {
      console.error('统一下单失败:', unifiedResult)
      return {
        code: -1,
        message: '统一下单失败: ' + (unifiedResult.return_msg || '未知错误')
      }
    }

    if (unifiedResult.result_code !== 'SUCCESS') {
      console.error('统一下单业务错误:', unifiedResult)
      return {
        code: -1,
        message: '支付下单失败: ' + (unifiedResult.err_code_des || unifiedResult.err_code || '未知错误')
      }
    }

    // 生成前端支付参数
    const prepayId = unifiedResult.prepay_id
    const paySignParams = {
      appId: CONFIG.appid,
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: generateNonceStr(),
      package: 'prepay_id=' + prepayId,
      signType: 'MD5'
    }
    paySignParams.paySign = generateSign(paySignParams, CONFIG.api_key)

    return {
      code: 0,
      message: '统一下单成功',
      data: {
        isFree: false,
        orderId,
        orderNo: order.orderNo,
        paymentParams: {
          timeStamp: paySignParams.timeStamp,
          nonceStr: paySignParams.nonceStr,
          package: paySignParams.package,
          signType: paySignParams.signType,
          paySign: paySignParams.paySign
        }
      }
    }
  } catch (err) {
    console.error('支付云函数异常:', err)
    return {
      code: -1,
      message: '支付服务异常: ' + err.message
    }
  }
}
