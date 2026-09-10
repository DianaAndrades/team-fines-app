import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Team Fines',
    template: '%s · Team Fines',
  },
  description: 'Team rules, fines, deadlines and payments in one place.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  )
}
