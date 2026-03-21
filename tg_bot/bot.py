"""
LA1 Telegram Bot - AI 智能客服系統
主程序入口
"""

import os
import logging
import asyncio
import json
import re
from datetime import datetime

# 嘗試加載 .env 文件（本地開發用）
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # 生產環境不需要 dotenv

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
    create_deposit_request,
    get_user_info,
)

# 設定日誌
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# ── 環境變數 ──────────────────────────────────────────────────────────────────
TG_BOT_TOKEN = os.environ.get("TG_BOT_TOKEN", "")
USDT_ADDRESS = os.environ.get("USDT_ADDRESS", "TJExample1234567890TestAddress")
ADMIN_TG_IDS_STR = os.environ.get("ADMIN_TG_IDS", "")
ADMIN_TG_IDS = [int(x.strip()) for x in ADMIN_TG_IDS_STR.split(",") if x.strip().isdigit()]

# 客服工作群組 ID（負數，例如 -1003427212959）
SUPPORT_GROUP_ID_STR = os.environ.get("SUPPORT_GROUP_ID", "")
SUPPORT_GROUP_ID = int(SUPPORT_GROUP_ID_STR) if SUPPORT_GROUP_ID_STR.lstrip("-").isdigit() else None

# ── 狀態追蹤 ──────────────────────────────────────────────────────────────────
# 已見過的用戶（用於新用戶歡迎）
seen_users: set[int] = set()

# 用戶語言偏好儲存
user_languages: dict[int, str] = {}

# 轉人工狀態追蹤
# pending_support[tg_id] = {
#   "forwarded_msg_id": int,   # 轉發到群組的訊息 ID（用於 reply 對應）
#   "username": str,
#   "first_name": str,
#   "since": datetime,
# }
pending_support: dict[int, dict] = {}

# 反向索引：群組中的轉發訊息 ID → 玩家 tg_id
# forwarded_msg_map[group_msg_id] = player_tg_id
forwarded_msg_map: dict[int, int] = {}

# 轉人工觸發關鍵字
HUMAN_TRANSFER_KEYWORDS = [
    # 繁體中文
    "轉人工", "轉接人工", "轉真人", "轉接真人",
    "真人客服", "人工客服", "真人服務", "要客服", "找客服",
    "聯繫客服", "聯絡客服", "需要客服", "客服幫忙", "客服協助",
    # 簡體中文
    "转人工", "转接人工", "转真人", "转接真人",
    "人工服务", "真人服务", "联系客服", "联络客服", "需要客服",
    # 英文
    "human support", "live agent", "real agent", "speak to agent",
    "talk to human", "human agent", "customer service", "contact support",
    "need help", "speak to human",
    # 選單按鈕
    "🆘 人工客服", "🆘 Human Support",
]


def get_user_lang(tg_id: int, text: str = "") -> str:
    """獲取用戶語言（優先使用已儲存的偏好，否則自動偵測）"""
    if tg_id in user_languages:
        return user_languages[tg_id]
    if text:
        lang = detect_language(text)
        user_languages[tg_id] = lang
        return lang
    return "zh-TW"


def get_main_keyboard(lang: str = "zh-TW") -> ReplyKeyboardMarkup:
    """獲取主選單鍵盤"""
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
    """快速操作 inline 鍵盤"""
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
    btn = buttons.get(lang, buttons["en"])
    return InlineKeyboardMarkup(btn)


# ── 轉人工核心功能 ────────────────────────────────────────────────────────────

