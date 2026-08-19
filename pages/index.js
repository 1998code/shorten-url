import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function Home() {

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [qrDialog, setQrDialog] = useState({ isOpen: false, url: '', qrCode: '' })
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [containerWidth, setContainerWidth] = useState(null)
  const [containerHeight, setContainerHeight] = useState(null)
  const [isResizing, setIsResizing] = useState(false)
  const [copiedKey, setCopiedKey] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const copyTimer = useRef(null)

  // Random hero image for empty state based on theme
  const getRandomEmptyBg = (darkMode) => {
    const lightImages = ["img/cloud_light.jpg", "img/wall_light.jpg", "img/color_light.jpg"]
    const darkImages = ["img/city_dark.jpg", "img/cityNight_dark.jpeg"]
    const images = darkMode ? darkImages : lightImages
    return images[Math.floor(Math.random() * images.length)]
  }
  // Seeded deterministically so SSR and the first client render agree;
  // useEffect swaps in a random theme-appropriate image after mount.
  const [emptyBg, setEmptyBg] = useState('img/cloud_light.jpg')

  // Transient feedback instead of blocking alert()
  const showToast = (message, tone = 'success') => {
    clearTimeout(toastTimer.current)
    setToast({ message, tone })
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  // Handle form submit
  const handleSubmit = async (event) => {
    // Prevent
    event.preventDefault()

    // Set loading
    setLoading(true)

    // Get the form data
    const form = document.getElementById('form')
    const formData = new FormData(form)
    const urls = formData.get('urls')
    const password = formData.get('password')
    const domain = formData.get('domain')

    if (!urls || urls.trim() === '') {
      setLoading(false)
      showToast('Add at least one URL first.', 'error')
      return
    }

    // GET /api/{API Version}/domain?add={domain}
    if (domain !== "") {
      await fetch(`/api/v26/domain?add=${domain}`)
      .then(res => {
        if (res.status === 403) {
          showToast('You are not authorized to add this domain.', 'error')
        } else if (res.status === 409) {
          showToast('That domain is already taken. Remove it from your Vercel account and retry.', 'error')
        } else if (res.status === 200) {
          // check domain ip CNAME to cname.vercel-dns.com
          fetch(`https://dns.google/resolve?name=${domain}&type=CNAME`)
          .then(res => res.json())
          .then(data => {
            if ( (data.Answer && data.Answer[0].data === 'cname.vercel-dns.com.') || (data.Authority && data.Authority[0].name === 'vercel.app.') ) {
            }
            else {
              showToast('Domain added. Point a CNAME to cname.vercel-dns.com.')
            }
          })
        } else {
          showToast('Something went wrong, please try again later.', 'error')
        }
      })
      .catch(err => {
        console.error(err)
        showToast('Something went wrong, please try again later.', 'error')
      })
    }

    // POST to /api/{API Version}/shorten
    await fetch('/api/v26/shorten', {
      method: 'POST',
      body: JSON.stringify({
        urls: urls,
        password: password
      })
    })
    .then(res => res.json())
    .then(data => {
      setResults(data)
      setLoading(false)
    })
    .catch(err => {
      console.error(err)
      showToast('Something went wrong, please try again later.', 'error')
      setLoading(false)
    })
  }

  // Get the full short URL for a result (handles Apple URLs)
  const getShortUrl = (result) => {
    if (result.shortUrl) {
      return result.shortUrl
    }
    return `${customDomain() ?? window.location.origin}/${result.key}`
  }

  // Strip the protocol for display
  const bare = (url) => (url || '').replace(/^https?:\/\//, '')

  // What to show as the short link (full host + key, protocol stripped)
  const shortDisplay = (result) => {
    if (result.shortUrl) return bare(result.shortUrl)
    if (typeof window === 'undefined') return result.key
    return bare(getShortUrl(result))
  }

  // Trigger a client-side file download
  const download = (content, type, filename) => {
    const blob = new Blob([content], { type })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', filename)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    showToast(`Downloaded ${filename}`)
  }

  // Download results as CSV
  const downloadCSV = () => {
    const csv = results.map(result => `${result.url},${getShortUrl(result)}`).join('\n')
    download(csv, 'text/csv', 'shortenurl.csv')
  }

  // Download results as xlsx
  const downloadXLSX = () => {
    const xlsx = results.map(result => `${result.url},${getShortUrl(result)}`).join('\n')
    download(xlsx, 'text/xlsx', 'shortenurl.xlsx')
  }

  // Download results as JSON
  const downloadJSON = () => {
    download(JSON.stringify(results, null, 2), 'text/json', 'shortenurl.json')
  }

  // Copy a short URL, with per-row confirmation
  const copyShortUrl = (result) => {
    navigator.clipboard.writeText(getShortUrl(result)).then(() => {
      clearTimeout(copyTimer.current)
      setCopiedKey(result.key)
      copyTimer.current = setTimeout(() => setCopiedKey(null), 1600)
      showToast('Short link copied to clipboard.')
    }).catch(() => showToast('Could not copy to clipboard.', 'error'))
  }

  // Get custom domain
  const customDomain = () => {
    const form = document.getElementById('form')
    const formData = new FormData(form)
    const domain = formData.get('domain')
    if (domain !== "") {
      return domain
    } else {
      return null
    }
  }

  // Generate QR code and open dialog
  const generateQRCode = async (url) => {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrDialog({
        isOpen: true,
        url: url,
        qrCode: qrCodeDataURL
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      showToast('Error generating QR code.', 'error')
    }
  }

  // Close QR dialog
  const closeQRDialog = () => {
    setQrDialog({ isOpen: false, url: '', qrCode: '' })
  }

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    setEmptyBg(getRandomEmptyBg(newTheme))
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newTheme)
  }

  // Clear the form and results
  const handleReset = () => {
    setResults([])
    const textarea = document.getElementById('textarea')
    if (textarea) textarea.style.height = 'auto'
  }

  // Handle resize
  const handleResize = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const containerEl = e.target.closest('.resizable-container')
    const startWidth = containerWidth || containerEl.offsetWidth
    const startHeight = containerHeight || containerEl.offsetHeight
    setIsResizing(true)

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      const newWidth = Math.max(400, Math.min(window.innerWidth - 100, startWidth + deltaX * 2))
      const newHeight = Math.max(300, startHeight + deltaY)
      setContainerWidth(newWidth)
      setContainerHeight(newHeight)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      setIsResizing(false)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  useEffect(() => {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)

    setIsDarkMode(shouldBeDark)
    setEmptyBg(getRandomEmptyBg(shouldBeDark))
    document.documentElement.classList.toggle('dark', shouldBeDark)

    // Autogrow textarea, capped so the actions stay reachable
    const textarea = document.getElementById('textarea')
    const MAX_TEXTAREA_HEIGHT = 320
    const handleInput = () => {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT) + 'px'
      textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
    }

    if (textarea) {
      textarea.addEventListener('input', handleInput)
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener('input', handleInput)
      }
      clearTimeout(toastTimer.current)
      clearTimeout(copyTimer.current)
    }
  }, [])

  // Close the QR dialog with Escape
  useEffect(() => {
    if (!qrDialog.isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') closeQRDialog() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [qrDialog.isOpen])

  const fieldClass = "group rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] px-4 py-3 transition-colors duration-200 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-white/[0.07] focus-within:ring-4 focus-within:ring-blue-500/10"
  const labelClass = "block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 mb-1.5 ml-1"
  const iconBtnClass = "inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"

  return (
    <main className="relative isolate flex min-h-screen items-start justify-center overflow-hidden p-4 sm:p-6 md:p-12 lg:items-center lg:p-16">
      {/* Ambient background */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: `url(${emptyBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(28px) saturate(1.25)',
          transform: 'scale(1.12)',
          opacity: isDarkMode ? 0.35 : 0.95
        }}
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-white/35 via-white/25 to-white/50 dark:from-[#080b12]/85 dark:via-[#080b12]/80 dark:to-[#080b12]/90"
      />

      <div
        className="resizable-container relative mx-auto flex w-full min-h-[440px] max-w-6xl lg:max-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/85 shadow-card backdrop-blur-xl transition-shadow dark:border-white/10 dark:bg-[#0e131c]/90 dark:shadow-card-dark lg:flex-row"
        style={{
          ...(containerWidth ? { width: `${containerWidth}px`, maxWidth: 'none' } : {}),
          ...(containerHeight ? { height: `${containerHeight}px`, minHeight: 'auto' } : {})
        }}
      >
        {/* Left: composer */}
        <div className="scroll-slim flex flex-1 flex-col p-5 sm:p-7 lg:max-w-[440px] lg:overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                <i className="fa fa-bolt text-sm" aria-hidden="true"></i>
              </span>
              <h1 className="whitespace-nowrap text-[22px] font-bold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-[26px]">
                Magic Teleport
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <a href="https://github.com/1998code/shorten-url" target="_blank" rel="noreferrer" className={iconBtnClass} title="GitHub" aria-label="GitHub repository">
                <i className="fab fa-github" aria-hidden="true"></i>
              </a>
              <a href="https://x.com/1998design" target="_blank" rel="noreferrer" className={iconBtnClass} title="X" aria-label="X profile">
                <i className="fab fa-x-twitter" aria-hidden="true"></i>
              </a>
              <button
                onClick={toggleTheme}
                className={iconBtnClass}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <i className={`fa fa-${isDarkMode ? 'sun' : 'moon'}`} aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            Turn long links into short ones — in bulk, with optional password and custom domain.
          </p>

          {/* Form */}
          <form id="form" onSubmit={handleSubmit} onReset={handleReset} className="mt-6 flex flex-1 flex-col">
            {/* URL Input */}
            <div>
              <label htmlFor="textarea" className={labelClass}>Links</label>
              <div className={fieldClass}>
                <div className="flex items-start gap-3">
                  <i className="fa fa-link mt-[3px] text-gray-400 dark:text-gray-500" aria-hidden="true"></i>
                  <textarea
                    id="textarea"
                    name="urls"
                    rows="5"
                    className="flex-1 resize-y border-0 bg-transparent p-0 text-[15px] leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500"
                    placeholder={'https://example.com\nOne URL per line to shorten in bulk'}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="mt-4">
              <label htmlFor="password" className={labelClass}>Password <span className="font-normal normal-case tracking-normal text-gray-400">· optional</span></label>
              <div className={fieldClass}>
                <div className="flex items-center gap-3">
                  <i className="fa fa-lock text-gray-400 dark:text-gray-500" aria-hidden="true"></i>
                  <input
                    id="password"
                    type="text"
                    name="password"
                    autoComplete="off"
                    className="flex-1 border-0 bg-transparent p-0 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500"
                    placeholder="Lock the link behind a password"
                  />
                </div>
              </div>
            </div>

            {/* Custom Domain Input */}
            <div className="mt-4">
              <label htmlFor="domain" className={labelClass}>Custom domain <span className="font-normal normal-case tracking-normal text-gray-400">· free &amp; optional</span></label>
              <div className={fieldClass}>
                <div className="flex items-center gap-3">
                  <i className="fa fa-globe text-gray-400 dark:text-gray-500" aria-hidden="true"></i>
                  <input
                    id="domain"
                    type="text"
                    name="domain"
                    autoComplete="off"
                    className="flex-1 border-0 bg-transparent p-0 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500"
                    placeholder="links.yourbrand.com"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700 hover:shadow-blue-600/30 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0e131c]"
              >
                {loading ? 'Shortening…' : 'Shorten links'}
                <i className={`fa fa-${loading ? 'circle-notch fa-spin' : 'paper-plane'}`} aria-hidden="true"></i>
              </button>

              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <button
                  type="reset"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Reset
                  <i className="fa fa-undo-alt text-xs" aria-hidden="true"></i>
                </button>
                <a
                  href="https://docs.1998.media/shortenurl-api/quick-start"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  API docs
                  <i className="fa fa-book text-xs" aria-hidden="true"></i>
                </a>
              </div>
            </div>
          </form>
        </div>

        {/* Right: results */}
        <div className="scroll-slim flex flex-1 flex-col border-t border-gray-200/70 bg-gray-50/60 p-5 dark:border-white/10 dark:bg-white/[0.02] sm:p-7 lg:border-l lg:border-t-0 lg:overflow-y-auto">
          {results.length === 0 ? (
            <div
              className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-gray-200/70 dark:border-white/10"
              style={{
                backgroundImage: `url(${emptyBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className={`absolute inset-0 ${isDarkMode ? 'bg-black/55' : 'bg-white/35'} backdrop-blur-[1px]`} />
              <div className="animate-fade-in relative z-10 mx-4 max-w-[280px] rounded-2xl bg-white/70 px-6 py-8 text-center backdrop-blur-md dark:bg-black/50">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-700 shadow-sm dark:bg-white/10 dark:text-white">
                  <i className="fa fa-link text-lg" aria-hidden="true"></i>
                </span>
                <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                  No links yet
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  Paste your URLs on the left and your short links will show up here.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                    Your short links
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    Ready to share and track.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/15 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20">
                  {results.length} {results.length === 1 ? 'link' : 'links'}
                </span>
              </div>

              <ul className="scroll-slim mt-5 flex-1 space-y-2.5 pr-1 lg:overflow-y-auto">
                {results.map((result, index) => (
                  <li
                    key={result.key || index}
                    className="animate-slide-up rounded-2xl border border-gray-200 bg-white p-3.5 transition-colors duration-200 hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20"
                    style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <img
                        src={'https://edge-apis.vercel.app/api/favicon?url=' + bare(result.url)}
                        alt=""
                        className="h-4 w-4 shrink-0 rounded"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                      />
                      <a
                        href={`https://${bare(result.url)}`}
                        target="_blank"
                        rel="noreferrer"
                        title={result.url}
                        className="truncate text-xs text-gray-500 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {bare(result.url)}
                      </a>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <a
                        href={result.shortUrl || `/${result.key}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-mono text-[15px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {shortDisplay(result)}
                      </a>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <a
                          href={result.shortUrl || `/${result.key}`}
                          target="_blank"
                          rel="noreferrer"
                          className={iconBtnClass}
                          title="Open link"
                          aria-label="Open short link"
                        >
                          <i className="fa fa-external-link-alt text-sm" aria-hidden="true"></i>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyShortUrl(result)}
                          className={`${iconBtnClass} ${copiedKey === result.key ? 'text-green-600 dark:text-green-400' : ''}`}
                          title="Copy link"
                          aria-label="Copy short link"
                        >
                          <i className={`${copiedKey === result.key ? 'fa fa-check' : 'far fa-copy'} text-sm`} aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => generateQRCode(getShortUrl(result))}
                          className={iconBtnClass}
                          title="Show QR code"
                          aria-label="Show QR code"
                        >
                          <i className="fa fa-qrcode text-sm" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Export */}
              <div className="mt-5 border-t border-gray-200 pt-4 dark:border-white/10">
                <p className={labelClass}>Export</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'CSV', onClick: downloadCSV },
                    { label: 'XLSX', onClick: downloadXLSX },
                    { label: 'JSON', onClick: downloadJSON },
                  ].map(({ label, onClick }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={onClick}
                      className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {label}
                      <i className="fa fa-arrow-down-to-line text-xs opacity-60" aria-hidden="true"></i>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Resize handle - bottom-right corner.
            Inset past the card's 28px corner radius, otherwise overflow-hidden clips it. */}
        <div
          onMouseDown={handleResize}
          className={`absolute bottom-0 right-0 z-40 hidden h-8 w-8 cursor-nwse-resize items-end justify-end p-[9px] lg:flex ${isResizing ? 'opacity-100' : 'opacity-40 hover:opacity-80'} transition-opacity`}
          title="Drag to resize"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-gray-500 dark:text-gray-400" fill="none" aria-hidden="true">
            <path d="M11.25 4.75 4.75 11.25M11.25 8.75 8.75 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div
            role="status"
            className={`animate-toast-in flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg backdrop-blur ${toast.tone === 'error' ? 'bg-red-600/95' : 'bg-gray-900/95 dark:bg-white/95 dark:text-gray-900'}`}
          >
            <i className={`fa fa-${toast.tone === 'error' ? 'circle-exclamation' : 'circle-check'}`} aria-hidden="true"></i>
            {toast.message}
          </div>
        </div>
      )}

      {/* QR Code Dialog */}
      {qrDialog.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="QR code">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Background overlay */}
            <div
              className="animate-fade-in fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
              onClick={closeQRDialog}
            ></div>

            {/* Dialog panel */}
            <div className="animate-pop-in relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/60 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0e131c]">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <i className="fa fa-qrcode" aria-hidden="true"></i>
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">QR code</h3>
                  <p className="mt-0.5 break-all font-mono text-xs text-gray-500 dark:text-gray-400">
                    {bare(qrDialog.url)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeQRDialog}
                  className={iconBtnClass}
                  aria-label="Close"
                >
                  <i className="fa fa-xmark" aria-hidden="true"></i>
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10">
                <img src={qrDialog.qrCode} alt="QR code for the short link" className="w-full" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(qrDialog.url).then(() => {
                      showToast('Short link copied to clipboard.')
                    }).catch(() => showToast('Could not copy to clipboard.', 'error'))
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <i className="far fa-copy text-xs" aria-hidden="true"></i>
                  Copy URL
                </button>
                <a
                  href={qrDialog.qrCode}
                  download="qrcode.png"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <i className="fa fa-arrow-down-to-line text-xs" aria-hidden="true"></i>
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
