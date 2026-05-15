import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { PostHogProvider } from '@/providers/PostHogProvider'

export const metadata: Metadata = {
  title: 'KRUX — East Africa\'s Trade Standard',
  description: 'East Africa\'s trade standard. Identity, record, and intelligence for every importer, clearing agent, and freight forwarder.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <PostHogProvider>
          {children}
        </PostHogProvider>

        {clarityId && (
          <Script
            id="clarity"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${clarityId}");`,
            }}
          />
        )}
      </body>
    </html>
  )
}
