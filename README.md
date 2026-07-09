# 数乘科技 · 微信小程序商城系统

> 中小微企业数据资产服务商城 — 基于微信云开发的原生小程序

## 项目简介

本项目为数乘科技打造的微信小程序商城系统，销售数据资产相关服务类产品（虚拟商品）。系统采用微信云开发（云函数 + 云数据库 + 云存储）作为后端，微信小程序原生框架（WXML/WXSS/JS）作为前端，集成微信支付（普通商户模式）完成在线交易闭环。

### 核心功能

| 模块 | 功能 |
|------|------|
| 商品展示 | 首页商品列表、分类筛选、商品详情页（主图/价格/描述/服务说明） |
| 下单流程 | 购物车管理（增删改查/合计计算）、订单确认与提交（含联系人信息） |
| 微信支付 | 云函数调用微信支付 API、统一下单、支付结果回调通知 |
| 订单管理 | 订单列表（按状态筛选）、订单详情、支付/取消操作 |
| 个人中心 | 用户信息、订单统计、客服联系 |

### 技术栈

- **前端**: 微信小程序原生开发（WXML / WXSS / JS）
- **后端**: 微信云开发（云函数 + 云数据库 + 云存储）
- **支付**: 微信支付 API（普通商户模式，商户号: 1114910204）
- **商品类型**: 虚拟商品（服务类），采用虚拟支付

---

## 项目结构

```
miniprogram-shop/
├── miniprogram/                    # 小程序前端代码
│   ├── app.js                      # 应用入口（购物车管理、云开发初始化）
│   ├── app.json                    # 全局配置（页面路由、tabBar）
│   ├── app.wxss                    # 全局样式
│   ├── sitemap.json                # 搜索配置
│   ├── images/                     # 本地图片资源
│   │   ├── banner.png              # 首页 Banner
│   │   ├── SC02.png ~ SC08.png     # 商品主图
│   │   ├── placeholder.png         # 占位图
│   │   └── tab/                    # tabBar 图标
│   ├── utils/
│   │   └── util.js                 # 工具函数（价格格式化、日期、订单号等）
│   ├── components/
│   │   └── product-card/           # 商品卡片组件
│   └── pages/
│       ├── index/                  # 首页（商品列表 + 分类筛选）
│       ├── detail/                 # 商品详情页
│       ├── cart/                   # 购物车页
│       ├── order/                  # 订单页（下单确认 + 订单列表）
│       ├── orderDetail/            # 订单详情页
│       └── profile/                # 个人中心页
│
├── cloudfunctions/                 # 云函数
│   ├── login/                      # 获取用户 openid
│   ├── getProducts/                # 获取商品列表（支持分类筛选）
│   ├── getProductDetail/           # 获取商品详情
│   ├── createOrder/                # 创建订单（价格校验、订单号生成）
│   ├── pay/                        # 微信支付统一下单
│   ├── payNotify/                  # 支付结果回调通知
│   └── initDatabase/               # 数据库初始化（集合 + 商品种子数据）
│       └── data/
│           └── products.js         # 商品种子数据（从 Excel 提取）
│
├── project.config.json             # 项目配置
└── README.md                       # 本文件
```

---

## 云数据库设计

### 集合一：products（商品）

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 商品编号（SC01 ~ SC10） |
| name | string | 商品全称 |
| shortTitle | string | 短标题 |
| subtitle | string | 副标题 |
| category | string | 分类（引流产品/低价测评/深度测评/登记服务/合规服务/订阅服务/入表服务/融资服务） |
| price | number | 价格（单位：分，0=免费） |
| originalPrice | number | 划线价（单位：分） |
| image | string | 云存储图片地址 |
| localImage | string | 本地图片路径 |
| tags | array | 标签数组 |
| description | string | 商品详情描述 |
| serviceIncludes | string | 服务包含内容 |
| deliveryTime | string | 交付周期 |
| deliveryMethod | string | 交付方式 |
| buttonText | string | 下单按钮文案 |
| suitableFor | string | 适合客户 |
| needPrepare | string | 客户需准备资料 |
| faq | string | 常见问题 |
| complianceNote | string | 合规提示 |
| refundPolicy | string | 退款政策 |
| supportInvoice | boolean | 是否支持开票 |
| variants | array | 规格列表（含 name/price/originalPrice/desc） |
| sortOrder | number | 排序权重 |
| onShelf | boolean | 是否上架 |
| isFree | boolean | 是否免费 |
| createTime | date | 创建时间 |
| updateTime | date | 更新时间 |

