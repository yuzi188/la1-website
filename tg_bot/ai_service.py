"""
LA1 AI 客服核心模組
使用 GPT-4.1-mini 處理用戶問題
支持 7 種語言自動偵測回覆
"""

import os
import logging
import json
from openai import OpenAI
from knowledge_base import SYSTEM_PROMPT, ESCALATION_KEYWORDS, PLATFORM_INFO

logger = logging.getLogger(__name__)

# 延遲初始化 OpenAI client
_client = None

def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        # 如果是 Manus 代理 key，必須使用 Manus 的 base_url
        base_url = os.environ.get("OPENAI_BASE_URL")
        if not base_url and api_key and api_key.startswith("sk-"):
            # 預設 Manus 代理地址
            base_url = "https://api.openai.com/v1"
            
        _client = OpenAI(
            api_key=api_key,
            base_url=base_url or "https://api.openai.com/v1",
        )
    return _client


# 對話歷史儲存（記憶功能）
# 格式: {tg_id: [{"role": "user/assistant", "content": "..."}]}
conversation_history: dict[int, list] = {}

# 最大對話歷史長度（保留最近 10 輪）
MAX_HISTORY = 10


def detect_escalation(text: str) -> bool:
    """
    偵測是否需要轉接人工客服
    """
    text_lower = text.lower()
    for keyword in ESCALATION_KEYWORDS:
        if keyword.lower() in text_lower:
            return True
    return False


def detect_account_query(text: str) -> str | None:
    """
    偵測用戶是否在查詢帳戶資訊
    返回查詢類型: 'balance', 'vip', 'referral', 'turnover', None
    """
    text_lower = text.lower()
    
    # 餘額查詢
    balance_keywords = [
        "餘額", "余额", "balance", "多少錢", "多少钱", "帳戶", "账户",
        "ยอดเงิน", "số dư", "잔액", "残高",
        "我有多少", "我的錢", "我的钱",
    ]
    for kw in balance_keywords:
        if kw in text_lower:
            return "balance"
    
    # VIP 查詢
    vip_keywords = [
        "vip", "等級", "等级", "level", "升級", "升级",
        "ระดับ vip", "cấp vip", "vip 등급", "vipレベル",
        "我的vip", "vip幾", "vip几",
    ]
    for kw in vip_keywords:
        if kw in text_lower:
            return "vip"
    
    # 邀請佣金查詢
    referral_keywords = [
        "邀請", "邀请", "佣金", "referral", "commission", "invite",
        "คอมมิชชั่น", "hoa hồng", "커미션", "コミッション",
        "推薦", "推荐", "邀請碼", "邀请码",
    ]
    for kw in referral_keywords:
        if kw in text_lower:
            return "referral"
    
    # 流水查詢
    turnover_keywords = [
        "流水", "turnover", "打碼", "打码", "rollover",
        "การหมุนเวียน", "doanh thu", "롤오버", "ロールオーバー",
        "流水完成", "流水進度", "流水进度", "還差多少", "还差多少",
    ]
    for kw in turnover_keywords:
        if kw in text_lower:
            return "turnover"
    
    return None


def detect_language(text: str) -> str:
    """
    簡單語言偵測（輔助 AI 判斷）
    返回語言代碼
    """
    # 泰文字符範圍
    thai_chars = sum(1 for c in text if '\u0e00' <= c <= '\u0e7f')
    # 韓文字符範圍
    korean_chars = sum(1 for c in text if '\uac00' <= c <= '\ud7a3' or '\u1100' <= c <= '\u11ff')
    # 日文字符範圍（平假名、片假名）
    japanese_chars = sum(1 for c in text if '\u3040' <= c <= '\u309f' or '\u30a0' <= c <= '\u30ff')
    # 越南文特殊字符
    vietnamese_chars = sum(1 for c in text if c in 'àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ')
    # 中文字符
    chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    
    total = len(text)
    if total == 0:
        return "zh-TW"
    
    if thai_chars / total > 0.1:
        return "th"
    if korean_chars / total > 0.1:
        return "ko"
    if japanese_chars / total > 0.1:
        return "ja"
    if vietnamese_chars / total > 0.05:
        return "vi"
    if chinese_chars / total > 0.1:
        # 簡體中文偵測（常見簡體字）
        simplified_chars = sum(1 for c in text if c in '们来说这个时间国际会说话')
        if simplified_chars > 0:
            return "zh-CN"
        return "zh-TW"
    
    # 預設英文
    return "en"