async def forward_to_support_group(
    context: ContextTypes.DEFAULT_TYPE,
    update: Update,
    tg_id: int,
    username: str,
    first_name: str,
    trigger_text: str = "",
    is_photo: bool = False,
):
    """
    將玩家訊息轉發到客服工作群，並附帶玩家資訊。
    返回群組中轉發訊息的 message_id（用於後續 reply 對應）。
    """
    if not SUPPORT_GROUP_ID:
        logger.warning("SUPPORT_GROUP_ID not set, cannot forward to support group")
        return None

    # 取得玩家帳戶資訊
    user_info = get_user_info(tg_id, username) or {}
    balance = user_info.get("balance", "N/A")
    vip = user_info.get("vip", user_info.get("vip_level", "N/A"))
    game_account = user_info.get("username", "未註冊")

    # 構建轉發訊息
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    tg_link = f"tg://user?id={tg_id}"
    username_display = f"@{username}" if username else "（無用戶名）"

    header = (
        f"🆘 <b>玩家請求人工客服</b>\n"
        f"━━━━━━━━━━━━━━━━━\n"
        f"👤 TG 名稱：<a href='{tg_link}'>{first_name}</a>\n"
        f"🔖 用戶名：{username_display}\n"
        f"🆔 TG ID：<code>{tg_id}</code>\n"
        f"🎮 遊戲帳號：<code>{game_account}</code>\n"
        f"💰 帳戶餘額：<b>{balance} USDT</b>\n"
        f"👑 VIP 等級：{vip}\n"
        f"⏰ 時間：{now}\n"
        f"━━━━━━━━━━━━━━━━━"
    )

    try:
        if is_photo and update.message and update.message.photo:
            # 轉發截圖 + 玩家資訊
            photo = update.message.photo[-1]  # 最高解析度
            caption_text = update.message.caption or ""
            full_caption = f"{header}\n\n📸 <b>玩家發送截圖</b>"
            if caption_text:
                full_caption += f"\n💬 附言：{caption_text}"

            sent = await context.bot.send_photo(
                chat_id=SUPPORT_GROUP_ID,
                photo=photo.file_id,
                caption=full_caption,
                parse_mode=ParseMode.HTML,
            )
        else:
            # 轉發文字訊息
            content = f"\n\n💬 <b>玩家訊息：</b>\n{trigger_text}" if trigger_text else ""
            full_msg = header + content

            sent = await context.bot.send_message(
                chat_id=SUPPORT_GROUP_ID,
                text=full_msg,
                parse_mode=ParseMode.HTML,
            )

        # 記錄映射關係
        forwarded_msg_map[sent.message_id] = tg_id
        pending_support[tg_id] = {
            "forwarded_msg_id": sent.message_id,
            "username": username,
            "first_name": first_name,
            "since": datetime.now(),
        }
        logger.info(f"Forwarded support request from {tg_id} to group, msg_id={sent.message_id}")
        return sent.message_id

    except Exception as e:
        logger.error(f"Failed to forward to support group: {e}")
        return None


async def handle_human_transfer(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    tg_id: int,
    username: str,
    first_name: str,
    lang: str,
    trigger_text: str = "",
    is_photo: bool = False,
):
    """
    執行轉人工流程：
    1. 回覆玩家「正在轉接」
    2. 轉發訊息到客服群
    """
    # 回覆玩家
    transfer_msgs = {
        "zh-TW": (
            "👨‍💼 *正在為您轉接人工客服，請稍候...*\n\n"
            "我們已將您的訊息轉發給客服人員，通常 *5-15 分鐘*內會有專人回覆您。\n\n"
            "如需緊急協助，也可直接聯繫：💬 @yu_888yu"
        ),
        "zh-CN": (
            "👨‍💼 *正在为您转接人工客服，请稍候...*\n\n"
            "我们已将您的消息转发给客服人员，通常 *5-15 分钟*内会有专人回复您。\n\n"
            "如需紧急协助，也可直接联系：💬 @yu_888yu"
        ),
        "en": (
            "👨‍💼 *Connecting you to a live agent, please wait...*\n\n"
            "Your message has been forwarded to our support team. "
            "A representative will reply within *5-15 minutes*.\n\n"
            "For urgent help, contact: 💬 @yu_888yu"
        ),
        "th": (
            "👨‍💼 *กำลังเชื่อมต่อคุณกับเจ้าหน้าที่ โปรดรอสักครู่...*\n\n"
            "ข้อความของคุณถูกส่งต่อไปยังทีมสนับสนุนแล้ว "
            "ตัวแทนจะตอบกลับภายใน *5-15 นาที*\n\n"
            "สำหรับความช่วยเหลือเร่งด่วน ติดต่อ: 💬 @yu_888yu"
        ),
        "vi": (
            "👨‍💼 *Đang kết nối bạn với nhân viên hỗ trợ, vui lòng chờ...*\n\n"
            "Tin nhắn của bạn đã được chuyển tiếp đến đội hỗ trợ. "
            "Nhân viên sẽ phản hồi trong vòng *5-15 phút*.\n\n"
            "Để được hỗ trợ khẩn cấp, liên hệ: 💬 @yu_888yu"
        ),
        "ko": (
            "👨‍💼 *상담원에게 연결 중입니다, 잠시만 기다려 주세요...*\n\n"
            "메시지가 지원팀에 전달되었습니다. "
            "담당자가 *5-15분* 내에 답변드릴 예정입니다.\n\n"
            "긴급 지원이 필요하시면: 💬 @yu_888yu"
        ),
        "ja": (
            "👨‍💼 *担当者に接続中です、しばらくお待ちください...*\n\n"
            "メッセージがサポートチームに転送されました。"
            "担当者が *5〜15分* 以内にご返答いたします。\n\n"
            "緊急のサポートが必要な場合: 💬 @yu_888yu"
        ),
    }

    reply_text = transfer_msgs.get(lang, transfer_msgs["zh-TW"])

    try:
        await update.message.reply_text(reply_text, parse_mode=ParseMode.MARKDOWN)
    except Exception:
        await update.message.reply_text(reply_text)

    # 轉發到客服群
    await forward_to_support_group(
        context, update, tg_id, username, first_name,
        trigger_text=trigger_text, is_photo=is_photo,
    )

    # 同時通知管理員（舊邏輯保留）
    await notify_admin(
        context,
        {"id": tg_id, "username": username, "first_name": first_name},
        trigger_text or "[截圖]",
        "normal",
    )