### 集合二：orders（订单）

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 订单ID（自动生成） |
| orderNo | string | 订单号（SC + 时间戳 + 随机数） |
| openid | string | 用户 openid |
| items | array | 商品列表（productId/name/shortTitle/image/unitPrice/quantity/variantName/itemTotal） |
| totalAmount | number | 总金额（单位：分） |
| contactInfo | object | 联系人信息（name/phone/company/email） |
| remark | string | 订单备注 |
| status | number | 订单状态（0=待支付 1=已支付 2=服务中 3=已完成 4=已取消 5=已退款） |
| statusHistory | array | 状态变更历史 |
| transactionId | string | 微信支付交易单号 |
| isVirtual | boolean | 是否虚拟商品 |
| createTime | date | 创建时间 |
| updateTime | date | 更新时间 |
| payTime | date | 支付时间 |

### 集合三：users（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 用户ID（自动生成） |
| openid | string | 用户 openid |
| nickName | string | 昵称 |
| avatarUrl | string | 头像 |
| phone | string | 手机号 |
| createTime | date | 创建时间 |
| updateTime | date | 更新时间 |

---

## 部署指南

### 第一步：导入项目

1. 打开微信开发者工具
2. 选择「导入项目」
3. 项目目录选择 `miniprogram-shop/` 文件夹
4. AppID 填写：`wxb4537bc29860a8f7`（数乘科技小程序 AppID）
5. 后端服务选择「微信云开发」

### 第二步：开通云开发

1. 在开发者工具中点击「云开发」按钮
2. 创建云开发环境，命名为 `shucheng-mall`（或自定义）
3. 记住环境 ID，替换 `app.js` 中的 `cloudEnv` 值
4. 替换 `project.config.json` 中的相关配置

### 第三步：部署云函数

在开发者工具中，右键每个云函数文件夹，选择「上传并部署：云端安装依赖」：

部署顺序：
1. `login` — 用户登录
2. `initDatabase` — 初始化数据库和商品数据
3. `getProducts` — 获取商品列表
4. `getProductDetail` — 获取商品详情
5. `createOrder` — 创建订单
6. `pay` — 微信支付统一下单
7. `payNotify` — 支付回调通知

### 第四步：初始化数据库

1. 部署 `initDatabase` 云函数后
2. 在云开发控制台的「云函数」页面，找到 `initDatabase`
3. 点击「测试」，传入参数 `{}`
4. 返回成功后，检查「数据库」中是否创建了 `products`、`orders`、`users` 三个集合
5. 确认 `products` 集合中有 8 条商品数据（SC01 ~ SC08，SC09/SC10 为二批上架暂未上架）

### 第五步：上传商品图片到云存储

1. 在云开发控制台的「存储」页面
2. 创建 `products` 文件夹
3. 上传以下图片（来自 `19.商品主图_成品/` 目录）：
   - `SC02.png` — 体检18元主图
   - `SC03.png` — 深测499主图
   - `SC04.png` — 登记1980起主图
   - `SC05.png` — 合规2980起主图
   - `SC06.png` — 名片1980年主图
   - `SC07.png` — 入表预约999主图
   - `SC08.png` — 融资评估0元主图
4. 更新 `products` 集合中各商品的 `image` 字段为云存储路径（如 `cloud://your-env-id.xxxx/products/SC02.png`）

### 第六步：配置微信支付

#### 6.1 商户平台配置

