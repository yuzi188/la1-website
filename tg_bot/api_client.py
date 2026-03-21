"""
LA1 後端 API 客戶端
負責查詢用戶帳戶資訊
"""

import requests
import logging
import json
import hashlib
import hmac
import time
import os

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "https://la1-backend-production.up.railway.app")
TG_BOT_TOKEN = os.getenv("TG_BOT_TOKEN", "")


def _generate_tg_init_data(tg_id: int, username: str = "") -> str:
    """
    生成模擬的 Telegram initData 用於後端驗證
    用於 Bot 代替用戶查詢帳戶資訊
    """
    user_data = {
        "id": tg_id,
        "first_name": username or f"user_{tg_id}",
        "username": username or f"user_{tg_id}",
        "language_code": "zh-hant",
    }
    user_json = json.dumps(user_data, separators=(",", ":"))
    auth_date = int(time.time())
    data_check_string = f"auth_date={auth_date}\nquery_id=\nuser={user_json}"
    
    # 使用 bot token 生成 HMAC
    bot_token = TG_BOT_TOKEN
    if bot_token:
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        hash_value = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    else:
        hash_value = "test_hash"
    
    import urllib.parse
    init_data = urllib.parse.urlencode({
        "auth_date": auth_date,
        "query_id": "",
        "user": user_json,
        "hash": hash_value,
    })
    return init_data


def get_user_token(tg_id: int, username: str = "") -> str | None:
    """
    通過 TG ID 獲取後端 JWT token
    """
    try:
        init_data = _generate_tg_init_data(tg_id, username)
        resp = requests.post(
            f"{BACKEND_URL}/tg-login",
            json={"initData": init_data},
            timeout=10,
        )
        data = resp.json()
        return data.get("token")
    except Exception as e:
        logger.error(f"get_user_token error for tg_id={tg_id}: {e}")
        return None


