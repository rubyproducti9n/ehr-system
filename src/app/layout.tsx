import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Lato } from 'next/font/google'
import { Suspense } from 'react'
import { TopProgressBar } from '@/components/layout/TopProgressBar'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})
const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-lato',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'My Aarogyam',
  description: 'Next-Generation AI-Powered Electronic Health Records Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lato.variable} antialiased min-h-screen font-sans`}
      >
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
