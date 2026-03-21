"""
LA1 Telegram Bot - AI 智能客服系統
主程序入口
"""

import os
import logging
import asyncio
import json
from datetime import datetime

import requests
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    KeyboardButton,
)
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)
from telegram.constants import ParseMode

# 導入本地模組
from knowledge_base import WELCOME_MESSAGE, PLATFORM_INFO
from ai_service import (
    get_ai_response,
    get_escalation_message,
    get_new_user_intro,
    detect_account_query,
    detect_language,
    detect_escalation,
    clear_history,
)
from api_client import (
    format_user_balance_reply,
    format_vip_reply,
    format_referral_reply,
    format_turnover_reply,
)

# 設定日誌
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# 環境變數
TG_BOT_TOKEN = os.environ.get("TG_BOT_TOKEN", "")
ADMIN_TG_IDS_STR = os.environ.get("ADMIN_TG_IDS", "")
ADMIN_TG_IDS = [int(x.strip()) for x in ADMIN_TG_IDS_STR.split(",") if x.strip().isdigit()]

# 已見過的用戶（用於新用戶歡迎）
seen_users: set[int] = set()

# 用戶語言偏好儲存
user_languages: dict[int, str] = {}


def get_user_lang(tg_id: int, text: str = "") -> str:
    """
    獲取用戶語言（優先使用已儲存的偏好，否則自動偵測）
    """
    if tg_id in user_languages:
        return user_languages[tg_id]
    if text:
        lang = detect_language(text)
        user_languages[tg_id] = lang
        return lang
    return "zh-TW"


def get_main_keyboard(lang: str = "zh-TW") -> ReplyKeyboardMarkup:
    """
    獲取主選單鍵盤
    """
    keyboards = {
        "zh-TW": [
            ["💰 我的餘額", "👑 VIP 等級"],
            ["📊 流水進度", "🤝 邀請佣金"],
            ["🎁 活動優惠", "💳 如何充值"],
            ["💸 如何提款", "🆘 人工客服"],
        ],
        "zh-CN": [
            ["💰 我的余额", "👑 VIP 等级"],
            ["📊 流水进度", "🤝 邀请佣金"],
            ["🎁 活动优惠", "💳 如何充值"],
            ["💸 如何提款", "🆘 人工客服"],
        ],
        "en": [
            ["💰 My Balance", "👑 VIP Level"],
            ["📊 Turnover Progress", "🤝 Referral Commission"],
            ["🎁 Promotions", "💳 How to Deposit"],
            ["💸 How to Withdraw", "🆘 Human Support"],
        ],
        "th": [
            ["💰 ยอดเงินของฉัน", "👑 ระดับ VIP"],
            ["📊 ความคืบหน้า", "🤝 คอมมิชชั่น"],
            ["🎁 โปรโมชั่น", "💳 วิธีฝากเงิน"],
            ["💸 วิธีถอนเงิน", "🆘 ฝ่ายสนับสนุน"],
        ],
        "vi": [
            ["💰 Số dư của tôi", "👑 Cấp VIP"],
            ["📊 Tiến độ doanh thu", "🤝 Hoa hồng"],
            ["🎁 Khuyến mãi", "💳 Cách nạp tiền"],
            ["💸 Cách rút tiền", "🆘 Hỗ trợ"],
        ],
        "ko": [
            ["💰 내 잔액", "👑 VIP 등급"],
            ["📊 롤오버 진행률", "🤝 추천 커미션"],
            ["🎁 프로모션", "💳 입금 방법"],
            ["💸 출금 방법", "🆘 인간 지원"],
        ],
        "ja": [
            ["💰 残高確認", "👑 VIPレベル"],
            ["📊 ロールオーバー", "🤝 紹介コミッション"],
            ["🎁 プロモーション", "💳 入金方法"],
            ["💸 出金方法", "🆘 サポート"],
        ],
    }
    kb = keyboards.get(lang, keyboards["zh-TW"])
    return ReplyKeyboardMarkup(kb, resize_keyboard=True, one_time_keyboard=False)


