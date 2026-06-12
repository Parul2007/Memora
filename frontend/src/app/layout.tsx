import './globals.css';
import { AuthProvider } from '../lib/AuthContext';
import TopBar from '../components/TopBar';
import GlobalReactivity from '../components/GlobalReactivity';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Memora',
  description: 'Your mind deserves a place that feels safe.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />
      </head>
      <body suppressHydrationWarning style={{ backgroundColor: '#fdfbf7', margin: 0, padding: 0, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
        <AuthProvider>
          <GlobalReactivity />
          <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#fdfbf7]">
            <div className="flex-shrink-0">
              <TopBar />
            </div>
            <main className="flex-1 min-h-0 overflow-y-auto relative bg-[#FAFAF9]">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
