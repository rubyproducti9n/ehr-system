'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function TopProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  // Trigger loading animation on navigation start
  const startLoading = () => {
    setVisible(true)
    setProgress(25)

    setTimeout(() => {
      setProgress((prev) => (prev < 65 ? 65 : prev))
    }, 150)

    setTimeout(() => {
      setProgress((prev) => (prev < 85 ? 85 : prev))
    }, 350)
  }

  // Intercept click on <a> links to immediately start progress bar before Next.js page loads
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      const targetAttr = target.getAttribute('target')
      const download = target.getAttribute('download')

      // Ignore external links, downloads, new tabs, anchors, or same URL clicks
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        download ||
        targetAttr === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }

      try {
        const targetUrl = new URL(href, window.location.origin)
        const currentUrl = new URL(window.location.href)

        // Only start if navigating to internal route and it's a different path/search
        if (
          targetUrl.origin === currentUrl.origin &&
          (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search)
        ) {
          startLoading()
        }
      } catch {
        // Invalid URL, ignore
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [])

  // When route or searchParams changes, complete and dismiss the progress bar
  useEffect(() => {
    if (visible) {
      setProgress(100)
      const timer = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams])

  if (!visible && progress === 0) return null

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 shadow-[0_0_10px_#ef4444,0_0_5px_#ef4444] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  )
}