def get_ai_response(
    tg_id: int,
    user_message: str,
    username: str = "",
    first_name: str = "",
) -> tuple[str, bool]:
    """
    獲取 AI 回覆
    返回: (回覆文字, 是否需要轉接人工客服)
    """
    # 偵測是否需要轉接
    needs_escalation = detect_escalation(user_message)
    if needs_escalation:
        return None, True  # 返回 None 讓主程序處理轉接邏輯
    
    # 獲取對話歷史
    history = conversation_history.get(tg_id, [])
    
    # 構建消息列表
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # 加入對話歷史（最近 MAX_HISTORY 輪）
    messages.extend(history[-MAX_HISTORY * 2:])
    
    # 加入當前用戶消息
    messages.append({"role": "user", "content": user_message})
    
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            max_tokens=800,
            temperature=0.7,
        )
        
        reply = response.choices[0].message.content.strip()
        
        # 更新對話歷史
        if tg_id not in conversation_history:
            conversation_history[tg_id] = []
        conversation_history[tg_id].append({"role": "user", "content": user_message})
        conversation_history[tg_id].append({"role": "assistant", "content": reply})
        
        # 限制歷史長度
        if len(conversation_history[tg_id]) > MAX_HISTORY * 2:
            conversation_history[tg_id] = conversation_history[tg_id][-MAX_HISTORY * 2:]
        
        return reply, False
        
    except Exception as e:
        logger.error(f"AI response error for tg_id={tg_id}: {e}")
        lang = detect_language(user_message)
        error_messages = {
            "zh-TW": "抱歉，AI 客服暫時無法回應，請稍後再試或聯繫人工客服 @yu_888yu",
            "zh-CN": "抱歉，AI 客服暂时无法回应，请稍后再试或联系人工客服 @yu_888yu",
            "en": "Sorry, AI service is temporarily unavailable. Please try again later or contact @yu_888yu",
            "th": "ขออภัย บริการ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลังหรือติดต่อ @yu_888yu",
            "vi": "Xin lỗi, dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau hoặc liên hệ @yu_888yu",
            "ko": "죄송합니다, AI 서비스가 일시적으로 사용할 수 없습니다. 나중에 다시 시도하거나 @yu_888yu에 문의하세요",
            "ja": "申し訳ありませんが、AIサービスは一時的に利用できません。後でもう一度お試しいただくか、@yu_888yuにお問い合わせください",
        }
        return error_messages.get(lang, error_messages["zh-TW"]), False


