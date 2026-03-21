/**
 * LA1 Sports API Configuration
 * ─────────────────────────────────────────────────────────────
 * This module defines the vendor integration slots for the Sports category.
 * When a vendor is ready to go live, simply fill in the API configuration
 * below and set `enabled: true`. The front-end game cards will automatically
 * switch from "Coming Soon" to the live game entry.
 *
 * Supported vendors:
 *   - SBOBET (Sports Betting)
 *   - CMD368 (Sports Betting)
 *   - Saba Sports (Sports Betting)
 *   - TF Gaming (Esports)
 *   - Virtual Horse Racing (Virtual Sports)
 *   - Virtual Car Racing (Virtual Sports)
 */

const SPORTS_API_CONFIG = {
  // ── Sports Betting Vendors ──────────────────────────────────
  sbobet: {
    enabled: false,
    vendorName: "SBOBET",
    category: "sportsBetting",
    apiBaseUrl: "",          // e.g. "https://api.sbobet.com/v1"
    apiKey: "",              // Vendor-provided API key
    secretKey: "",           // Vendor-provided secret key
    merchantId: "",          // LA1 merchant ID at vendor
    currency: "USDT",       // Default currency
    language: "zh-TW",      // Default language code
    launchUrl: "",           // Game launch URL template
    callbackUrl: "",         // Bet result callback URL
    endpoints: {
      login: "/auth/login",
      getBalance: "/player/balance",
      placeBet: "/bet/place",
      getBetHistory: "/bet/history",
      transfer: "/wallet/transfer",
    },
  },

  cmd368: {
    enabled: false,
    vendorName: "CMD368",
    category: "sportsBetting",
    apiBaseUrl: "",
    apiKey: "",
    secretKey: "",
    merchantId: "",
    currency: "USDT",
    language: "zh-TW",
    launchUrl: "",
    callbackUrl: "",
    endpoints: {
      login: "/auth/login",
      getBalance: "/player/balance",
      placeBet: "/bet/place",
      getBetHistory: "/bet/history",
      transfer: "/wallet/transfer",
    },
  },

  sabaSports: {
    enabled: false,
    vendorName: "Saba Sports",
    category: "sportsBetting",
    apiBaseUrl: "",
    apiKey: "",
    secretKey: "",
    merchantId: "",
    currency: "USDT",
    language: "zh-TW",
    launchUrl: "",
    callbackUrl: "",
    endpoints: {
      login: "/auth/login",
      getBalance: "/player/balance",
      placeBet: "/bet/place",
      getBetHistory: "/bet/history",
      transfer: "/wallet/transfer",
    },
  },

  // ── Esports Vendors ─────────────────────────────────────────
  tfGaming: {
    enabled: false,
    vendorName: "TF Gaming",
    category: "esports",
    apiBaseUrl: "",
    apiKey: "",
    secretKey: "",
    merchantId: "",
    currency: "USDT",
    language: "zh-TW",
    launchUrl: "",
    callbackUrl: "",
    endpoints: {
      login: "/auth/login",
      getBalance: "/player/balance",
      placeBet: "/bet/place",
      getBetHistory: "/bet/history",
      transfer: "/wallet/transfer",
    },
  },

  // ── Virtual Sports Vendors ──────────────────────────────────
  virtualHorse: {
    enabled: false,
    vendorName: "Virtual Horse Racing",
    category: "virtualSports",
    apiBaseUrl: "",
    apiKey: "",
    secretKey: "",
    merchantId: "",
    currency: "USDT",
    language: "zh-TW",
    launchUrl: "",
    callbackUrl: "",
    endpoints: {
      login: "/auth/login",
      getBalance: "/player/balance",
      placeBet: "/bet/place",
      getBetHistory: "/bet/history",
      transfer: "/wallet/transfer",
    },
  },

  virtualRacing: {
    enabled: false,
    vendorName: "Virtual Car Racing",
    category: "virtualSports",
    apiBaseUrl: "",
    apiKey: "",
    secretKey: "",
    merchantId: "",
    currency: "USDT",
    language: "zh-TW",
    launchUrl: "",
    callbackUrl: "",
    endpoints: {
      login: "/auth/login",
      getBalance: "/player/balance",
      placeBet: "/bet/place",
      getBetHistory: "/bet/history",
      transfer: "/wallet/transfer",
    },
  },
};

/**
 * Check if a specific vendor is enabled and ready for launch.
 * @param {string} vendorKey - One of the keys in SPORTS_API_CONFIG
 * @returns {boolean}
 */
export function isVendorEnabled(vendorKey) {
  const config = SPORTS_API_CONFIG[vendorKey];
  return config?.enabled === true && !!config.apiBaseUrl && !!config.apiKey;
}

/**
 * Get the launch URL for a specific vendor.
 * Returns null if the vendor is not enabled.
 * @param {string} vendorKey
 * @returns {string|null}
 */
export function getVendorLaunchUrl(vendorKey) {
  if (!isVendorEnabled(vendorKey)) return null;
  return SPORTS_API_CONFIG[vendorKey].launchUrl || null;
}

/**
 * Get all vendors for a given category.
 * @param {string} category - "sportsBetting" | "esports" | "virtualSports"
 * @returns {Array<{key: string, config: object}>}
 */
export function getVendorsByCategory(category) {
  return Object.entries(SPORTS_API_CONFIG)
    .filter(([, config]) => config.category === category)
    .map(([key, config]) => ({ key, config }));
}

export default SPORTS_API_CONFIG;