def get_quick_action_keyboard(lang: str = "zh-TW") -> InlineKeyboardMarkup:
    """
    快速操作 inline 鍵盤
    """
    buttons = {
        "zh-TW": [
            [
                InlineKeyboardButton("🎮 打開 Mini App", url="https://t.me/LA1111_bot/app"),
                InlineKeyboardButton("💬 人工客服", url="https://t.me/yu_888yu"),
            ],
            [
                InlineKeyboardButton("🇹🇼 台站入口", url="http://La1111.meta1788.com"),
                InlineKeyboardButton("💎 USDT 專區", url="http://la1111.ofa168hk.com"),
            ],
        ],
        "en": [
            [
                InlineKeyboardButton("🎮 Open Mini App", url="https://t.me/LA1111_bot/app"),
                InlineKeyboardButton("💬 Human Support", url="https://t.me/yu_888yu"),
            ],
            [
                InlineKeyboardButton("🏠 Main Site", url="http://La1111.meta1788.com"),
                InlineKeyboardButton("💎 USDT Zone", url="http://la1111.ofa168hk.com"),
            ],
        ],
    }
    # 其他語言使用英文按鈕
    btn = buttons.get(lang, buttons["en"])
    return InlineKeyboardMarkup(btn)


async def notify_admin(context: ContextTypes.DEFAULT_TYPE, user_info: dict, message: str, priority: str = "normal"):
    """
    通知管理員有用戶需要人工客服
    """
    if not ADMIN_TG_IDS:
        return
    
    priority_emoji = "🚨" if priority == "high" else "🔔"
    tg_id = user_info.get("id", "unknown")
    username = user_info.get("username", "")
    first_name = user_info.get("first_name", "")
    
    admin_msg = (
        f"{priority_emoji} **需要人工客服**\n\n"
        f"👤 用戶：{first_name} (@{username})\n"
        f"🆔 TG ID：`{tg_id}`\n"
        f"⏰ 時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"🔥 優先級：{'高' if priority == 'high' else '一般'}\n\n"
        f"📝 **用戶訊息：**\n{message[:200]}"
    )
    
    for admin_id in ADMIN_TG_IDS:
        try:
            await context.bot.send_message(
                chat_id=admin_id,
                text=admin_msg,
                parse_mode=ParseMode.MARKDOWN,
            )
        except Exception as e:
            logger.error(f"Failed to notify admin {admin_id}: {e}")


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /start 指令處理
    """
    user = update.effective_user
    tg_id = user.id
    
    # 偵測語言（從 language_code 或預設）
    lang_code = user.language_code or "zh-TW"
    if lang_code.startswith("zh"):
        lang = "zh-TW"
    elif lang_code.startswith("en"):
        lang = "en"
    elif lang_code.startswith("th"):
        lang = "th"
    elif lang_code.startswith("vi"):
        lang = "vi"
    elif lang_code.startswith("ko"):
        lang = "ko"
    elif lang_code.startswith("ja"):
        lang = "ja"
    else:
        lang = "zh-TW"
    
    user_languages[tg_id] = lang
    seen_users.add(tg_id)
    
    # 發送歡迎訊息
    intro_text = get_new_user_intro(lang)
    keyboard = get_main_keyboard(lang)
    inline_kb = get_quick_action_keyboard(lang)
    
    await update.message.reply_text(
        intro_text,
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=keyboard,
    )
    await update.message.reply_text(
        "👇" if lang == "zh-TW" else "👇",
        reply_markup=inline_kb,
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /help 指令處理
    """
    user = update.effective_user
    lang = get_user_lang(user.id)
    
    help_texts = {
        "zh-TW": """📖 **LA1 Bot 使用說明**

**帳戶查詢：**
• 直接說「我的餘額」、「VIP 等級」
• 說「流水進度」查看完成情況
• 說「邀請佣金」查看收益

**活動查詢：**
• 說「有什麼活動」獲取推薦
• 說「首充優惠」了解新人福利

**充值/提款：**
• 說「怎麼充值」獲取步驟說明
• 說「怎麼提款」了解提款流程

**人工客服：**
• 說「轉人工」或「客服」
• 直接聯繫 @yu_888yu

/start - 重新開始
/help - 查看說明
/clear - 清除對話記錄""",
        "en": """📖 **LA1 Bot User Guide**

**Account Queries:**
• Say "my balance", "VIP level"
• Say "turnover progress" to check status
• Say "referral commission" to check earnings

**Promotions:**
• Say "what promotions" for recommendations
• Say "first deposit bonus" for new member benefits

**Deposit/Withdrawal:**
• Say "how to deposit" for step-by-step guide
• Say "how to withdraw" for withdrawal process

**Human Support:**
• Say "human support" or "agent"
• Contact @yu_888yu directly

/start - Restart
/help - View guide
/clear - Clear conversation""",
    }
    
    await update.message.reply_text(
        help_texts.get(lang, help_texts["en"]),
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_clear(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /clear 指令 - 清除對話歷史
    """
    user = update.effective_user
    lang = get_user_lang(user.id)
    clear_history(user.id)
    
    msgs = {
        "zh-TW": "✅ 對話記錄已清除，可以重新開始了！",
        "zh-CN": "✅ 对话记录已清除，可以重新开始了！",
        "en": "✅ Conversation history cleared. You can start fresh!",
        "th": "✅ ประวัติการสนทนาถูกล้างแล้ว คุณสามารถเริ่มต้นใหม่ได้!",
        "vi": "✅ Lịch sử trò chuyện đã được xóa. Bạn có thể bắt đầu lại!",
        "ko": "✅ 대화 기록이 삭제되었습니다. 새로 시작할 수 있습니다!",
        "ja": "✅ 会話履歴がクリアされました。新しく始めることができます！",
    }
    await update.message.reply_text(msgs.get(lang, msgs["zh-TW"]))


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    處理所有文字訊息
    """
    if not update.message or not update.message.text:
        return
    
    user = update.effective_user
    tg_id = user.id
    text = update.message.text.strip()
    username = user.username or ""
    first_name = user.first_name or ""
    
    # 只處理私聊訊息
    if update.effective_chat.type != "private":
        return
    
    # 偵測語言並儲存
    lang = detect_language(text)
    # 如果偵測到非預設語言，更新儲存
    if lang != "zh-TW" or tg_id not in user_languages:
        user_languages[tg_id] = lang
    else:
        lang = user_languages.get(tg_id, "zh-TW")
    
    # 新用戶歡迎（第一次私訊）
    if tg_id not in seen_users:
        seen_users.add(tg_id)
        intro_text = get_new_user_intro(lang)
        keyboard = get_main_keyboard(lang)
        inline_kb = get_quick_action_keyboard(lang)
        await update.message.reply_text(
            intro_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=keyboard,
        )
        await update.message.reply_text("👇", reply_markup=inline_kb)
        return
    
    # 顯示「正在輸入」狀態
    await context.bot.send_chat_action(
        chat_id=update.effective_chat.id,
        action="typing",
    )
    
    # 處理選單按鈕快捷指令
    menu_response = await handle_menu_shortcuts(update, context, text, tg_id, username, lang)
    if menu_response:
        return
    
    # 偵測帳戶查詢
    query_type = detect_account_query(text)
    if query_type:
        await handle_account_query(update, context, query_type, tg_id, username, lang)
        return
    
    # 偵測是否需要轉接人工客服
    if detect_escalation(text):
        is_complaint = any(kw in text.lower() for kw in ["投訴", "舉報", "詐騙", "騙人", "complaint", "scam", "fraud"])
        priority = "high" if is_complaint else "normal"
        
        escalation_msg = get_escalation_message(lang, is_complaint)
        await update.message.reply_text(
            escalation_msg,
            parse_mode=ParseMode.MARKDOWN,
        )
        
        # 通知管理員
        await notify_admin(
            context,
            {"id": tg_id, "username": username, "first_name": first_name},
            text,
            priority,
        )
        return
    
    # AI 回覆
    reply, needs_escalation = get_ai_response(tg_id, text, username, first_name)
    
    if needs_escalation:
        is_complaint = any(kw in text.lower() for kw in ["投訴", "舉報", "詐騙", "騙人", "complaint", "scam", "fraud"])
        priority = "high" if is_complaint else "normal"
        
        escalation_msg = get_escalation_message(lang, is_complaint)
        await update.message.reply_text(
            escalation_msg,
            parse_mode=ParseMode.MARKDOWN,
        )
        await notify_admin(
            context,
            {"id": tg_id, "username": username, "first_name": first_name},
            text,
            priority,
        )
    elif reply:
        # 發送 AI 回覆
        try:
            await update.message.reply_text(
                reply,
                parse_mode=ParseMode.MARKDOWN,
            )
        except Exception:
            # 如果 Markdown 解析失敗，發送純文字
            await update.message.reply_text(reply)


async def handle_menu_shortcuts(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    text: str,
    tg_id: int,
    username: str,
    lang: str,
) -> bool:
    """
    處理選單按鈕快捷指令
    返回 True 表示已處理
    """
    text_lower = text.lower()
    
    # 餘額查詢
    if any(kw in text for kw in ["我的餘額", "我的余额", "My Balance", "ยอดเงินของฉัน", "Số dư của tôi", "내 잔액", "残高確認"]):
        reply = format_user_balance_reply(tg_id, username, lang)
        await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)
        return True
    
    # VIP 查詢
    if any(kw in text for kw in ["VIP 等級", "VIP 等级", "VIP Level", "ระดับ VIP", "Cấp VIP", "VIP 등급", "VIPレベル"]):
        reply = format_vip_reply(tg_id, username, lang)
        await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)
        return True
    
    # 流水查詢
    if any(kw in text for kw in ["流水進度", "流水进度", "Turnover Progress", "ความคืบหน้า", "Tiến độ doanh thu", "롤오버 진행률", "ロールオーバー"]):
        reply = format_turnover_reply(tg_id, username, lang)
        await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)
        return True
    
    # 邀請佣金
    if any(kw in text for kw in ["邀請佣金", "邀请佣金", "Referral Commission", "คอมมิชชั่น", "Hoa hồng", "추천 커미션", "紹介コミッション"]):
        reply = format_referral_reply(tg_id, username, lang)
        await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)
        return True
    
    # 活動優惠
    if any(kw in text for kw in ["活動優惠", "活动优惠", "Promotions", "โปรโมชั่น", "Khuyến mãi", "프로모션", "プロモーション"]):
        promo_texts = {
            "zh-TW": """🎁 **當前活動一覽**

**1. 首充優惠（新會員）**
• 充 100 USDT → 送 **38 USDT**（10倍流水）
• 充 30 USDT → 送 **10 USDT**（8倍流水）

**2. 每日簽到**
• 連續 7 天最多 **9 USDT**
• Day 7 獎勵 3 USDT 🎁

**3. 邀請返傭**
• 直推 **15%** + 二級 **3%**
• 永久佣金，無上限

**4. VIP 每週返水**
• VIP1: 0.5% | VIP2: 0.8%
• VIP3: 1.2% | VIP4: 1.5% | VIP5: 1.8%

👉 [前往 Mini App 領取](https://t.me/LA1111_bot/app)""",
            "en": """🎁 **Current Promotions**

**1. First Deposit Bonus (New Members)**
• Deposit 100 USDT → Get **38 USDT** (10x turnover)
• Deposit 30 USDT → Get **10 USDT** (8x turnover)

**2. Daily Check-in**
• Up to **9 USDT** for 7 consecutive days
• Day 7 reward: 3 USDT 🎁

**3. Referral Commission**
• Direct: **15%** + Level 2: **3%**
• Permanent, unlimited

**4. VIP Weekly Rebate**
• VIP1: 0.5% | VIP2: 0.8%
• VIP3: 1.2% | VIP4: 1.5% | VIP5: 1.8%

👉 [Visit Mini App to Claim](https://t.me/LA1111_bot/app)""",
        }
        reply = promo_texts.get(lang, promo_texts["en"])
        await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)
        return True
    
    # 如何充值
    if any(kw in text for kw in ["如何充值", "怎麼充值", "怎么充值", "How to Deposit", "วิธีฝากเงิน", "Cách nạp tiền", "입금 방법", "入金方法"]):
        deposit_texts = {
            "zh-TW": """💳 **充值步驟**

1. 打開 [Mini App](https://t.me/LA1111_bot/app)
2. 進入「儲值」頁面
3. 選擇金額（最低 **30 USDT**）
4. 複製平台 USDT 錢包地址
5. 從您的錢包轉帳（TRC20 或 ERC20）
6. 填入轉帳 Hash（交易哈希）
7. 等待 **5-15 分鐘**確認

⚠️ **注意事項：**
• 請確認網路類型（TRC20 / ERC20）
• 轉帳後請保留交易記錄
• 如 30 分鐘未到帳請聯繫客服

🎁 **首充優惠：充100送38 / 充30送10**""",
            "en": """💳 **Deposit Steps**

1. Open [Mini App](https://t.me/LA1111_bot/app)
2. Go to "Deposit" page
3. Select amount (min **30 USDT**)
4. Copy platform USDT wallet address
5. Transfer from your wallet (TRC20 or ERC20)
6. Enter transaction Hash
7. Wait **5-15 minutes** for confirmation

⚠️ **Important:**
• Confirm network type (TRC20 / ERC20)
• Keep transaction records
• Contact support if not received in 30 min

🎁 **First Deposit Bonus: Deposit 100 get 38 / Deposit 30 get 10**""",
        }
        reply = deposit_texts.get(lang, deposit_texts["en"])
        await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)
        return True
    
    # 如何提款
    if any(kw in text for kw in ["如何提款", "怎麼提款", "怎么提款", "How to Withdraw", "วิธีถอนเงิน", "Cách rút tiền", "출금 방법", "出金方法"]):
        withdraw_texts = {
            "zh-TW": """💸 **提款步驟**

1. 確保餘額 ≥ **50 USDT**（最低提款金額）
2. 確認流水要求已完成
3. 打開 [Mini App](https://t.me/LA1111_bot/app)
4. 進入「提款」頁面
5. 填入提款金額和 USDT 錢包地址
6. 提交申請

⏱️ **到帳時間：30 分鐘至 2 小時**

⚠️ **注意事項：**
• 首次提款最低 50 USDT
• 確認流水已完成再申請
• 如超過 2 小時請聯繫 @yu_888yu""",
            "en": """💸 **Withdrawal Steps**

1. Ensure balance ≥ **50 USDT** (minimum)
2. Confirm turnover requirements completed
3. Open [Mini App](https://t.me/LA1111_bot/app)
4. Go to "Withdrawal" page
5. Enter amount and USDT wallet address
6. Submit request

⏱️ **Processing time: 30 min to 2 hours**

⚠️ **Important:**
• Minimum withdrawal: 50 USDT
• Ensure turnover is complete before applying
• Contact @yu_888yu if not received in 2 hours""",
        }
        reply = withdraw_texts.get(lang, withdraw_texts["en"])
        await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)
        return True
    
    # 人工客服
    if any(kw in text for kw in ["人工客服", "轉人工", "转人工", "Human Support", "ฝ่ายสนับสนุน", "Hỗ trợ", "인간 지원", "サポート", "🆘 人工客服", "🆘 Human Support"]):
        cs_texts = {
            "zh-TW": "👨‍💼 **人工客服**\n\n請直接聯繫我們的客服：\n\n💬 **@yu_888yu**\n\n⏰ 服務時間：24 小時全天候\n📞 回覆時間：通常 5-15 分鐘",
            "en": "👨‍💼 **Human Support**\n\nPlease contact our support directly:\n\n💬 **@yu_888yu**\n\n⏰ Hours: 24/7\n📞 Response time: Usually 5-15 minutes",
            "th": "👨‍💼 **ฝ่ายสนับสนุน**\n\nกรุณาติดต่อฝ่ายสนับสนุนของเราโดยตรง:\n\n💬 **@yu_888yu**\n\n⏰ เวลาทำการ: 24/7\n📞 เวลาตอบสนอง: โดยปกติ 5-15 นาที",
            "vi": "👨‍💼 **Hỗ trợ con người**\n\nVui lòng liên hệ trực tiếp với bộ phận hỗ trợ của chúng tôi:\n\n💬 **@yu_888yu**\n\n⏰ Giờ làm việc: 24/7\n📞 Thời gian phản hồi: Thường 5-15 phút",
            "ko": "👨‍💼 **인간 지원**\n\n지원팀에 직접 연락하세요:\n\n💬 **@yu_888yu**\n\n⏰ 운영 시간: 24/7\n📞 응답 시간: 보통 5-15분",
            "ja": "👨‍💼 **サポートスタッフ**\n\nサポートに直接お問い合わせください:\n\n💬 **@yu_888yu**\n\n⏰ 営業時間: 24時間365日\n📞 応答時間: 通常5-15分",
        }
        reply = cs_texts.get(lang, cs_texts["en"])
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("💬 聯繫客服 @yu_888yu", url="https://t.me/yu_888yu")]
        ])
        await update.message.reply_text(
            reply,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=keyboard,
        )
        return True
    
    return False


