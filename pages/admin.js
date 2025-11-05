import { useState, useEffect } from 'react'

export default function Admin() {
  const [urls, setUrls] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allUrls, setAllUrls] = useState([])
  const [filteredUrls, setFilteredUrls] = useState([])
  const [dbTotal, setDbTotal] = useState(null)
  const [searching, setSearching] = useState(false)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [hideNonUrls, setHideNonUrls] = useState(false)
  const [perPage, setPerPage] = useState(10)
  const [authed, setAuthed] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [password, setPassword] = useState('')

  // Check if a string is a valid URL
  const isValidUrl = (str) => {
    if (!str || typeof str !== 'string') return false
    // Check if it starts with http:// or https://
    if (str.match(/^https?:\/\//)) return true
    // Check if it looks like a domain (has a dot and no spaces)
    if (str.includes('.') && !str.includes(' ')) return true
    return false
  }

  // Apply client-side filters
  const applyFilters = (urlList) => {
    let filtered = urlList
    if (hideNonUrls) {
      // Show ONLY invalid URLs (invert the logic)
      filtered = filtered.filter(url => !isValidUrl(url.url))
    }
    return filtered
  }

  // Fetch total count from database
  const fetchTotalCount = async () => {
    try {
      const response = await fetch('/api/admin/count')
      const data = await response.json()
      setDbTotal(data.total || 0)
      // Calculate total pages based on current perPage setting
      const calculatedPages = Math.ceil((data.total || 0) / perPage)
      setTotalPages(calculatedPages)
    } catch (error) {
      console.error('Error fetching total count:', error)
    }
  }

  // Fetch URLs for current page
  const fetchUrls = async (page = 1, limit = perPage) => {
    setLoading(true)
    // Keep previous data visible during loading
    const previousUrls = [...filteredUrls]

    try {
      const response = await fetch(`/api/admin/list?page=${page}&limit=${limit}`)
      const data = await response.json()
      const fetchedUrls = data.urls || []
      setUrls(fetchedUrls)
      setAllUrls(fetchedUrls)
      setFilteredUrls(applyFilters(fetchedUrls))
      setCurrentPage(data.page || 1)
      // Don't override totalPages from count API
      setHasNext(data.hasNext || false)
      setHasPrev(data.hasPrev || false)
      setSearchQuery('') // Reset search when fetching new data
      setIsSearchMode(false) // Exit search mode
    } catch (error) {
      console.error('Error fetching URLs:', error)
      alert('Failed to fetch URLs: ' + (error.message || 'Unknown error'))
      // Restore previous data on error
      setFilteredUrls(previousUrls)
    } finally {
      setLoading(false)
    }
  }

  // Handle per page change
  const handlePerPageChange = (newPerPage) => {
    setPerPage(newPerPage)
    setCurrentPage(1) // Reset to first page
    fetchUrls(1, newPerPage)
    // Recalculate total pages
    if (dbTotal) {
      setTotalPages(Math.ceil(dbTotal / newPerPage))
    }
  }

  // Handle search
  const performSearch = async (query) => {
    if (!query.trim()) {
      setIsSearchMode(false)
      setFilteredUrls(applyFilters(urls))
      setSearching(false)
      return
    }

    setSearching(true)
    setIsSearchMode(true)

    try {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (response.ok) {
        setFilteredUrls(applyFilters(data.results || []))
      } else {
        console.error('Search error:', data.error)
        alert('Failed to search: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error searching:', error)
      alert('Failed to search URLs')
    } finally {
      setSearching(false)
    }
  }

  const handleSearchInput = (query) => {
    setSearchQuery(query)

    if (!query.trim()) {
      setIsSearchMode(false)
      setFilteredUrls(applyFilters(urls))
    }
  }

  // Toggle non-URL filter
  const toggleHideNonUrls = () => {
    setHideNonUrls(!hideNonUrls)
  }

  // Apply filters when hideNonUrls changes
  useEffect(() => {
    if (isSearchMode) {
      // In search mode, we need to re-search to get all results
      // For now, just apply to current filtered results
      const baseData = urls.length > 0 ? urls : filteredUrls
      setFilteredUrls(applyFilters(baseData))
    } else {
      // Apply to current page data
      setFilteredUrls(applyFilters(urls))
    }
  }, [hideNonUrls])

  const handleSearchClick = () => {
    performSearch(searchQuery)
  }

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      performSearch(searchQuery)
    }
  }

  // Navigate to next page
  const goToNextPage = () => {
    if (hasNext) {
      fetchUrls(currentPage + 1)
      setSelectedKeys(new Set()) // Clear selection when changing pages
    }
  }

  // Navigate to previous page
  const goToPrevPage = () => {
    if (hasPrev) {
      fetchUrls(currentPage - 1)
      setSelectedKeys(new Set()) // Clear selection when changing pages
    }
  }

  // Go to specific page
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchUrls(page)
      setSelectedKeys(new Set()) // Clear selection when changing pages
    }
  }

  // Toggle selection of a URL
  const toggleSelection = (key) => {
    const newSelected = new Set(selectedKeys)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedKeys(newSelected)
  }

  // Select all URLs (from filtered list)
  const selectAll = () => {
    if (selectedKeys.size === filteredUrls.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(filteredUrls.map(u => u.key)))
    }
  }

  // Delete selected URLs
  const deleteSelected = async () => {
    if (selectedKeys.size === 0) {
      alert('Please select at least one URL to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedKeys.size} URL(s)?`)) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keys: Array.from(selectedKeys)
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        setSelectedKeys(new Set())
        // Refresh both the list and total count
        await Promise.all([
          fetchUrls(currentPage),
          fetchTotalCount()
        ])
      } else {
        alert('Error: ' + (data.error || 'Failed to delete URLs'))
      }
    } catch (error) {
      console.error('Error deleting URLs:', error)
      alert('Failed to delete URLs')
    } finally {
      setDeleting(false)
    }
  }

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newTheme)
  }

  useEffect(() => {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)

    setIsDarkMode(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)

    // Auth check (cookie-based)
    const hasCookie = document.cookie.split('; ').some(c => c.startsWith('admin_auth=ok'))
    setAuthed(hasCookie)

    if (hasCookie) {
      fetchTotalCount()
      fetchUrls()
    } else {
      setLoading(false)
    }
  }, [])

  const submitAuth = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await res.json()
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed')
        setAuthLoading(false)
        return
      }
      setAuthed(true)
      setAuthLoading(false)
      setPassword('')
      setLoading(true)
      await Promise.all([fetchTotalCount(), fetchUrls()])
    } catch (err) {
      setAuthError('Network error')
      setAuthLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: isDarkMode ? '#15202b' : 'white' }}>
      <div className="max-w-7xl mx-auto">
        {!authed ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 mt-16 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-2xl">
                <i className="fa fa-lock text-2xl text-blue-600 dark:text-blue-400"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Access</h1>
                <p className="text-gray-600 dark:text-gray-400">Enter password to continue</p>
              </div>
            </div>
            <form onSubmit={submitAuth} className="mt-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {authError && <div className="text-red-500 text-sm mt-2">{authError}</div>}
              <button
                type="submit"
                disabled={authLoading || !password}
                className="w-full mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {authLoading ? (<i className="fa fa-circle-notch fa-spin"></i>) : 'Unlock'}
              </button>
            </form>
          </div>
        ) : (<>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-2xl">
                <i className="fa fa-shield-alt text-2xl text-blue-600 dark:text-blue-400"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your shortened URLs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium transition-colors"
              >
                <i className="fa fa-home mr-2"></i>
                Home
              </a>
              <button
                onClick={toggleTheme}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium transition-colors"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <i className={`fa fa-${isDarkMode ? 'sun' : 'moon'}`}></i>
              </button>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total URLs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {dbTotal !== null ? dbTotal.toLocaleString() : '...'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {totalPages > 1 ? `${totalPages} pages total` : 'Page 1'}
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-xl">
                <i className="fa fa-link text-2xl text-blue-600 dark:text-blue-400"></i>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{isSearchMode ? 'Search Results' : 'Current Page'}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {isSearchMode ? filteredUrls.length : urls.length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {isSearchMode ? `Found ${filteredUrls.length} matches` : `Page ${currentPage}`}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-xl">
                <i className="fa fa-list text-2xl text-purple-600 dark:text-purple-400"></i>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Selected</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{selectedKeys.size}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">For bulk delete</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-xl">
                <i className="fa fa-check-square text-2xl text-green-600 dark:text-green-400"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchUrls}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              <i className={`fa fa-${loading ? 'circle-notch fa-spin' : 'sync-alt'} mr-2`}></i>
              Refresh
            </button>
            <div className="flex-1 min-w-[200px] max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Search entire database..."
                className="w-full px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={searching}
              />
            </div>
            <button
              onClick={handleSearchClick}
              disabled={searching || !searchQuery.trim()}
              className="px-4 py-2 rounded-xl bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              <i className={`fa fa-${searching ? 'circle-notch fa-spin' : 'search'} mr-2`}></i>
              Search
            </button>
            <button
              onClick={toggleHideNonUrls}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                hideNonUrls
                  ? 'bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
              title={hideNonUrls ? 'Show all entries' : 'Show only invalid/non-URL entries'}
            >
              <i className={`fa fa-${hideNonUrls ? 'times-circle' : 'exclamation-triangle'} mr-2`}></i>
              {hideNonUrls ? 'Show All' : 'Show Invalid'}
            </button>
            <button
              onClick={selectAll}
              className="px-4 py-2 rounded-xl bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white font-medium transition-colors"
            >
              <i className="fa fa-check-double mr-2"></i>
              {selectedKeys.size === filteredUrls.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={deleteSelected}
              disabled={selectedKeys.size === 0 || deleting}
              className="px-4 py-2 rounded-xl bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              <i className={`fa fa-${deleting ? 'circle-notch fa-spin' : 'trash-alt'} mr-2`}></i>
              Delete Selected ({selectedKeys.size})
            </button>
          </div>
        </div>

        {/* URLs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
          <div className="overflow-x-auto" style={{ flex: '1 1 auto' }}>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedKeys.size === filteredUrls.length && filteredUrls.length > 0}
                      onChange={selectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Short URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Destination URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  // Show skeleton rows during loading to maintain layout
                  <>
                    {[...Array(perPage)].map((_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : filteredUrls.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <i className="fa fa-inbox text-4xl text-gray-400 dark:text-gray-600 mb-4"></i>
                      <p className="text-gray-600 dark:text-gray-400 mt-4">
                        {searchQuery ? 'No URLs match your search' : 'No shortened URLs found'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUrls.map((url) => (
                    <tr
                      key={url.key}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedKeys.has(url.key) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedKeys.has(url.key)}
                          onChange={() => toggleSelection(url.key)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/${url.shortKey}`}
                            target="_blank"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                          >
                            /{url.shortKey}
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/${url.shortKey}`)
                              alert('Copied to clipboard!')
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Copy to clipboard"
                          >
                            <i className="fa fa-copy text-sm"></i>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 max-w-md">
                          {url.url && typeof url.url === 'string' ? (
                            <>
                              <img
                                src={`https://edge-apis.vercel.app/api/favicon?url=${url.url.replace(/^https?:\/\//, '')}`}
                                className="h-4 w-4 flex-shrink-0"
                                alt=""
                              />
                              <a
                                href={url.url.match(/^https?:\/\//) ? url.url : `http://${url.url}`}
                                target="_blank"
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 truncate"
                                title={url.url}
                              >
                                {url.url}
                              </a>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 italic">
                              (empty or invalid URL)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {url.isPasswordProtected ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            <i className="fa fa-lock mr-1"></i>
                            Protected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            <i className="fa fa-globe mr-1"></i>
                            Public
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this URL?')) {
                              setSelectedKeys(new Set([url.key]))
                              deleteSelected()
                            }
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <i className="fa fa-trash-alt"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - hide when in search mode */}
          {!isSearchMode && (totalPages > 1 || hasNext || hasPrev) && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700" style={{ marginTop: 'auto', flexShrink: 0 }}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={goToPrevPage}
                  disabled={!hasPrev || loading}
                  className="px-4 py-2 rounded-xl bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fa fa-chevron-left mr-2"></i>
                  Previous
                </button>

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {/* First page */}
                  {currentPage > 2 && (
                    <>
                      <button
                        onClick={() => goToPage(1)}
                        disabled={loading}
                        className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        1
                      </button>
                      {currentPage > 3 && <span className="text-gray-500 dark:text-gray-400">...</span>}
                    </>
                  )}

                  {/* Previous page */}
                  {hasPrev && (
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={loading}
                      className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {currentPage - 1}
                    </button>
                  )}

                  {/* Current page */}
                  <button
                    className="px-3 py-2 rounded-lg bg-blue-500 dark:bg-blue-600 text-white font-medium"
                    disabled
                  >
                    {loading ? <i className="fa fa-circle-notch fa-spin"></i> : currentPage}
                  </button>

                  {/* Next page */}
                  {hasNext && (
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={loading}
                      className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {currentPage + 1}
                    </button>
                  )}

                  {/* Last page */}
                  {currentPage < totalPages - 1 && (
                    <>
                      {currentPage < totalPages - 2 && <span className="text-gray-500 dark:text-gray-400">...</span>}
                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={loading}
                        className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  {/* Page input - only show when we have total pages */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">Go to:</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value)
                          if (page >= 1 && page <= totalPages) {
                            goToPage(page)
                          }
                        }}
                        disabled={loading}
                        className="w-16 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-gray-600 dark:text-gray-400 text-sm">of {totalPages}</span>
                    </div>
                  )}

                  {/* Per page selector */}
                  <div className="flex items-center gap-2 ml-2 border-l border-gray-300 dark:border-gray-600 pl-2">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Show:</span>
                    <select
                      value={perPage}
                      onChange={(e) => handlePerPageChange(parseInt(e.target.value))}
                      disabled={loading}
                      className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={500}>500</option>
                      <option value={1000}>1000</option>
                    </select>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">per page</span>
                  </div>
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={!hasNext || loading}
                  className="px-4 py-2 rounded-xl bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <i className="fa fa-chevron-right ml-2"></i>
                </button>
              </div>
            </div>
          )}
        </div>
        </>)}
      </div>
    </main>
  )
}
