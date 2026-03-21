import React, { useState, useEffect } from "react";

export default function AdminWithdrawalPanel() {
  const [token, setToken] = useState("");
  const [tab, setTab] = useState("pending"); // pending, approved, rejected, risk
  const [withdrawals, setWithdrawals] = useState([]);
  const [riskAlerts, setRiskAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  // Review modal state
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState("approve"); // approve, reject
  const [reviewTxHash, setReviewTxHash] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("admin_token");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (token) {
      if (tab === "risk") {
        fetchRiskAlerts();
      } else {
        fetchWithdrawals();
      }
    }
  }, [tab, token]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/withdrawal/admin/list?status=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setWithdrawals(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch withdrawals:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/withdrawal/admin/risk-alerts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setRiskAlerts(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch risk alerts:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/withdrawal/admin/detail/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setDetailData(data);
      }
    } catch (e) {
      console.error("Failed to fetch detail:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReview = async () => {
    if (reviewAction === "reject" && !reviewReason.trim()) {
      alert("請填寫拒絕原因");
      return;
    }

    try {
      setReviewLoading(true);
      const endpoint = reviewAction === "approve" ? "/api/withdrawal/admin/approve" : "/api/withdrawal/admin/reject";
      const body = reviewAction === "approve" ? { id: selectedWithdrawal.id, tx_hash: reviewTxHash } : { id: selectedWithdrawal.id, reason: reviewReason };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        alert("操作成功");
        setReviewModal(false);
        setSelectedWithdrawal(null);
        fetchWithdrawals();
      } else {
        alert(data.error || "操作失敗");
      }
    } catch (e) {
      alert("網路錯誤");
    } finally {
      setReviewLoading(false);
    }
  };

  const getRiskBadge = (level) => {
    const badges = {
      低: "bg-green-100 text-green-800",
      中: "bg-yellow-100 text-yellow-800",
      高: "bg-red-100 text-red-800",
    };
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${badges[level] || badges["低"]}`}>{level}風險</span>;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      completed: "bg-green-100 text-green-800",
    };
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${badges[status] || badges.pending}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 提款審核面板</h1>
          <p className="text-gray-600">管理所有提款申請與風控預警</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg shadow p-2">
          {["pending", "approved", "rejected", "risk"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded font-semibold transition ${
                tab === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t === "pending" && "⏳ 待審核"}
              {t === "approved" && "✅ 已批准"}
              {t === "rejected" && "❌ 已拒絕"}
              {t === "risk" && "⚠️ 風控預警"}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "risk" ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">加載中...</div>
            ) : riskAlerts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">用戶</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">風險類型</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">風險等級</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">詳情</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {riskAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{alert.username}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{alert.type}</td>
                        <td className="px-6 py-4 text-sm">{getRiskBadge(alert.level)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{alert.detail}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(alert.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">暫無風控預警</div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Withdrawal List */}
            <div className="col-span-2 bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">加載中...</div>
              ) : withdrawals.length > 0 ? (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">用戶</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">金額</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">網路</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">時間</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {withdrawals.map((w) => (
                        <tr key={w.id} className={`hover:bg-gray-50 cursor-pointer ${selectedWithdrawal?.id === w.id ? "bg-blue-50" : ""}`}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{w.username}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">${w.amount?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{w.network}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(w.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => {
                                setSelectedWithdrawal(w);
                                fetchDetail(w.id);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              查看詳情
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">暫無記錄</div>
              )}
            </div>

            {/* Detail Panel */}
            <div className="bg-white rounded-lg shadow p-6 h-fit">
              {selectedWithdrawal ? (
                detailLoading ? (
                  <div className="text-center py-8">加載中...</div>
                ) : detailData ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">用戶信息</p>
                      <p className="text-lg font-bold text-gray-900">{detailData.withdrawal.username}</p>
                      <p className="text-sm text-gray-600">TG: {detailData.withdrawal.tg_username}</p>
                      <p className="text-sm text-gray-600">餘額: ${detailData.withdrawal.balance?.toFixed(2)}</p>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-xs text-gray-500 uppercase font-semibold">提款詳情</p>
                      <p className="text-lg font-bold text-gray-900">${detailData.withdrawal.amount?.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{detailData.withdrawal.network}</p>
                      <p className="text-xs text-gray-500 break-all">{detailData.withdrawal.wallet_address}</p>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-xs text-gray-500 uppercase font-semibold">流水狀況</p>
                      <p className={`text-sm font-semibold ${detailData.withdrawal.wager_requirement <= 0 ? "text-green-600" : "text-red-600"}`}>
                        {detailData.withdrawal.wager_requirement <= 0 ? "✅ 已達標" : `❌ 還差 $${detailData.withdrawal.wager_requirement?.toFixed(2)}`}
                      </p>
                    </div>

                    {detailData.alerts && detailData.alerts.length > 0 && (
                      <div className="border-t pt-4">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">風控預警</p>
                        <div className="space-y-1">
                          {detailData.alerts.map((a) => (
                            <div key={a.id} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                              <p className="font-semibold text-red-700">{a.type}</p>
                              <p className="text-red-600">{a.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tab === "pending" && (
                      <div className="border-t pt-4 space-y-2">
                        <button
                          onClick={() => {
                            setReviewAction("approve");
                            setReviewModal(true);
                          }}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded"
                        >
                          ✅ 批准
                        </button>
                        <button
                          onClick={() => {
                            setReviewAction("reject");
                            setReviewModal(true);
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded"
                        >
                          ❌ 拒絕
                        </button>
                      </div>
                    )}
                  </div>
                ) : null
              ) : (
                <div className="text-center py-8 text-gray-500">選擇一筆提款查看詳情</div>
              )}
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{reviewAction === "approve" ? "批准提款" : "拒絕提款"}</h2>

              {reviewAction === "approve" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">交易哈希 (可選)</label>
                    <input
                      type="text"
                      value={reviewTxHash}
                      onChange={(e) => setReviewTxHash(e.target.value)}
                      placeholder="輸入交易哈希..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">拒絕原因 *</label>
                    <textarea
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder="請填寫拒絕原因..."
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setReviewModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400"
                >
                  取消
                </button>
                <button
                  onClick={handleReview}
                  disabled={reviewLoading}
                  className={`flex-1 px-4 py-2 ${reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white font-semibold rounded-lg disabled:opacity-50`}
                >
                  {reviewLoading ? "處理中..." : "確認"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
