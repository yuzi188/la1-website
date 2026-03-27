const state = {}

function getState(uid) {
  return state[uid] || {}
}

function setState(uid, data) {
  state[uid] = data
}

function clearState(uid) {
  delete state[uid]
}

function handleFlow(uid, msg) {
  const s = getState(uid)

  if (s.step === "deposit_check") {
    if (msg.includes("已完成")) {
      clearState(uid)
      return "已幫你查詢入帳，請稍等1-3分鐘"
    }
    return "請輸入「已完成」確認"
  }

  return null
}

module.exports = { getState, setState, handleFlow }
