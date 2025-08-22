import './globals.css'
import { Inter } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SEC Filing Analyzer',
  description: 'AI-powered SEC filing analysis tool',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={inter.className}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}