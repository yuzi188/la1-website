# LA1 Telegram Bot - AI 智能客服系統

## 功能特色

### 🤖 AI 智能回覆
- 使用 GPT-4.1-mini 模型
- 24 小時自動回覆
- 支持 7 種語言自動偵測：繁體中文、簡體中文、英文、泰文、越南文、韓文、日文
- 根據用戶語言自動切換回覆語言

### 💬 帳戶查詢（接後端 API）
- 餘額查詢
- VIP 等級查詢
- 流水進度查詢
- 邀請佣金查詢

### 🎁 活動介紹
- 首充優惠（充100送38 / 充30送10）
- 每日簽到（連續7天最多9 USDT）
- 邀請返傭（直推15% + 二級3%）
- VIP 每週返水（0.5% ~ 1.8%）

### 🔄 問題分流
- 簡單問題：AI 直接處理
- 複雜問題：自動轉接人工客服 @yu_888yu
- 投訴類：標記高優先級並通知管理員

### 📋 選單功能
- 快捷鍵盤選單（支持 7 種語言）
- Inline 按鈕快速跳轉

## 部署說明

### 環境變數設定
```
TG_BOT_TOKEN=你的 Telegram Bot Token
OPENAI_API_KEY=你的 OpenAI API Key
BACKEND_URL=https://la1-backend-production.up.railway.app
ADMIN_TG_IDS=管理員 TG ID（用逗號分隔）
```

### Railway 部署
1. 在 Railway 建立新服務
2. 連接此目錄（`tg_bot/`）
3. 設定環境變數
4. 部署即可

### 本地測試
```bash
pip install -r requirements.txt
export TG_BOT_TOKEN=your_token
export OPENAI_API_KEY=your_key
python bot.py
```

## 文件結構
```
tg_bot/
├── bot.py              # 主程序
├── ai_service.py       # AI 客服核心模組
├── api_client.py       # 後端 API 客戶端
├── knowledge_base.py   # 知識庫（活動規則、系統 prompt）
├── requirements.txt    # Python 依賴
├── Dockerfile          # Docker 配置
├── railway.json        # Railway 部署配置
└── .env.example        # 環境變數範例
```

## 支持的指令
- `/start` - 開始使用，顯示歡迎訊息
- `/help` - 查看使用說明
- `/clear` - 清除對話記錄

## 語言支持
| 語言 | 代碼 |
|------|------|
| 繁體中文 | zh-TW |
| 簡體中文 | zh-CN |
| 英文 | en |
| 泰文 | th |
| 越南文 | vi |
| 韓文 | ko |
| 日文 | ja |
