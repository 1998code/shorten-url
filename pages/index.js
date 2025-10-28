import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

export default function Home() {

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [qrDialog, setQrDialog] = useState({ isOpen: false, url: '', qrCode: '' })
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Handle form submit
  const handleSubmit = async () => {
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
    const ref = formData.get('ref')

    // GET /api/{API Version}/domain?add={domain}
    if (domain !== "") {
      await fetch(`/api/v6/domain?add=${domain}`)
      .then(res => {
        if (res.status === 403) {
          alert('You are not authorized to add this domain.')
        } else if (res.status === 409) {
          alert('This domain/subdomain is already taken. Please remove it from your Vercel account and try again.')
        } else if (res.status === 200) {
          // check domain ip CNAME to cname.vercel-dns.com
          fetch(`https://dns.google/resolve?name=${domain}&type=CNAME`)
          .then(res => res.json())
          .then(data => {
            if ( (data.Answer && data.Answer[0].data === 'cname.vercel-dns.com.') || (data.Authority && data.Authority[0].name === 'vercel.app.') ) {
            }
            else {
              alert('Domain/Subdomain added successfully. Please use CNAME and point to cname.vercel-dns.com.')
            }
          })
        } else {
          alert('Something went wrong, please try again later.')
        }
      })
      .catch(err => {
        console.error(err)
        alert('Something went wrong, please try again later.')
      })
    }

    // POST to /api/{API Version}/shorten
    await fetch('/api/v6/shorten', {
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
      alert('Something went wrong, please try again later.')
      setLoading(false)
    })
  }

  // Download results as CSV
  const downloadCSV = () => {
    const csv = results.map(result => `${result.url},${window.location.origin}/${result.key}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', 'shortenurl.csv')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Download results as xlsx
  const downloadXLSX = () => {
    const xlsx = results.map(result => `${result.url},${window.location.origin}/${result.key}`).join('\n')
    const blob = new Blob([xlsx], { type: 'text/xlsx' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', 'shortenurl.xlsx')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Download results as JSON
  const downloadJSON = () => {
    const json = JSON.stringify(results, null, 2)
    const blob = new Blob([json], { type: 'text/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', 'shortenurl.json')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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
        width: 256,
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
      alert('Error generating QR code')
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
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newTheme)
  }

  const randomBG = () => {
    const bgList = [
      "img/city.jpg",
      "img/cityNight.jpeg",
      "img/mountain.jpeg",
    ]
    return bgList[Math.floor(Math.random() * bgList.length)];
  }

  useEffect(() => {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    
    setIsDarkMode(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)

    // Autogrow textarea
    const textarea = document.getElementById('textarea')
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    })

    const interval = setInterval(() => {
      // Fade in and out
      document.getElementById("bg").classList.add("opacity-0");
      setTimeout(() => {
        document.getElementById("bg").classList.remove("opacity-0");
      }, 1000);

      document.getElementById("bg").src = randomBG();
    }, 30000);
    return () => clearInterval(interval);
  }, [])
  
  return (
    <main className="flex items-center justify-center h-screen">
      <div className="relative z-10">
        <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-25 dark:bg-opacity-50 transition-opacity"></div>
        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <div className="mx-auto min-w-[50vw] xl:max-w-4xl 2xl:max-w-5xl flex flex-col lg:flex-row rounded-3xl bg-gradient-to-br from-white to-wite/50 dark:from-gray-900 dark:to-gray-900/50 backdrop-blur-lg p-2 shadow-2xl ring-1 ring-black ring-opacity-5 transition-all transform">
            <div className="flex-1 md:pt-3 md:pb-8">
              <div className="flex items-center justify-center gap-4 my-3">
                <a href="https://github.com/1998code/shorten-url" target="_blank" className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-500">
                  <i className="fab fa-github fa-x"></i>
                </a>
                <a href="https://x.com/1998design" target="_blank" className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-500">
                  <i className="fab fa-x-twitter"></i>
                </a>
                <button 
                  onClick={toggleTheme}
                  className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-500 transition-colors duration-200"
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  <i className={`fa fa-${isDarkMode ? 'sun' : 'moon'}`}></i>
                </button>
              </div>

              {/* Headings */}
              <h1 className="text-center text-3xl font-bold mt-3 text-black dark:text-white">Magic Teleport</h1>
              <h2 className="text-center text-xl font-medium text-gray-900 dark:text-gray-200">
                An URL Shortener Solution.
              </h2>

              {/* Form */}
              <form id="form" onSubmit={handleSubmit} className="mt-6 sm:px-8">
                {/* URL Input */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-xl">
                  <textarea id="textarea" name="urls" className="w-full p-4 border-0 caret-blue-500 bg-clip-text text-transparent bg-gradient-to-b from-blue-500 to-red-500 placeholder:text-lg focus:ring-0 sm:text-sm focus:outline-none" rows="6" placeholder="Input one or more URLs here. Each URL should be on a new line."></textarea>
                  <hr className="opacity-50" />
                  <input type="text" name="password" className="w-full p-4 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 text-lg font-medium focus:ring-0 sm:text-sm focus:outline-none" placeholder="Password (Optional)" />
                  <hr className="opacity-50" />
                  <input type="text" name="domain" className="w-full p-4 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 text-lg font-medium focus:ring-0 sm:text-sm focus:outline-none" placeholder="Custom Domain (Free & Optional)" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  <button type="submit" className="w-full px-4 py-2.5 rounded-xl bg-blue-500 dark:bg-blue-900 hover:bg-blue-600 dark:hover:bg-blue-800 text-white text-sm md:text-lg font-medium focus:ring-0 sm:text-sm whitespace-nowrap">
                    Submit
                    <i className={`fa fa-${loading ? 'circle-notch fa-spin' : 'paper-plane'} ml-2`}></i>
                  </button>
                  <button type="reset" className="w-full px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm md:text-lg font-medium focus:ring-0 sm:text-sm whitespace-nowrap">
                    Reset
                    <i className="fa fa-undo-alt ml-2"></i>
                  </button>
                  <a href="https://docs.1998.media/shortenurl-api/quick-start" target="_blank" className="w-full text-center px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm md:text-lg font-medium focus:ring-0 sm:text-sm whitespace-nowrap">
                    API
                    <i className="fa fa-book ml-2"></i>
                  </a>
                </div>
              </form>
            </div>

            {/* Results */}
            <div className="min-w-[30vw] px-4 py-12 text-center">
              <i className="fa fa-link text-3xl text-gray-600 dark:text-gray-400"></i>
              <div className="mt-2 text-lg text-gray-900 dark:text-gray-100">
                {results.length > 0 ? 'Here are your shortened URLs:' : 'Your shortened URLs will appear here.'}
                <table className="w-full my-4">
                  <tbody className="divide-y divide-gray-600 divide-opacity-50">
                    {results.map((result, index) => (
                      <tr key={index} className="text-blue-500 dark:text-blue-400 w-full overflow-auto">
                        <td className="text-left pr-1">
                          <a href={`http://${result.url.replaceAll('http://','').replaceAll('https://','')}`} target="_blank" className="hover:text-gray-600 dark:hover:text-gray-500 flex items-center gap-1">
                            <img src={'https://edge-apis.vercel.app/api/favicon?url=' + result.url.replaceAll('http://','').replaceAll('https://','')} className="h-[18px]" />
                            <span className="truncate max-w-[100px]">{result.url.replaceAll('http://','').replaceAll('https://','')}</span>
                          </a>
                        </td>
                        <td className="flex items-center justify-end gap-3 text-sm mt-1">
                          {/* domain */}
                          {/* <div className="opacity-70 cursor-default">
                            { (customDomain() ?? window.location.origin).replaceAll('http://','').replaceAll('https://','') }/
                          </div> */}
                          {/* Preview */}
                          <a href={`/${result.key}`} target="_blank" className="hover:text-blue-600 dark:hover:text-blue-500 -ml-2.5 whitespace-nowrap">
                            {`${result.key}`}
                            <i className="fa fa-external-link-alt ml-2.5"></i>
                          </a>
                          |
                          {/* Copy btn */}
                          <button onClick={() => {
                              navigator.clipboard.writeText(`${customDomain() ?? window.location.origin}/${result.key}`).then(() => {
                                alert('Copied to clipboard!')
                              })
                            }}
                            className="hover:text-blue-600 dark:hover:text-blue-500"
                          >
                            <i className="far fa-copy"></i>
                          </button>
                          |
                          {/* QR btn */}
                          <button onClick={() => {
                              const fullUrl = `${customDomain() ?? window.location.origin}/${result.key}`
                              generateQRCode(fullUrl)
                            }}
                            className="hover:text-blue-600 dark:hover:text-blue-500"
                            title="Generate QR Code"
                          >
                            <i className="fa fa-qrcode"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-1 mt-8">
                    <button onClick={downloadCSV} className="flex-1 px-3 py-1 rounded-lg bg-sky-100 dark:bg-sky-800 hover:bg-sky-200 dark:hover:bg-sky-700 text-sky-900 dark:text-sky-100 text-sm font-medium focus:ring-0 sm:text-sm whitespace-nowrap">
                      CSV
                      <i className="fa fa-circle-arrow-down ml-2"></i>
                    </button>
                    <button onClick={downloadXLSX} className="flex-1 px-3 py-1 rounded-lg bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 text-green-900 dark:text-green-100 text-sm font-medium focus:ring-0 sm:text-sm whitespace-nowrap">
                      XLSX
                      <i className="fa fa-circle-arrow-down ml-2"></i>
                    </button>
                    <button onClick={downloadJSON} className="flex-1 px-3 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-700 text-yellow-900 dark:text-yellow-100 text-sm font-medium focus:ring-0 sm:text-sm whitespace-nowrap">
                      JSON
                      <i className="fa fa-circle-arrow-down ml-2"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <img id="bg" src={ randomBG() }  loading="lazy" alt="Background"
        className={`fixed top-0 w-full h-full z-[1] object-cover filter brightness-85 duration-1000 transition-all`} />

      {/* QR Code Dialog */}
      {qrDialog.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 backdrop-blur-lg transition-opacity duration-300 ease-in-out"
              onClick={closeQRDialog}
            ></div>

            {/* Dialog panel */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-3xl text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-in-out sm:my-8 sm:align-middle sm:max-w-sm sm:w-full animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 sm:mx-0 sm:h-10 sm:w-10">
                    <i className="fa fa-qrcode text-blue-600 dark:text-blue-400"></i>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                      QR Code
                    </h3>
                    <div className="mt-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 break-all">
                        {qrDialog.url}
                      </p>
                    </div>
                  </div>
                </div>
                 <img 
                   src={qrDialog.qrCode} 
                   alt="QR Code" 
                   className="w-full border border-gray-300 dark:border-gray-600 rounded-3xl transition-all duration-500 ease-in-out transform hover:scale-105"
                 />
              </div>
              <div className="mb-3 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center items-center gap-1 rounded-xl border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95"
                    onClick={closeQRDialog}
                  >
                    <i className="far fa-times"></i>
                    Close
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center items-center gap-1 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95"
                    onClick={() => {
                      navigator.clipboard.writeText(qrDialog.url).then(() => {
                        alert('URL copied to clipboard!')
                      })
                    }}
                  >
                    <i className="far fa-copy"></i>
                    Copy URL
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