def get_escalation_message(lang: str = "zh-TW", is_complaint: bool = False) -> str:
    """
    生成轉接人工客服的訊息
    """
    if is_complaint:
        messages = {
            "zh-TW": "🚨 **已標記為高優先級投訴**\n\n您的問題已轉接給人工客服，我們將優先處理。\n\n請直接聯繫：**@yu_888yu**\n\n客服工作時間：24 小時全天候服務",
            "zh-CN": "🚨 **已标记为高优先级投诉**\n\n您的问题已转接给人工客服，我们将优先处理。\n\n请直接联系：**@yu_888yu**\n\n客服工作时间：24 小时全天候服务",
            "en": "🚨 **Marked as High Priority Complaint**\n\nYour issue has been escalated to human support with priority handling.\n\nPlease contact: **@yu_888yu**\n\nAvailable: 24/7",
            "th": "🚨 **ทำเครื่องหมายเป็นการร้องเรียนความสำคัญสูง**\n\nปัญหาของคุณถูกส่งต่อไปยังฝ่ายสนับสนุนที่เป็นมนุษย์โดยมีการจัดการลำดับความสำคัญ\n\nกรุณาติดต่อ: **@yu_888yu**\n\nพร้อมให้บริการ: 24/7",
            "vi": "🚨 **Được đánh dấu là Khiếu nại Ưu tiên Cao**\n\nVấn đề của bạn đã được chuyển đến hỗ trợ con người với xử lý ưu tiên.\n\nVui lòng liên hệ: **@yu_888yu**\n\nSẵn sàng: 24/7",
            "ko": "🚨 **높은 우선순위 불만으로 표시됨**\n\n귀하의 문제가 우선 처리로 인간 지원에 에스컬레이션되었습니다.\n\n연락처: **@yu_888yu**\n\n이용 가능: 24/7",
            "ja": "🚨 **高優先度のクレームとしてマーク**\n\nお客様の問題は優先処理でサポートスタッフにエスカレーションされました。\n\nお問い合わせ先: **@yu_888yu**\n\n対応時間: 24時間365日",
        }
    else:
        messages = {
            "zh-TW": "🔄 **已轉接人工客服，請稍候**\n\n您的問題需要人工處理，我們的客服人員將盡快為您服務。\n\n您也可以直接聯繫：**@yu_888yu**\n\n⏱️ 預計等待時間：5-15 分鐘\n📞 客服工作時間：24 小時全天候",
            "zh-CN": "🔄 **已转接人工客服，请稍候**\n\n您的问题需要人工处理，我们的客服人员将尽快为您服务。\n\n您也可以直接联系：**@yu_888yu**\n\n⏱️ 预计等待时间：5-15 分钟\n📞 客服工作时间：24 小时全天候",
            "en": "🔄 **Transferred to Human Support**\n\nYour issue requires manual handling. Our support team will assist you shortly.\n\nYou can also contact directly: **@yu_888yu**\n\n⏱️ Estimated wait: 5-15 minutes\n📞 Available: 24/7",
            "th": "🔄 **โอนไปยังฝ่ายสนับสนุนที่เป็นมนุษย์**\n\nปัญหาของคุณต้องการการจัดการด้วยตนเอง ทีมสนับสนุนของเราจะช่วยเหลือคุณในไม่ช้า\n\nคุณยังสามารถติดต่อโดยตรง: **@yu_888yu**\n\n⏱️ เวลารอโดยประมาณ: 5-15 นาที\n📞 พร้อมให้บริการ: 24/7",
            "vi": "🔄 **Chuyển đến Hỗ trợ Con người**\n\nVấn đề của bạn cần xử lý thủ công. Nhóm hỗ trợ của chúng tôi sẽ hỗ trợ bạn sớm.\n\nBạn cũng có thể liên hệ trực tiếp: **@yu_888yu**\n\n⏱️ Thời gian chờ ước tính: 5-15 phút\n📞 Sẵn sàng: 24/7",
            "ko": "🔄 **인간 지원으로 전환됨**\n\n귀하의 문제는 수동 처리가 필요합니다. 지원 팀이 곧 도움을 드릴 것입니다.\n\n직접 연락할 수도 있습니다: **@yu_888yu**\n\n⏱️ 예상 대기 시간: 5-15분\n📞 이용 가능: 24/7",
            "ja": "🔄 **サポートスタッフに転送されました**\n\nお客様の問題は手動処理が必要です。サポートチームがすぐにお手伝いします。\n\n直接お問い合わせいただくこともできます: **@yu_888yu**\n\n⏱️ 予想待ち時間: 5-15分\n📞 対応時間: 24時間365日",
        }
    return messages.get(lang, messages["zh-TW"])


def clear_history(tg_id: int):
    """
    清除用戶對話歷史
    """
    if tg_id in conversation_history:
        del conversation_history[tg_id]