async def handle_group_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    處理客服工作群中的回覆訊息。
    當客服 reply 轉發的訊息時，Bot 自動把回覆轉發回給玩家。
    """
    if not update.message:
        return

    # 只處理來自客服群的訊息
    chat_id = update.effective_chat.id
    if SUPPORT_GROUP_ID and chat_id != SUPPORT_GROUP_ID:
        return

    # 必須是 reply 訊息
    reply_to = update.message.reply_to_message
    if not reply_to:
        return

    # 查找對應的玩家
    replied_msg_id = reply_to.message_id
    player_tg_id = forwarded_msg_map.get(replied_msg_id)
    if not player_tg_id:
        return  # 不是轉發給玩家的訊息，忽略

    # 獲取客服回覆內容
    agent = update.message.from_user
    agent_name = agent.first_name if agent else "客服"
    if agent and agent.username:
        agent_name = f"@{agent.username}"

    # 構建轉發給玩家的訊息
    lang = user_languages.get(player_tg_id, "zh-TW")

    # 檢查是否包含結束關鍵字
    is_ending = False
    if update.message.text and "祝你遊戲愉快" in update.message.text:
        is_ending = True

    prefix_msgs = {
        "zh-TW": f"👨‍💼 *客服回覆（{agent_name}）：*\n\n",
        "zh-CN": f"👨‍💼 *客服回复（{agent_name}）：*\n\n",
        "en": f"👨‍💼 *Agent reply ({agent_name}):*\n\n",
        "th": f"👨‍💼 *การตอบกลับจากเจ้าหน้าที่ ({agent_name}):*\n\n",
        "vi": f"👨‍💼 *Phản hồi từ nhân viên ({agent_name}):*\n\n",
        "ko": f"👨‍💼 *상담원 답변 ({agent_name}):*\n\n",
        "ja": f"👨‍💼 *担当者からの返信 ({agent_name}):*\n\n",
    }
    prefix = prefix_msgs.get(lang, prefix_msgs["zh-TW"])

    try:
        if update.message.photo:
            # 客服發送了圖片
            photo = update.message.photo[-1]
            caption = update.message.caption or ""
            await context.bot.send_photo(
                chat_id=player_tg_id,
                photo=photo.file_id,
                caption=f"{prefix}{caption}" if caption else prefix.rstrip(),
                parse_mode=ParseMode.MARKDOWN,
            )
        elif update.message.text:
            # 客服發送了文字
            await context.bot.send_message(
                chat_id=player_tg_id,
                text=f"{prefix}{update.message.text}",
                parse_mode=ParseMode.MARKDOWN,
            )
        elif update.message.sticker:
            # 客服發送了貼圖
            await context.bot.send_sticker(
                chat_id=player_tg_id,
                sticker=update.message.sticker.file_id,
            )
        elif update.message.document:
            # 客服發送了文件
            await context.bot.send_document(
                chat_id=player_tg_id,
                document=update.message.document.file_id,
                caption=f"{prefix}{update.message.caption or ''}",
                parse_mode=ParseMode.MARKDOWN,
            )
        else:
            # 其他類型，嘗試轉發
            await context.bot.forward_message(
                chat_id=player_tg_id,
                from_chat_id=chat_id,
                message_id=update.message.message_id,
            )

        logger.info(f"Relayed agent reply to player {player_tg_id}")

        # 在群組中確認已送達
        if is_ending:
            await _end_human_support(context, player_tg_id, lang)
            await update.message.reply_text("✅ 已轉發並結束人工客服模式")
        else:
            await update.message.reply_text("✅ 已轉發給玩家")

    except Exception as e:
        logger.error(f"Failed to relay agent reply to {player_tg_id}: {e}")
        await update.message.reply_text(f"❌ 轉發失敗：{e}")


# ── 管理員通知（舊邏輯保留）────────────────────────────────────────────────────

async def notify_admin(context: ContextTypes.DEFAULT_TYPE, user_info: dict, message: str, priority: str = "normal"):
    """通知管理員有用戶需要人工客服"""
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


# ── 結束人工客服輔助函數 ────────────────────────────────────────────────────────────

async def _end_human_support(context: ContextTypes.DEFAULT_TYPE, tg_id: int, lang: str, username: str = "", first_name: str = ""):
    """結束人工客服模式，通知玩家並清理狀態"""
    if tg_id not in pending_support:
        return

    # 獲取玩家資訊用於群組通知
    user_data = pending_support[tg_id]
    p_username = username or user_data.get("username", "")
    p_first_name = first_name or user_data.get("first_name", "玩家")

    # 移除狀態
    fwd_msg_id = user_data.get("forwarded_msg_id")
    if fwd_msg_id in forwarded_msg_map:
        del forwarded_msg_map[fwd_msg_id]
    del pending_support[tg_id]

    # 1. 通知玩家
    end_msgs = {
        "zh-TW": "✅ **人工客服服務已結束**\n\n感謝您的耐心等候！如有其他問題歡迎隨時聯繫。祝您遊戲愉快！ 🎮",
        "zh-CN": "✅ **人工客服服务已结束**\n\n感谢您的耐心等候！如有其他问题欢迎随时联系。祝您游戏愉快！ 🎮",
        "en": "✅ **Live support session ended**\n\nThank you for your patience! Feel free to contact us anytime. Have a great time gaming! 🎮",
        "th": "✅ **สิ้นสุดการบริการลูกค้า**\n\nขอบคุณที่รอคอย! หากมีคำถามเพิ่มเติม ติดต่อเราได้ตลอดเวลา ขอให้สนุกกับการเล่นเกม! 🎮",
        "vi": "✅ **Dịch vụ hỗ trợ trực tiếp đã kết thúc**\n\nCảm ơn bạn đã kiên nhẫn! Đừng ngần ngại liên hệ lại nếu cần. Chúc bạn chơi game vui vẻ! 🎮",
        "ko": "✅ **인간 상담원 서비스가 종료되었습니다**\n\n기다려 주셔서 감사합니다! 다른 문의 사항이 있으면 언제든지 연락해 주세요. 즐거운 게임 되세요! 🎮",
        "ja": "✅ **サポートスタッフによるサービスは終了しました**\n\nお待ちいただきありがとうございました！また何かありましたらいつでもご連絡ください。ゲームをお楽しみください！ 🎮",
    }
    
    try:
        await context.bot.send_message(
            chat_id=tg_id,
            text=end_msgs.get(lang, end_msgs["zh-TW"]),
            parse_mode=ParseMode.MARKDOWN,
        )
    except Exception as e:
        logger.error(f"Failed to send support end message to {tg_id}: {e}")

    # 2. 通知客服群組
    if SUPPORT_GROUP_ID:
        try:
            username_display = f" (@{p_username})" if p_username else ""
            group_msg = f"✅ <b>人工客服已結束</b> — 玩家 <b>{p_first_name}</b>{username_display} 的對話已關閉"
            await context.bot.send_message(
                chat_id=SUPPORT_GROUP_ID,
                text=group_msg,
                parse_mode=ParseMode.HTML,
            )
        except Exception as e:
            logger.error(f"Failed to send support end confirmation to group: {e}")


# ── 轉人工後續訊息轉發輔助函數 ─────────────────────────────────────────────

async def _forward_followup_to_support(
    context: ContextTypes.DEFAULT_TYPE,
    tg_id: int,
    username: str,
    first_name: str,
    text: str,
    is_photo: bool = False,
    update: "Update | None" = None,
):
    """
    將已在人工客服等待中的玩家後續訊息轉發到客服群。
    不再回覆「正在轉接」，直接靜默轉發。
    """
    if not SUPPORT_GROUP_ID:
        return

    tg_link = f"tg://user?id={tg_id}"
    username_display = f"@{username}" if username else "（無用戶名）"
    now = datetime.now().strftime("%H:%M:%S")

    try:
        if is_photo and update and update.message and update.message.photo:
            photo = update.message.photo[-1]
            caption = update.message.caption or ""
            msg_text = (
                f"💬 <a href='{tg_link}'>{first_name}</a> {username_display} [{now}]\n"
                f"📸 玩家發送截圖"
            )
            if caption:
                msg_text += f"\n💬 附言：{caption}"
            sent = await context.bot.send_photo(
                chat_id=SUPPORT_GROUP_ID,
                photo=photo.file_id,
                caption=msg_text,
                parse_mode=ParseMode.HTML,
            )
        else:
            msg_text = (
                f"💬 <a href='{tg_link}'>{first_name}</a> {username_display} [{now}]\n"
                f"{text}"
            )
            sent = await context.bot.send_message(
                chat_id=SUPPORT_GROUP_ID,
                text=msg_text,
                parse_mode=ParseMode.HTML,
            )

        # 更新映射（客服可以 reply 後續訊息）
        forwarded_msg_map[sent.message_id] = tg_id
        # 更新最新轉發訊息 ID
        if tg_id in pending_support:
            pending_support[tg_id]["forwarded_msg_id"] = sent.message_id

        logger.info(f"Forwarded follow-up from {tg_id} to support group, msg_id={sent.message_id}")

    except Exception as e:
        logger.error(f"Failed to forward follow-up from {tg_id}: {e}")


# ── 指令處理器 ────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/start 指令處理"""
    user = update.effective_user
    tg_id = user.id

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

    intro_text = get_new_user_intro(lang)
    keyboard = get_main_keyboard(lang)
    inline_kb = get_quick_action_keyboard(lang)

    await update.message.reply_text(
        intro_text,
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=keyboard,
    )
    await update.message.reply_text("👇", reply_markup=inline_kb)


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/help 指令處理"""
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
• 說「轉人工」或「真人客服」
• 發送儲值截圖自動轉接
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
• Say "human support" or "live agent"
• Send deposit screenshot to auto-transfer
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
    """/clear 指令 - 清除對話歷史"""
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


# ── 訊息處理器 ────────────────────────────────────────────────────────────────

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """處理所有文字訊息與媒體（私聊）"""
    if not update.message:
        return

    user = update.effective_user
    tg_id = user.id
    username = user.username or ""
    first_name = user.first_name or ""

    # 只處理私聊訊息
    if update.effective_chat.type != "private":
        return

    # ── 優先：已在人工客服等待狀態 → 所有訊息直接轉發到客服群 ────────────────────
    if tg_id in pending_support:
        # 轉發文字訊息
        if update.message.text:
            fwd_text = update.message.text.strip()
            await _forward_followup_to_support(context, tg_id, username, first_name, fwd_text, is_photo=False)
        # 轉發圖片/截圖
        elif update.message.photo or (
            update.message.document
            and update.message.document.mime_type
            and update.message.document.mime_type.startswith("image/")
        ):
            await _forward_followup_to_support(context, tg_id, username, first_name, "[玩家發送截圖]", is_photo=True, update=update)
        return

    # ── 處理圖片/截圖 → 觸發轉人工（首次）────────────────────────────────────────
    if update.message.photo or (
        update.message.document
        and update.message.document.mime_type
        and update.message.document.mime_type.startswith("image/")
    ):
        lang = get_user_lang(tg_id)
        await handle_human_transfer(
            update, context, tg_id, username, first_name, lang,
            trigger_text="[玩家發送截圖]", is_photo=True,
        )
        return

    if not update.message.text:
        return

    text = update.message.text.strip()

    # 偵測語言並儲存
    lang = detect_language(text)
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

    # ── 轉人工觸發關鍵字偵測（優先於其他邏輯）──────────────────────────────────
    text_lower = text.lower()
    is_human_transfer = any(kw.lower() in text_lower for kw in HUMAN_TRANSFER_KEYWORDS)

    if is_human_transfer:
        await handle_human_transfer(
            update, context, tg_id, username, first_name, lang,
            trigger_text=text, is_photo=False,
        )
        return

    # ── 儲值關鍵字 ──────────────────────────────────────────────────────────────
    deposit_keywords = ["儲值", "充值", "deposit", "存款", "入金"]
    if any(kw in text_lower for kw in deposit_keywords):
        await handle_manual_deposit(update, context, tg_id, username, lang)
        return

    # ── TxID 偵測 ───────────────────────────────────────────────────────────────
    txid_pattern = r'[a-fA-F0-9]{64}'
    if re.search(txid_pattern, text):
        await handle_txid_submission(update, context, tg_id, username, lang, text)
        return

    # ── 選單快捷鍵 ──────────────────────────────────────────────────────────────
    menu_response = await handle_menu_shortcuts(update, context, text, tg_id, username, lang)
    if menu_response:
        return

    # ── 帳戶查詢偵測 ────────────────────────────────────────────────────────────
    query_type = detect_account_query(text)
    if query_type:
        await handle_account_query(update, context, query_type, tg_id, username, lang)
        return

    # ── 舊版 escalation 偵測（AI 判定）────────────────────────────────────────
    if detect_escalation(text):
        is_complaint = any(kw in text_lower for kw in ["投訴", "舉報", "詐騙", "騙人", "complaint", "scam", "fraud"])
        priority = "high" if is_complaint else "normal"

        await handle_human_transfer(
            update, context, tg_id, username, first_name, lang,
            trigger_text=text, is_photo=False,
        )
        return

    # ── AI 回覆 ─────────────────────────────────────────────────────────────────
    reply, needs_escalation = get_ai_response(tg_id, text, username, first_name)

    # 如果 AI 回覆失敗（返回 None 且不需要轉接）或明確需要轉接
    if needs_escalation or reply is None:
        await handle_human_transfer(
            update, context, tg_id, username, first_name, lang,
            trigger_text=text, is_photo=False,
        )
    elif reply:
        try:
            await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)
        except Exception:
            await update.message.reply_text(reply)


async def handle_group_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    處理來自客服工作群的訊息。
    只處理 reply 訊息（客服回覆轉發的玩家訊息時）。
    """
    if not update.message:
        return

    # 確認是客服群
    if SUPPORT_GROUP_ID and update.effective_chat.id != SUPPORT_GROUP_ID:
        return

    # 只處理 reply
    if update.message.reply_to_message:
        await handle_group_reply(update, context)


