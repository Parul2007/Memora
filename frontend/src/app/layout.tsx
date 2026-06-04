import './globals.css';
import { AuthProvider } from '../lib/AuthContext';
import TopBar from '../components/TopBar';

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
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />
      </head>
      <body style={{ backgroundColor: '#fdfbf7', margin: 0, padding: 0, fontFamily: 'Inter, sans-serif' }}>
        <AuthProvider>
          <TopBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
