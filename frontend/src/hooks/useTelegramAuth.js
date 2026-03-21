"use client";
import { useState, useEffect } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";

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

        try {
          // Send initData to backend for verification.
          // Also forward any stored referral code so new TG users can be
          // linked to a referrer on their first login.
          const storedRef = localStorage.getItem("la1_ref") || "";
          const res = await fetch(`${BACKEND}/tg-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              initData: tg.initData,
              ...(storedRef ? { referral: storedRef } : {}),
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