# ── 選單快捷鍵處理 ────────────────────────────────────────────────────────────

async def handle_menu_shortcuts(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    text: str,
    tg_id: int,
    username: str,
    lang: str,
) -> bool:
    """處理選單按鈕快捷指令，返回 True 表示已處理"""
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

    # 人工客服按鈕（選單觸發）→ 走轉人工流程
    if any(kw in text for kw in [
        "人工客服", "轉人工", "转人工", "Human Support", "ฝ่ายสนับสนุน",
        "Hỗ trợ", "인간 지원", "サポート", "🆘 人工客服", "🆘 Human Support",
        "真人客服", "真人服務",
    ]):
        user = update.effective_user
        await handle_human_transfer(
            update, context, tg_id, username,
            user.first_name or "",
            lang, trigger_text=text, is_photo=False,
        )
        return True

    return False


# ── 帳戶查詢處理 ──────────────────────────────────────────────────────────────

async def handle_account_query(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    query_type: str,
    tg_id: int,
    username: str,
    lang: str,
):
    """處理帳戶查詢"""
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

    try:
        await loading_msg.delete()
    except Exception:
        pass

    await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)


# ── Callback 處理 ─────────────────────────────────────────────────────────────

async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """處理 inline 按鈕回調"""
    query = update.callback_query
    await query.answer()

    data = query.data
    if data == "cs":
        await query.message.reply_text(
            "💬 請聯繫人工客服：@yu_888yu",
            parse_mode=ParseMode.MARKDOWN,
        )


