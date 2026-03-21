import './globals.css'
import { LanguageProvider } from '../i18n/LanguageContext'
import BottomNav from '../components/BottomNav'

export const metadata = {
  title: 'LA1 AI 娛樂平台 | 信任 · 快速 · 頂級',
  description: 'LA1 AI 娛樂平台提供最頂級的遊戲體驗，包括老虎機、輪盤、百家樂及 AI 智能遊戲。',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <head>
        {/* Telegram Web App SDK */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
        {/* Noto Sans for multi-language support */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700;800;900&family=Noto+Sans+TC:wght@400;600;700;800;900&family=Noto+Sans+SC:wght@400;600;700;800;900&family=Noto+Sans+JP:wght@400;600;700;800;900&family=Noto+Sans+KR:wght@400;600;700;800;900&family=Noto+Sans+Thai:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="no-scrollbar">
        <LanguageProvider>
          <main style={{ minHeight: '100vh', paddingBottom: '80px' }}>
            {children}
          </main>
          <BottomNav />
          <a href="/activity" style={{
            position: 'fixed',
            right: '16px',
            bottom: '90px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)',
            zIndex: 900,
            cursor: 'pointer',
            animation: 'float 3s ease-in-out infinite',
            textDecoration: 'none',
          }}>
            🏆
            <div style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#ff4444',
              color: '#fff',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: 'bold',
              border: '2px solid #000',
              whiteSpace: 'nowrap',
            }}>NEW</div>
          </a>
        </LanguageProvider>
      </body>
    </html>
  )
}
