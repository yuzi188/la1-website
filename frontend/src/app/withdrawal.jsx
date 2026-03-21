import React, { useState, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";

export default function WithdrawalPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("apply"); // apply, history, bind
  const [token, setToken] = useState("");
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Bind wallet state
  const [bindNetwork, setBindNetwork] = useState("TRC20");
  const [bindAddress, setBindAddress] = useState("");
  const [bindError, setBindError] = useState("");
  const [bindLoading, setBindLoading] = useState(false);

  // Withdrawal apply state
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("TRC20");
  const [applyError, setApplyError] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (token && tab === "apply") {
      fetchInfo();
    }
    if (token && tab === "history") {
      fetchHistory();
    }
  }, [tab, token]);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/withdrawal/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setInfo(data);
        setError("");
      } else {
        setError(data.error || "查詢失敗");
      }
    } catch (e) {
      setError("網路錯誤");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/withdrawal/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error("Failed to fetch history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleBindWallet = async (e) => {
    e.preventDefault();
    if (!bindAddress.trim()) {
      setBindError("請輸入USDT地址");
      return;
    }

    try {
      setBindLoading(true);
      setBindError("");
      const res = await fetch("/api/withdrawal/bind-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          network: bindNetwork,
          usdt_address: bindAddress.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(`${bindNetwork} 地址已永久綁定！`);
        setBindAddress("");
        setTimeout(() => {
          setTab("apply");
          fetchInfo();
        }, 1500);
      } else {
        setBindError(data.error || "綁定失敗");
      }
    } catch (e) {
      setBindError("網路錯誤");
    } finally {
      setBindLoading(false);
    }
  };

  const handleApplyWithdraw = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setApplyError("請輸入提款金額");
      return;
    }

    try {
      setApplyLoading(true);
      setApplyError("");
      const res = await fetch("/api/withdrawal/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          network,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess("提款申請已提交！");
        setAmount("");
        setTimeout(() => {
          fetchInfo();
          fetchHistory();
        }, 1000);
      } else {
        setApplyError(data.error || "申請失敗");
        if (data.need_bind) {
          setTab("bind");
        }
      }
    } catch (e) {
      setApplyError("網路錯誤");
    } finally {
      setApplyLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: "待審核", color: "bg-yellow-100 text-yellow-800" },
      approved: { text: "已批准", color: "bg-blue-100 text-blue-800" },
      completed: { text: "已完成", color: "bg-green-100 text-green-800" },
      rejected: { text: "已拒絕", color: "bg-red-100 text-red-800" },
    };
    const badge = badges[status] || badges.pending;
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>{badge.text}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">💸 提款中心</h1>
          <p className="text-slate-400">安全、快速、便捷的提款服務</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-900 text-red-100 rounded-lg border border-red-700">
            <p className="font-semibold">❌ {error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-900 text-green-100 rounded-lg border border-green-700">
            <p className="font-semibold">✅ {success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          <button
            onClick={() => setTab("apply")}
            className={`px-4 py-3 font-semibold transition ${
              tab === "apply"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            📤 申請提款
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-3 font-semibold transition ${
              tab === "history"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            📋 提款記錄
          </button>
          <button
            onClick={() => setTab("bind")}
            className={`px-4 py-3 font-semibold transition ${
              tab === "bind"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            🔗 綁定地址
          </button>
        </div>

        {/* Tab Content */}
        {tab === "apply" && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <p className="text-slate-400 mt-2">加載中...</p>
              </div>
            ) : info ? (
              <>
                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-700 rounded p-4">
                    <p className="text-slate-400 text-sm">當前餘額</p>
                    <p className="text-2xl font-bold text-green-400">${info.balance?.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-700 rounded p-4">
                    <p className="text-slate-400 text-sm">今日剩餘次數</p>
                    <p className="text-2xl font-bold text-blue-400">{info.daily_remaining_count}</p>
                  </div>
                  <div className="bg-slate-700 rounded p-4">
                    <p className="text-slate-400 text-sm">今日剩餘額度</p>
                    <p className="text-2xl font-bold text-purple-400">${info.daily_remaining_amount?.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-700 rounded p-4">
                    <p className="text-slate-400 text-sm">流水要求</p>
                    <p className={`text-2xl font-bold ${info.wager_requirement <= 0 ? "text-green-400" : "text-yellow-400"}`}>
                      {info.wager_requirement <= 0 ? "✅ 達標" : `$${info.wager_requirement?.toFixed(2)}`}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                {info.is_cooling && (
                  <div className="mb-6 p-4 bg-yellow-900 text-yellow-100 rounded-lg border border-yellow-700">
                    <p className="font-semibold">⏳ 新帳號冷卻期</p>
                    <p className="text-sm">您的帳號需在 {new Date(info.cooldown_end).toLocaleString()} 後才能提款</p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleApplyWithdraw} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-2">提款金額 (USDT)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={info.limits?.min}
                      max={Math.min(info.limits?.max_single, info.daily_remaining_amount)}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`最低 ${info.limits?.min}, 最高 ${info.limits?.max_single}`}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      提款範圍：${info.limits?.min} - ${Math.min(info.limits?.max_single, info.daily_remaining_amount)?.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-2">提款網路</label>
                    <select
                      value={network}
                      onChange={(e) => setNetwork(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-400"
                    >
                      <option value="TRC20">TRC20 (Tron)</option>
                      <option value="ERC20">ERC20 (Ethereum)</option>
                    </select>
                  </div>

                  {info.wallets && info.wallets.length > 0 && (
                    <div className="p-3 bg-slate-700 rounded border border-slate-600">
                      <p className="text-sm text-slate-300">
                        💾 已綁定 {network} 地址：<br />
                        <code className="text-xs text-green-400 break-all">{info.wallets.find((w) => w.network === network)?.usdt_address}</code>
                      </p>
                    </div>
                  )}

                  {applyError && <p className="text-red-400 text-sm">{applyError}</p>}

                  <button
                    type="submit"
                    disabled={applyLoading || info.is_cooling}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-3 rounded-lg transition"
                  >
                    {applyLoading ? "處理中..." : "提交提款申請"}
                  </button>
                </form>

                {/* SOP */}
                <div className="mt-6 p-4 bg-slate-700 rounded border border-slate-600">
                  <p className="text-slate-300 font-semibold mb-2">📋 提款審核 SOP</p>
                  <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                    <li>確認玩家身份與帳號信息</li>
                    <li>檢查流水要求是否達標</li>
                    <li>查看遊戲紀錄，確認下注無異常</li>
                    <li>確認存款來源正常</li>
                    <li>審核通過 → 手動打款到玩家地址</li>
                    <li>異常情況 → 拒絕並填寫原因</li>
                  </ol>
                </div>
              </>
            ) : null}
          </div>
        )}

        {tab === "history" && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {history.map((item) => (
                  <div key={item.id} className="bg-slate-700 rounded p-4 border border-slate-600">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-semibold">${item.amount?.toFixed(2)} USDT</p>
                        <p className="text-xs text-slate-400">{item.network}</p>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-xs text-slate-400 break-all mb-2">{item.wallet_address}</p>
                    <p className="text-xs text-slate-500">申請時間：{new Date(item.created_at).toLocaleString()}</p>
                    {item.reject_reason && <p className="text-xs text-red-400 mt-1">拒絕原因：{item.reject_reason}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">暫無提款記錄</p>
            )}
          </div>
        )}

        {tab === "bind" && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="mb-6 p-4 bg-red-900 text-red-100 rounded-lg border border-red-700">
              <p className="font-bold mb-2">⚠️ 重要提示</p>
              <p className="text-sm">
                USDT 地址綁定後<strong>無法更改或解綁</strong>，請務必確認地址正確無誤後再綁定。綁定錯誤地址將導致提款資金丟失，平台不承擔責任。
              </p>
            </div>

            {info?.wallets && info.wallets.length > 0 && (
              <div className="mb-6 p-4 bg-green-900 text-green-100 rounded-lg border border-green-700">
                <p className="font-semibold mb-2">✅ 已綁定的地址</p>
                {info.wallets.map((w) => (
                  <div key={w.network} className="text-sm mb-2">
                    <p className="font-semibold">{w.network}</p>
                    <code className="text-xs break-all">{w.usdt_address}</code>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleBindWallet} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">選擇網路</label>
                <select
                  value={bindNetwork}
                  onChange={(e) => setBindNetwork(e.target.value)}
                  disabled={info?.wallets?.some((w) => w.network === bindNetwork)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-400 disabled:opacity-50"
                >
                  <option value="TRC20">TRC20 (Tron)</option>
                  <option value="ERC20">ERC20 (Ethereum)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">USDT 錢包地址</label>
                <input
                  type="text"
                  value={bindAddress}
                  onChange={(e) => setBindAddress(e.target.value)}
                  placeholder={bindNetwork === "TRC20" ? "T開頭，34位字元" : "0x開頭，42位字元"}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              {bindError && <p className="text-red-400 text-sm">{bindError}</p>}

              <button
                type="submit"
                disabled={bindLoading || info?.wallets?.some((w) => w.network === bindNetwork)}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-3 rounded-lg transition"
              >
                {bindLoading ? "綁定中..." : "永久綁定此地址"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