# ── 儲值/截圖處理 ─────────────────────────────────────────────────────────────

async def handle_manual_deposit(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    tg_id: int,
    username: str,
    lang: str,
):
    """處理人工儲值指令"""
    user_info = get_user_info(tg_id, username)
    game_account = user_info.get("username", "未註冊") if user_info else "未註冊"

    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={USDT_ADDRESS}"

    msg = (
        f"💰 **人工儲值流程**\n\n"
        f"您的遊戲帳號：`{game_account}`\n"
        f"您的 TG ID：`{tg_id}`\n\n"
        f"請轉帳至以下 **USDT TRC20** 地址：\n"
        f"`{USDT_ADDRESS}`\n\n"
        f"⚠️ **重要提示：**\n"
        f"1. 請務必確認使用 **TRC20** 網路\n"
        f"2. 轉帳完成後，請將 **交易截圖** 或 **TxID** 直接發送給本客服\n"
        f"3. 工作人員將在 5-15 分鐘內為您完成上分"
    )

    try:
        await update.message.reply_photo(
            photo=qr_url,
            caption=msg,
            parse_mode=ParseMode.MARKDOWN,
        )
    except Exception:
        await update.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN)


async def handle_txid_submission(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    tg_id: int,
    username: str,
    lang: str,
    text: str,
):
    """處理 TxID 提交"""
    txid_match = re.search(r'[a-fA-F0-9]{64}', text)
    txid = txid_match.group(0) if txid_match else ""

    create_deposit_request(tg_id, username, 0, tx_id=txid)

    reply = "✅ **已收到您的 TxID 儲值申請！**\n\n工作人員將在 5-15 分鐘內確認並完成上分，請耐心等候。如有疑問請聯繫 @yu_888yu"
    await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)


