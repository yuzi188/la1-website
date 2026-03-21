"use client";
import { useState, useEffect } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";

/**
 * Resolve the referral code from all possible sources, in priority order:
 *  1. Telegram start_param  (e.g. "ref_LA1XXXXX" → "LA1XXXXX")
 *     Set when the bot link is  t.me/LA1111_bot?start=ref_CODE
 *  2. URL query string  ?ref=LA1XXXXX
 *     Set when the direct web referral link is opened
 *  3. Previously stored value in localStorage
 *
 * The resolved code is persisted to localStorage immediately so it survives
 * navigation and is available to every page.
 */
function resolveRefCode(tg) {
  // 1. Telegram Mini App start_param
  const startParam = tg?.initDataUnsafe?.start_param || "";
  if (startParam) {
    // Strip optional "ref_" prefix that the bot prepends
    const code = startParam.startsWith("ref_") ? startParam.slice(4) : startParam;
    if (code) {
      localStorage.setItem("la1_ref", code);
      return code;
    }
  }

  // 2. URL query string  ?ref=CODE
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get("ref");
    if (urlRef) {
      localStorage.setItem("la1_ref", urlRef);
      return urlRef;
    }
  }

  // 3. Previously stored value (user navigated away and came back)
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("la1_ref");
    if (stored) return stored;
  }

  return "";
}

export function useTelegramAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTgEnv, setIsTgEnv] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const init = async () => {
      // Check if running inside Telegram Web App
      const tg = typeof window !== "undefined" && window.Telegram?.WebApp;

      if (tg && tg.initData && tg.initData.length > 0) {
        // --- Telegram environment ---
        setIsTgEnv(true);
        tg.ready();
        tg.expand();

        // Apply Telegram theme colors
        tg.setHeaderColor("#000000");
        tg.setBackgroundColor("#000000");

        // Resolve referral code BEFORE calling the backend so it is included
        // in the /tg-login request. This handles both Telegram start_param
        // (bot deep-links) and ?ref= URL query strings (direct web links).
        const refCode = resolveRefCode(tg);

        try {
          const res = await fetch(`${BACKEND}/tg-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              initData: tg.initData,
              ...(refCode ? { referral: refCode } : {}),
            }),
          });
          const data = await res.json();

          if (data.token) {
            localStorage.setItem("la1_token", data.token);
            localStorage.setItem("la1_user", JSON.stringify(data.user));
            // Clear the referral code after a successful login so it isn't
            // reused if the same browser registers another account later.
            if (data.referral_linked) {
              localStorage.removeItem("la1_ref");
            }
            setToken(data.token);
            setUser(data.user);
          } else {
            // Fallback: use TG user info directly (no backend validation)
            const tgUser = tg.initDataUnsafe?.user;
            if (tgUser) {
              const fallbackUser = {
                username: tgUser.username || tgUser.first_name || `tg_${tgUser.id}`,
                tg_id: tgUser.id,
                first_name: tgUser.first_name,
                last_name: tgUser.last_name || "",
                balance: 0,
                vip: "一般會員",
              };
              localStorage.setItem("la1_user", JSON.stringify(fallbackUser));
              setUser(fallbackUser);
            }
          }
        } catch (err) {
          // Backend unavailable — use TG user info directly
          const tgUser = tg.initDataUnsafe?.user;
          if (tgUser) {
            const fallbackUser = {
              username: tgUser.username || tgUser.first_name || `tg_${tgUser.id}`,
              tg_id: tgUser.id,
              first_name: tgUser.first_name,
              balance: 0,
              vip: "一般會員",
            };
            localStorage.setItem("la1_user", JSON.stringify(fallbackUser));
            setUser(fallbackUser);
          }
        }
      } else {
        // --- Non-Telegram environment (browser) ---
        setIsTgEnv(false);

        // Still capture ?ref= from URL so it is ready for manual registration
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const urlRef = params.get("ref");
          if (urlRef) {
            localStorage.setItem("la1_ref", urlRef);
          }
        }

        const stored = localStorage.getItem("la1_user");
        const storedToken = localStorage.getItem("la1_token");
        if (stored) {
          setUser(JSON.parse(stored));
          setToken(storedToken);
        }
      }

      setLoading(false);
    };

    init();
  }, []);

  const logout = () => {
    localStorage.removeItem("la1_user");
    localStorage.removeItem("la1_token");
    setUser(null);
    setToken(null);
  };

  return { user, loading, isTgEnv, token, logout };
}