def get_new_user_intro(lang: str = "zh-TW") -> str:
    """
    新用戶首次進入時的介紹訊息
    """
    messages = {
        "zh-TW": """🎉 **歡迎來到 LA1 娛樂平台！**

我是 **LA1 小助手**，您的 24 小時 AI 客服 🤖

**🎁 新會員專屬首充優惠：**
• 充 **100 USDT** → 送 **38 USDT**（10倍流水）
• 充 **30 USDT** → 送 **10 USDT**（8倍流水）

**🚀 立即開始：**
👉 [打開 Mini App](https://t.me/LA1111_bot/app)

**💬 我可以幫您：**
• 查詢餘額、VIP 等級、流水進度
• 解答充值/提款問題
• 介紹所有活動優惠
• 複雜問題轉接人工客服

有任何問題直接問我吧！ 😊""",
        "zh-CN": """🎉 **欢迎来到 LA1 娱乐平台！**

我是 **LA1 小助手**，您的 24 小时 AI 客服 🤖

**🎁 新会员专属首充优惠：**
• 充 **100 USDT** → 送 **38 USDT**（10倍流水）
• 充 **30 USDT** → 送 **10 USDT**（8倍流水）

**🚀 立即开始：**
👉 [打开 Mini App](https://t.me/LA1111_bot/app)

**💬 我可以帮您：**
• 查询余额、VIP 等级、流水进度
• 解答充值/提款问题
• 介绍所有活动优惠
• 复杂问题转接人工客服

有任何问题直接问我吧！ 😊""",
        "en": """🎉 **Welcome to LA1 Entertainment Platform!**

I'm **LA1 Assistant**, your 24/7 AI customer service 🤖

**🎁 New Member First Deposit Bonus:**
• Deposit **100 USDT** → Get **38 USDT** (10x turnover)
• Deposit **30 USDT** → Get **10 USDT** (8x turnover)

**🚀 Get Started:**
👉 [Open Mini App](https://t.me/LA1111_bot/app)

**💬 I can help you with:**
• Check balance, VIP level, turnover progress
• Answer deposit/withdrawal questions
• Introduce all promotions
• Escalate complex issues to human support

Feel free to ask me anything! 😊""",
        "th": """🎉 **ยินดีต้อนรับสู่แพลตฟอร์ม LA1!**

ฉันคือ **LA1 Assistant** บริการลูกค้า AI 24/7 ของคุณ 🤖

**🎁 โบนัสฝากเงินครั้งแรกสำหรับสมาชิกใหม่:**
• ฝาก **100 USDT** → รับ **38 USDT** (หมุนเวียน 10 เท่า)
• ฝาก **30 USDT** → รับ **10 USDT** (หมุนเวียน 8 เท่า)

**🚀 เริ่มต้น:**
👉 [เปิด Mini App](https://t.me/LA1111_bot/app)

**💬 ฉันสามารถช่วยคุณได้:**
• ตรวจสอบยอดเงิน ระดับ VIP ความคืบหน้าการหมุนเวียน
• ตอบคำถามเกี่ยวกับการฝาก/ถอนเงิน
• แนะนำโปรโมชั่นทั้งหมด
• ส่งต่อปัญหาที่ซับซ้อนไปยังฝ่ายสนับสนุน

ถามฉันได้เลย! 😊""",
        "vi": """🎉 **Chào mừng đến với Nền tảng LA1!**

Tôi là **LA1 Assistant**, dịch vụ khách hàng AI 24/7 của bạn 🤖

**🎁 Thưởng nạp lần đầu cho thành viên mới:**
• Nạp **100 USDT** → Nhận **38 USDT** (doanh thu 10x)
• Nạp **30 USDT** → Nhận **10 USDT** (doanh thu 8x)

**🚀 Bắt đầu:**
👉 [Mở Mini App](https://t.me/LA1111_bot/app)

**💬 Tôi có thể giúp bạn:**
• Kiểm tra số dư, cấp VIP, tiến độ doanh thu
• Trả lời câu hỏi về nạp/rút tiền
• Giới thiệu tất cả khuyến mãi
• Chuyển vấn đề phức tạp đến hỗ trợ con người

Hãy hỏi tôi bất cứ điều gì! 😊""",
        "ko": """🎉 **LA1 엔터테인먼트 플랫폼에 오신 것을 환영합니다!**

저는 **LA1 어시스턴트**, 24/7 AI 고객 서비스입니다 🤖

**🎁 신규 회원 첫 입금 보너스:**
• **100 USDT** 입금 → **38 USDT** 받기 (10배 롤오버)
• **30 USDT** 입금 → **10 USDT** 받기 (8배 롤오버)

**🚀 시작하기:**
👉 [Mini App 열기](https://t.me/LA1111_bot/app)

**💬 도움드릴 수 있는 것:**
• 잔액, VIP 등급, 롤오버 진행률 확인
• 입금/출금 질문 답변
• 모든 프로모션 소개
• 복잡한 문제는 인간 지원으로 에스컬레이션

무엇이든 물어보세요! 😊""",
        "ja": """🎉 **LA1エンターテインメントプラットフォームへようこそ！**

私は **LA1アシスタント**、24時間365日のAIカスタマーサービスです 🤖

**🎁 新規会員初回入金ボーナス:**
• **100 USDT** 入金 → **38 USDT** 獲得 (10倍ロールオーバー)
• **30 USDT** 入金 → **10 USDT** 獲得 (8倍ロールオーバー)

**🚀 始めましょう:**
👉 [Mini Appを開く](https://t.me/LA1111_bot/app)

**💬 お手伝いできること:**
• 残高、VIPレベル、ロールオーバー進捗の確認
• 入金/出金に関する質問への回答
• すべてのプロモーションのご紹介
• 複雑な問題はサポートスタッフにエスカレーション

何でもお気軽にお聞きください！ 😊""",
    }
    return messages.get(lang, messages["zh-TW"])