# ── 主程序 ────────────────────────────────────────────────────────────────────

def main():
    """主程序入口"""
    bot_token = TG_BOT_TOKEN
    if not bot_token:
        raise ValueError("TG_BOT_TOKEN environment variable is not set!")

    if SUPPORT_GROUP_ID:
        logger.info(f"Support group relay enabled: {SUPPORT_GROUP_ID}")
    else:
        logger.warning("SUPPORT_GROUP_ID not set — group relay disabled")

    logger.info("Starting LA1 AI Customer Service Bot...")

    app = Application.builder().token(bot_token).build()

    # 指令處理器
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("clear", cmd_clear))

    # 私聊訊息處理器（文字 + 圖片 + 文件）
    app.add_handler(MessageHandler(
        (filters.TEXT | filters.PHOTO | filters.Document.IMAGE)
        & ~filters.COMMAND
        & filters.ChatType.PRIVATE,
        handle_message,
    ))

    # 客服群組訊息處理器（監聽群組中的 reply）
    if SUPPORT_GROUP_ID:
        app.add_handler(MessageHandler(
            (filters.TEXT | filters.PHOTO | filters.Document.ALL | filters.Sticker.ALL)
            & ~filters.COMMAND
            & filters.Chat(chat_id=SUPPORT_GROUP_ID),
            handle_group_message,
        ))
        logger.info(f"Registered group message handler for chat {SUPPORT_GROUP_ID}")

    # Callback 處理器
    app.add_handler(CallbackQueryHandler(handle_callback_query))

    logger.info("Bot is running. Press Ctrl+C to stop.")

    app.run_polling(
        allowed_updates=Update.ALL_TYPES,
        drop_pending_updates=True,
    )


if __name__ == "__main__":
    main()
