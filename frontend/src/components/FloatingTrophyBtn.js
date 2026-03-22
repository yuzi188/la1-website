"use client";
import { usePathname } from "next/navigation";

// Hide the floating trophy FAB on the poker table page so it doesn't
// overlap the 全押 action button.
const HIDDEN_PATHS = ["/game/poker/table"];

export default function FloatingTrophyBtn() {
  const pathname = usePathname();

  // Hide on any path that starts with a hidden prefix
  if (HIDDEN_PATHS.some(p => pathname?.startsWith(p))) return null;

  return (
    <a href="/activity" style={{
      position: "fixed",
      right: "16px",
      bottom: "90px",
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #FFD700, #FFA500)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "24px",
      boxShadow: "0 4px 20px rgba(255, 215, 0, 0.4)",
      zIndex: 900,
      cursor: "pointer",
      animation: "float 3s ease-in-out infinite",
      textDecoration: "none",
    }}>
      🏆
      <div style={{
        position: "absolute",
        top: "-5px",
        right: "-5px",
        background: "#ff4444",
        color: "#fff",
        fontSize: "10px",
        padding: "2px 6px",
        borderRadius: "10px",
        fontWeight: "bold",
        border: "2px solid #000",
        whiteSpace: "nowrap",
      }}>NEW</div>
    </a>
  );
}
