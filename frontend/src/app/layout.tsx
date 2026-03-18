import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import CursorEffects from '@/components/CursorEffects'

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'RepoMind – AI-Powered Codebase Understanding',
  description: 'Understand any GitHub repository in minutes. AI-generated architecture diagrams, workflow analysis, and interactive Q&A.',
  keywords: ['codebase analysis', 'developer onboarding', 'AI', 'GitHub', 'architecture diagrams'],
  openGraph: {
    title: 'RepoMind',
    description: 'Understand any codebase in minutes with AI',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-background`}>
        <CursorEffects />
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          richColors
          closeButton
        />
      </body>
    </html>
  )
}