async def handle_account_query(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    query_type: str,
    tg_id: int,
    username: str,
    lang: str,
):
    """
    處理帳戶查詢
    """
    # 顯示「正在查詢」訊息
    loading_msgs = {
        "zh-TW": "🔍 正在查詢您的帳戶資訊...",
        "zh-CN": "🔍 正在查询您的账户信息...",
        "en": "🔍 Fetching your account information...",
        "th": "🔍 กำลังดึงข้อมูลบัญชีของคุณ...",
        "vi": "🔍 Đang lấy thông tin tài khoản của bạn...",
        "ko": "🔍 계정 정보를 가져오는 중...",
        "ja": "🔍 アカウント情報を取得中...",
    }
    loading_msg = await update.message.reply_text(
        loading_msgs.get(lang, loading_msgs["zh-TW"])
    )
    
    if query_type == "balance":
        reply = format_user_balance_reply(tg_id, username, lang)
    elif query_type == "vip":
        reply = format_vip_reply(tg_id, username, lang)
    elif query_type == "referral":
        reply = format_referral_reply(tg_id, username, lang)
    elif query_type == "turnover":
        reply = format_turnover_reply(tg_id, username, lang)
    else:
        reply = "❓ 無法識別查詢類型"
    
    # 刪除載入訊息並發送結果
    try:
        await loading_msg.delete()
    except Exception:
        pass
    
    await update.message.reply_text(
        reply,
        parse_mode=ParseMode.MARKDOWN,
    )