1. 登录 [微信商户平台](https://pay.weixin.qq.com/)（商户号: 1114910204）
2. 在「产品中心 > 开发配置」中设置支付回调地址：
   ```
   https://你的云开发环境ID.service.tcloudbaseapp.com/payNotify
   ```
3. 在「账户中心 > API安全」中：
   - 设置 API v2 密钥（32位字符）
   - 记录密钥值

#### 6.2 修改云函数配置

1. 打开 `cloudfunctions/pay/index.js`
2. 修改 `CONFIG` 对象：
   ```javascript
   const CONFIG = {
     appid: 'wxb4537bc29860a8f7',        // 小程序AppID
     mch_id: '1114910204',                // 商户号
     api_key: '你的32位API密钥',           // ← 替换为实际密钥
     notify_url: 'https://你的回调地址/payNotify',
     trade_type: 'JSAPI'
   }
   ```

3. 打开 `cloudfunctions/payNotify/index.js`
4. 修改 `API_KEY` 为相同的 API 密钥

5. 重新部署 `pay` 和 `payNotify` 云函数

#### 6.3 配置支付回调路由

在云开发控制台：
1. 进入「云函数 > payNotify」
2. 在「触发器」中添加 HTTP 触发器
3. 路径设为 `/payNotify`
4. 方法为 `POST`

### 第七步：测试运行

1. 在开发者工具中编译运行
2. 首页应显示 8 个上架商品
3. 测试流程：浏览商品 → 加入购物车 → 结算下单 → 微信支付
4. 免费商品（SC01速测、SC08融资评估）无需支付，直接创建订单

---

## 商品数据来源

| 编号 | 商品名称 | 价格 | 数据来源文件 |
|------|---------|------|-------------|
| SC01 | 企业数据资产免费速测 | 0元 | 17.报价清单 / 18.上架信息表 |
| SC02 | 企业数据资产健康体检 | ¥18 | 17.报价清单 / 18.上架信息表 |
| SC03 | 数据资产入表潜力深度测算 | ¥499 | 17.报价清单 / 18.上架信息表 |
| SC04 | 数据产权登记代办包 | ¥1,980起 | 17.报价清单 / 18.上架信息表 |
| SC05 | 企业数据合规基础包 | ¥2,980起 | 17.报价清单 / 18.上架信息表 |
| SC06 | 企业数字名片·经营画像 | ¥1,980/年 | 17.报价清单 / 18.上架信息表 |
| SC07 | 数据资产入表轻实施·预约评估 | ¥999 | 17.报价清单 / 18.上架信息表 |
| SC08 | 数据资产融资资格评估 | 0元 | 17.报价清单 / 18.上架信息表 |
| SC09 | AI数字员工月卡 | ¥299起/月 | 17.报价清单（二批上架，暂未上架） |
| SC10 | 数据要素年度会员 | ¥9,800/年起 | 17.报价清单（邀请制，暂未上架） |

商品主图来源：`19.商品主图_成品/` 目录

---

## 页面导航逻辑

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  首页   │───→│商品详情页│───→│ 订单页   │───→│订单详情页│
│(TabBar) │    │          │    │(下单模式)│    │          │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │               ↑
     │              ↓               │
     │         ┌─────────┐          │
     │         │ 购物车页 │──────────┘
     │         │(TabBar) │
     │         └─────────┘
     │
     ↓
┌─────────┐    ┌─────────┐
│ 订单页   │───→│订单详情页│
│(TabBar)  │    │          │
│(列表模式)│    └─────────┘
└─────────┘

┌─────────┐
│个人中心页│
│(TabBar) │
└─────────┘
```

---

## 注意事项

1. **云开发环境 ID**: 部署前必须将 `app.js` 中的 `cloudEnv` 替换为实际的云开发环境 ID
2. **API 密钥安全**: `pay` 和 `payNotify` 云函数中的 `api_key` 是敏感信息，切勿提交到公开仓库
3. **商品图片**: 初始版本使用本地图片，正式上线建议上传到云存储以获得更好的加载速度
4. **支付回调**: 确保支付回调地址可被微信支付服务器访问，否则支付状态无法自动更新
5. **本地开发**: 云函数未部署时，首页和详情页会自动使用本地种子数据作为兜底，方便开发调试
6. **虚拟商品**: 所有商品均为服务类（虚拟商品），不涉及物流发货，下单流程中无需填写收货地址