def get_user_info(tg_id: int, username: str = "") -> dict | None:
    """
    查詢用戶帳戶基本資訊（餘額、VIP 等）
    """
    try:
        token = get_user_token(tg_id, username)
        if not token:
            return None
        resp = requests.get(
            f"{BACKEND_URL}/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        data = resp.json()
        if "error" in data:
            return None
        return data
    except Exception as e:
        logger.error(f"get_user_info error for tg_id={tg_id}: {e}")
        return None


def get_vip_info(tg_id: int, username: str = "") -> dict | None:
    """
    查詢用戶 VIP 資訊
    """
    try:
        token = get_user_token(tg_id, username)
        if not token:
            return None
        resp = requests.get(
            f"{BACKEND_URL}/promo/vip-info",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        data = resp.json()
        if "error" in data:
            return None
        return data
    except Exception as e:
        logger.error(f"get_vip_info error for tg_id={tg_id}: {e}")
        return None


def get_referral_info(tg_id: int, username: str = "") -> dict | None:
    """
    查詢用戶邀請佣金資訊
    """
    try:
        token = get_user_token(tg_id, username)
        if not token:
            return None
        resp = requests.get(
            f"{BACKEND_URL}/promo/referral-info",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        data = resp.json()
        if "error" in data:
            return None
        return data
    except Exception as e:
        logger.error(f"get_referral_info error for tg_id={tg_id}: {e}")
        return None


def get_checkin_status(tg_id: int, username: str = "") -> dict | None:
    """
    查詢用戶簽到狀態
    """
    try:
        token = get_user_token(tg_id, username)
        if not token:
            return None
        resp = requests.get(
            f"{BACKEND_URL}/promo/checkin-status",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        data = resp.json()
        if "error" in data:
            return None
        return data
    except Exception as e:
        logger.error(f"get_checkin_status error for tg_id={tg_id}: {e}")
        return None


def get_promo_summary(tg_id: int, username: str = "") -> dict | None:
    """
    查詢用戶活動摘要（流水進度等）
    """
    try:
        token = get_user_token(tg_id, username)
        if not token:
            return None
        resp = requests.get(
            f"{BACKEND_URL}/promo/summary",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        data = resp.json()
        if "error" in data:
            return None
        return data
    except Exception as e:
        logger.error(f"get_promo_summary error for tg_id={tg_id}: {e}")
        return None


def format_user_balance_reply(tg_id: int, username: str = "", lang: str = "zh-TW") -> str:
    """
    格式化用戶餘額回覆
    """
    user_info = get_user_info(tg_id, username)
    
    if not user_info:
        messages = {
            "zh-TW": "❌ 查詢失敗，您的帳號可能尚未在 LA1 平台註冊。\n\n請前往 [Mini App](https://t.me/LA1111_bot/app) 完成註冊後再查詢。",
            "zh-CN": "❌ 查询失败，您的账号可能尚未在 LA1 平台注册。\n\n请前往 [Mini App](https://t.me/LA1111_bot/app) 完成注册后再查询。",
            "en": "❌ Query failed. Your account may not be registered on the LA1 platform.\n\nPlease visit [Mini App](https://t.me/LA1111_bot/app) to register first.",
            "th": "❌ การค้นหาล้มเหลว บัญชีของคุณอาจยังไม่ได้ลงทะเบียนบนแพลตฟอร์ม LA1\n\nกรุณาไปที่ [Mini App](https://t.me/LA1111_bot/app) เพื่อลงทะเบียนก่อน",
            "vi": "❌ Truy vấn thất bại. Tài khoản của bạn có thể chưa đăng ký trên nền tảng LA1.\n\nVui lòng truy cập [Mini App](https://t.me/LA1111_bot/app) để đăng ký trước.",
            "ko": "❌ 조회 실패. LA1 플랫폼에 계정이 등록되지 않았을 수 있습니다.\n\n[Mini App](https://t.me/LA1111_bot/app)에서 먼저 등록해 주세요.",
            "ja": "❌ 照会に失敗しました。LA1プラットフォームにアカウントが登録されていない可能性があります。\n\n[Mini App](https://t.me/LA1111_bot/app)で先に登録してください。",
        }
        return messages.get(lang, messages["zh-TW"])
    
    balance = user_info.get("balance", 0)
    vip = user_info.get("vip", "一般會員")
    uname = user_info.get("username", "")
    
    messages = {
        "zh-TW": f"💰 **帳戶餘額查詢**\n\n👤 用戶名：{uname}\n💵 當前餘額：**{balance:.2f} USDT**\n👑 VIP 等級：{vip}\n\n如需充值，請前往 [Mini App](https://t.me/LA1111_bot/app)",
        "zh-CN": f"💰 **账户余额查询**\n\n👤 用户名：{uname}\n💵 当前余额：**{balance:.2f} USDT**\n👑 VIP 等级：{vip}\n\n如需充值，请前往 [Mini App](https://t.me/LA1111_bot/app)",
        "en": f"💰 **Account Balance**\n\n👤 Username: {uname}\n💵 Current Balance: **{balance:.2f} USDT**\n👑 VIP Level: {vip}\n\nTo deposit, visit [Mini App](https://t.me/LA1111_bot/app)",
        "th": f"💰 **ยอดเงินในบัญชี**\n\n👤 ชื่อผู้ใช้: {uname}\n💵 ยอดเงินปัจจุบัน: **{balance:.2f} USDT**\n👑 ระดับ VIP: {vip}\n\nหากต้องการฝากเงิน ไปที่ [Mini App](https://t.me/LA1111_bot/app)",
        "vi": f"💰 **Số dư tài khoản**\n\n👤 Tên người dùng: {uname}\n💵 Số dư hiện tại: **{balance:.2f} USDT**\n👑 Cấp VIP: {vip}\n\nĐể nạp tiền, truy cập [Mini App](https://t.me/LA1111_bot/app)",
        "ko": f"💰 **계정 잔액**\n\n👤 사용자명: {uname}\n💵 현재 잔액: **{balance:.2f} USDT**\n👑 VIP 등급: {vip}\n\n입금하려면 [Mini App](https://t.me/LA1111_bot/app)을 방문하세요",
        "ja": f"💰 **アカウント残高**\n\n👤 ユーザー名: {uname}\n💵 現在の残高: **{balance:.2f} USDT**\n👑 VIPレベル: {vip}\n\n入金するには [Mini App](https://t.me/LA1111_bot/app) をご覧ください",
    }
    return messages.get(lang, messages["zh-TW"])


def format_vip_reply(tg_id: int, username: str = "", lang: str = "zh-TW") -> str:
    """
    格式化 VIP 資訊回覆
    """
    vip_info = get_vip_info(tg_id, username)
    
    if not vip_info:
        messages = {
            "zh-TW": "❌ 查詢失敗，請確認您已在 LA1 平台完成註冊。\n\n前往 [Mini App](https://t.me/LA1111_bot/app) 查看 VIP 詳情",
            "zh-CN": "❌ 查询失败，请确认您已在 LA1 平台完成注册。\n\n前往 [Mini App](https://t.me/LA1111_bot/app) 查看 VIP 详情",
            "en": "❌ Query failed. Please ensure you have registered on the LA1 platform.\n\nVisit [Mini App](https://t.me/LA1111_bot/app) for VIP details",
            "th": "❌ การค้นหาล้มเหลว กรุณาตรวจสอบว่าคุณได้ลงทะเบียนบนแพลตฟอร์ม LA1 แล้ว\n\nไปที่ [Mini App](https://t.me/LA1111_bot/app) เพื่อดูรายละเอียด VIP",
            "vi": "❌ Truy vấn thất bại. Vui lòng đảm bảo bạn đã đăng ký trên nền tảng LA1.\n\nTruy cập [Mini App](https://t.me/LA1111_bot/app) để xem chi tiết VIP",
            "ko": "❌ 조회 실패. LA1 플랫폼에 등록했는지 확인해 주세요.\n\nVIP 세부 정보는 [Mini App](https://t.me/LA1111_bot/app)을 방문하세요",
            "ja": "❌ 照会に失敗しました。LA1プラットフォームに登録済みか確認してください。\n\nVIPの詳細は [Mini App](https://t.me/LA1111_bot/app) をご覧ください",
        }
        return messages.get(lang, messages["zh-TW"])
    
    vip_name = vip_info.get("vip_name", "普通會員")
    total_bet = vip_info.get("total_bet", 0)
    next_bet = vip_info.get("next_bet", 0)
    progress = vip_info.get("progress", 0)
    
    messages = {
        "zh-TW": f"👑 **VIP 等級查詢**\n\n🏆 當前等級：**{vip_name}**\n📊 累計有效投注：{total_bet:,.0f} USDT\n🎯 升級還需：{max(0, next_bet - total_bet):,.0f} USDT\n📈 升級進度：{progress:.0f}%\n\n查看完整 VIP 福利 → [Mini App](https://t.me/LA1111_bot/app)",
        "zh-CN": f"👑 **VIP 等级查询**\n\n🏆 当前等级：**{vip_name}**\n📊 累计有效投注：{total_bet:,.0f} USDT\n🎯 升级还需：{max(0, next_bet - total_bet):,.0f} USDT\n📈 升级进度：{progress:.0f}%\n\n查看完整 VIP 福利 → [Mini App](https://t.me/LA1111_bot/app)",
        "en": f"👑 **VIP Level**\n\n🏆 Current Level: **{vip_name}**\n📊 Total Valid Bets: {total_bet:,.0f} USDT\n🎯 Needed for Next Level: {max(0, next_bet - total_bet):,.0f} USDT\n📈 Progress: {progress:.0f}%\n\nView full VIP benefits → [Mini App](https://t.me/LA1111_bot/app)",
        "th": f"👑 **ระดับ VIP**\n\n🏆 ระดับปัจจุบัน: **{vip_name}**\n📊 การเดิมพันที่ถูกต้องสะสม: {total_bet:,.0f} USDT\n🎯 ต้องการสำหรับระดับถัดไป: {max(0, next_bet - total_bet):,.0f} USDT\n📈 ความคืบหน้า: {progress:.0f}%\n\nดูสิทธิประโยชน์ VIP ทั้งหมด → [Mini App](https://t.me/LA1111_bot/app)",
        "vi": f"👑 **Cấp VIP**\n\n🏆 Cấp hiện tại: **{vip_name}**\n📊 Tổng cược hợp lệ: {total_bet:,.0f} USDT\n🎯 Cần để lên cấp tiếp: {max(0, next_bet - total_bet):,.0f} USDT\n📈 Tiến độ: {progress:.0f}%\n\nXem đầy đủ quyền lợi VIP → [Mini App](https://t.me/LA1111_bot/app)",
        "ko": f"👑 **VIP 등급**\n\n🏆 현재 등급: **{vip_name}**\n📊 총 유효 베팅: {total_bet:,.0f} USDT\n🎯 다음 등급까지 필요: {max(0, next_bet - total_bet):,.0f} USDT\n📈 진행률: {progress:.0f}%\n\n전체 VIP 혜택 보기 → [Mini App](https://t.me/LA1111_bot/app)",
        "ja": f"👑 **VIPレベル**\n\n🏆 現在のレベル: **{vip_name}**\n📊 累計有効ベット: {total_bet:,.0f} USDT\n🎯 次のレベルまで: {max(0, next_bet - total_bet):,.0f} USDT\n📈 進捗: {progress:.0f}%\n\nVIP特典の詳細 → [Mini App](https://t.me/LA1111_bot/app)",
    }
    return messages.get(lang, messages["zh-TW"])


def format_referral_reply(tg_id: int, username: str = "", lang: str = "zh-TW") -> str:
    """
    格式化邀請佣金回覆
    """
    referral_info = get_referral_info(tg_id, username)
    
    if not referral_info:
        messages = {
            "zh-TW": "❌ 查詢失敗，請前往 [Mini App](https://t.me/LA1111_bot/app) 查看邀請詳情",
            "zh-CN": "❌ 查询失败，请前往 [Mini App](https://t.me/LA1111_bot/app) 查看邀请详情",
            "en": "❌ Query failed. Visit [Mini App](https://t.me/LA1111_bot/app) for referral details",
            "th": "❌ การค้นหาล้มเหลว ไปที่ [Mini App](https://t.me/LA1111_bot/app) เพื่อดูรายละเอียดการแนะนำ",
            "vi": "❌ Truy vấn thất bại. Truy cập [Mini App](https://t.me/LA1111_bot/app) để xem chi tiết giới thiệu",
            "ko": "❌ 조회 실패. [Mini App](https://t.me/LA1111_bot/app)에서 추천 세부 정보를 확인하세요",
            "ja": "❌ 照会に失敗しました。[Mini App](https://t.me/LA1111_bot/app)で紹介の詳細をご確認ください",
        }
        return messages.get(lang, messages["zh-TW"])
    
    invite_code = referral_info.get("invite_code", "N/A")
    invite_count = referral_info.get("invite_count", 0)
    earnings = referral_info.get("invite_earnings", 0)
    tg_link = referral_info.get("tg_link", "")
    
    messages = {
        "zh-TW": f"🤝 **邀請佣金查詢**\n\n🔑 您的邀請碼：`{invite_code}`\n👥 已邀請人數：{invite_count} 人\n💰 累計佣金：**{earnings:.2f} USDT**\n\n📲 邀請連結：{tg_link}\n\n💡 直推佣金 15% + 二級佣金 3%，永久無上限！",
        "zh-CN": f"🤝 **邀请佣金查询**\n\n🔑 您的邀请码：`{invite_code}`\n👥 已邀请人数：{invite_count} 人\n💰 累计佣金：**{earnings:.2f} USDT**\n\n📲 邀请链接：{tg_link}\n\n💡 直推佣金 15% + 二级佣金 3%，永久无上限！",
        "en": f"🤝 **Referral Commission**\n\n🔑 Your Invite Code: `{invite_code}`\n👥 Friends Invited: {invite_count}\n💰 Total Commission: **{earnings:.2f} USDT**\n\n📲 Invite Link: {tg_link}\n\n💡 15% direct + 3% second-level commission, unlimited forever!",
        "th": f"🤝 **คอมมิชชั่นการแนะนำ**\n\n🔑 รหัสเชิญของคุณ: `{invite_code}`\n👥 เพื่อนที่เชิญ: {invite_count} คน\n💰 คอมมิชชั่นสะสม: **{earnings:.2f} USDT**\n\n📲 ลิงก์เชิญ: {tg_link}\n\n💡 คอมมิชชั่นตรง 15% + ระดับสอง 3% ไม่จำกัดตลอดไป!",
        "vi": f"🤝 **Hoa hồng giới thiệu**\n\n🔑 Mã mời của bạn: `{invite_code}`\n👥 Bạn bè đã mời: {invite_count} người\n💰 Tổng hoa hồng: **{earnings:.2f} USDT**\n\n📲 Link mời: {tg_link}\n\n💡 Hoa hồng trực tiếp 15% + cấp 2 3%, không giới hạn mãi mãi!",
        "ko": f"🤝 **추천 커미션**\n\n🔑 초대 코드: `{invite_code}`\n👥 초대한 친구: {invite_count}명\n💰 총 커미션: **{earnings:.2f} USDT**\n\n📲 초대 링크: {tg_link}\n\n💡 직접 추천 15% + 2단계 3% 커미션, 영구 무제한!",
        "ja": f"🤝 **紹介コミッション**\n\n🔑 招待コード: `{invite_code}`\n👥 招待した友達: {invite_count}人\n💰 累計コミッション: **{earnings:.2f} USDT**\n\n📲 招待リンク: {tg_link}\n\n💡 直接紹介15% + 2次紹介3%、永久無制限！",
    }
    return messages.get(lang, messages["zh-TW"])


def format_turnover_reply(tg_id: int, username: str = "", lang: str = "zh-TW") -> str:
    """
    格式化流水進度回覆
    """
    summary = get_promo_summary(tg_id, username)
    
    if not summary or summary == {}:
        messages = {
            "zh-TW": "📊 **流水進度查詢**\n\n目前沒有進行中的流水要求，或您尚未領取任何優惠。\n\n🎁 **立即領取首充優惠：**\n• 充 100 USDT → 送 **38 USDT**\n• 充 30 USDT → 送 **10 USDT**\n\n前往 [Mini App](https://t.me/LA1111_bot/app) 領取",
            "zh-CN": "📊 **流水进度查询**\n\n目前没有进行中的流水要求，或您尚未领取任何优惠。\n\n🎁 **立即领取首充优惠：**\n• 充 100 USDT → 送 **38 USDT**\n• 充 30 USDT → 送 **10 USDT**\n\n前往 [Mini App](https://t.me/LA1111_bot/app) 领取",
            "en": "📊 **Turnover Progress**\n\nNo active turnover requirements, or you haven't claimed any bonuses yet.\n\n🎁 **Claim First Deposit Bonus:**\n• Deposit 100 USDT → Get **38 USDT**\n• Deposit 30 USDT → Get **10 USDT**\n\nVisit [Mini App](https://t.me/LA1111_bot/app)",
            "th": "📊 **ความคืบหน้าการหมุนเวียน**\n\nไม่มีข้อกำหนดการหมุนเวียนที่ใช้งานอยู่ หรือคุณยังไม่ได้รับโบนัสใดๆ\n\n🎁 **รับโบนัสฝากครั้งแรก:**\n• ฝาก 100 USDT → รับ **38 USDT**\n• ฝาก 30 USDT → รับ **10 USDT**\n\nไปที่ [Mini App](https://t.me/LA1111_bot/app)",
            "vi": "📊 **Tiến độ doanh thu**\n\nKhông có yêu cầu doanh thu đang hoạt động, hoặc bạn chưa nhận bất kỳ phần thưởng nào.\n\n🎁 **Nhận thưởng nạp lần đầu:**\n• Nạp 100 USDT → Nhận **38 USDT**\n• Nạp 30 USDT → Nhận **10 USDT**\n\nTruy cập [Mini App](https://t.me/LA1111_bot/app)",
            "ko": "📊 **롤오버 진행률**\n\n진행 중인 롤오버 요건이 없거나 아직 보너스를 받지 않았습니다.\n\n🎁 **첫 입금 보너스 받기:**\n• 100 USDT 입금 → **38 USDT** 받기\n• 30 USDT 입금 → **10 USDT** 받기\n\n[Mini App](https://t.me/LA1111_bot/app) 방문",
            "ja": "📊 **ロールオーバー進捗**\n\n進行中のロールオーバー要件がないか、まだボーナスを受け取っていません。\n\n🎁 **初回入金ボーナスを受け取る:**\n• 100 USDT 入金 → **38 USDT** 獲得\n• 30 USDT 入金 → **10 USDT** 獲得\n\n[Mini App](https://t.me/LA1111_bot/app) を訪問",
        }
        return messages.get(lang, messages["zh-TW"])
    
    # 如果有流水數據
    turnover_done = summary.get("turnover_done", 0)
    turnover_required = summary.get("turnover_required", 0)
    turnover_pct = (turnover_done / turnover_required * 100) if turnover_required > 0 else 0
    
    messages = {
        "zh-TW": f"📊 **流水進度查詢**\n\n✅ 已完成流水：**{turnover_done:.2f} USDT**\n🎯 需要完成：{turnover_required:.2f} USDT\n📈 完成進度：{turnover_pct:.1f}%\n\n{'🎉 流水已完成，可以提款了！' if turnover_pct >= 100 else f'還需完成 {max(0, turnover_required - turnover_done):.2f} USDT 流水'}\n\n前往 [Mini App](https://t.me/LA1111_bot/app) 查看詳情",
        "zh-CN": f"📊 **流水进度查询**\n\n✅ 已完成流水：**{turnover_done:.2f} USDT**\n🎯 需要完成：{turnover_required:.2f} USDT\n📈 完成进度：{turnover_pct:.1f}%\n\n{'🎉 流水已完成，可以提款了！' if turnover_pct >= 100 else f'还需完成 {max(0, turnover_required - turnover_done):.2f} USDT 流水'}\n\n前往 [Mini App](https://t.me/LA1111_bot/app) 查看详情",
        "en": f"📊 **Turnover Progress**\n\n✅ Completed: **{turnover_done:.2f} USDT**\n🎯 Required: {turnover_required:.2f} USDT\n📈 Progress: {turnover_pct:.1f}%\n\n{'🎉 Turnover complete! You can withdraw now!' if turnover_pct >= 100 else f'Still need {max(0, turnover_required - turnover_done):.2f} USDT more'}\n\nVisit [Mini App](https://t.me/LA1111_bot/app) for details",
        "th": f"📊 **ความคืบหน้าการหมุนเวียน**\n\n✅ เสร็จสิ้น: **{turnover_done:.2f} USDT**\n🎯 ต้องการ: {turnover_required:.2f} USDT\n📈 ความคืบหน้า: {turnover_pct:.1f}%\n\n{'🎉 การหมุนเวียนเสร็จสิ้น! คุณสามารถถอนได้แล้ว!' if turnover_pct >= 100 else f'ยังต้องการอีก {max(0, turnover_required - turnover_done):.2f} USDT'}\n\nไปที่ [Mini App](https://t.me/LA1111_bot/app) สำหรับรายละเอียด",
        "vi": f"📊 **Tiến độ doanh thu**\n\n✅ Đã hoàn thành: **{turnover_done:.2f} USDT**\n🎯 Yêu cầu: {turnover_required:.2f} USDT\n📈 Tiến độ: {turnover_pct:.1f}%\n\n{'🎉 Doanh thu hoàn thành! Bạn có thể rút tiền rồi!' if turnover_pct >= 100 else f'Vẫn cần thêm {max(0, turnover_required - turnover_done):.2f} USDT'}\n\nTruy cập [Mini App](https://t.me/LA1111_bot/app) để biết chi tiết",
        "ko": f"📊 **롤오버 진행률**\n\n✅ 완료: **{turnover_done:.2f} USDT**\n🎯 필요: {turnover_required:.2f} USDT\n📈 진행률: {turnover_pct:.1f}%\n\n{'🎉 롤오버 완료! 이제 출금할 수 있습니다!' if turnover_pct >= 100 else f'아직 {max(0, turnover_required - turnover_done):.2f} USDT 더 필요합니다'}\n\n자세한 내용은 [Mini App](https://t.me/LA1111_bot/app) 방문",
        "ja": f"📊 **ロールオーバー進捗**\n\n✅ 完了: **{turnover_done:.2f} USDT**\n🎯 必要: {turnover_required:.2f} USDT\n📈 進捗: {turnover_pct:.1f}%\n\n{'🎉 ロールオーバー完了！出金できます！' if turnover_pct >= 100 else f'あと {max(0, turnover_required - turnover_done):.2f} USDT 必要です'}\n\n詳細は [Mini App](https://t.me/LA1111_bot/app) をご覧ください",
    }
    return messages.get(lang, messages["zh-TW"])