async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    處理 inline 按鈕回調
    """
    query = update.callback_query
    await query.answer()
    
    # 可以在這裡處理特定的 callback 邏輯
    data = query.data
    if data == "cs":
        await query.message.reply_text(
            "💬 請聯繫人工客服：@yu_888yu",
            parse_mode=ParseMode.MARKDOWN,
        )


def main():
    """
    主程序入口
    """
    bot_token = TG_BOT_TOKEN
    if not bot_token:
        raise ValueError("TG_BOT_TOKEN environment variable is not set!")
    
    logger.info("Starting LA1 AI Customer Service Bot...")
    
    # 建立 Application
    app = Application.builder().token(bot_token).build()
    
    # 註冊指令處理器
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("clear", cmd_clear))
    
    # 註冊訊息處理器（只處理私聊文字訊息）
    app.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND & filters.ChatType.PRIVATE,
        handle_message,
    ))
    
    # 註冊 callback 處理器
    app.add_handler(CallbackQueryHandler(handle_callback_query))
    
    logger.info("Bot is running. Press Ctrl+C to stop.")
    
    # 啟動 Bot（polling 模式）
    app.run_polling(
        allowed_updates=Update.ALL_TYPES,
        drop_pending_updates=True,
    )


if __name__ == "__main__":
    main()
