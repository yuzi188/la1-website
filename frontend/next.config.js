// Build v4.0 - Added Texas Hold'em Poker game
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_POKER_SERVER_URL: process.env.NEXT_PUBLIC_POKER_SERVER_URL || 'http://localhost:4000',
    NEXT_PUBLIC_POKER_SERVER_WS:  process.env.NEXT_PUBLIC_POKER_SERVER_WS  || 'http://localhost:4000',
  },
};

module.exports = nextConfig;
