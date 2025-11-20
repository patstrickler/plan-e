import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Plan-E - Project Planning Tool',
  description: 'A work planning tool that helps organize projects, tasks, and getting things done',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}

