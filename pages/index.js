import { useState, useEffect } from 'react'

export default function Home() {

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

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

    // POST to /api/shorten
    await fetch('/api/shorten', {
      method: 'POST',
      body: urls
    })
    .then(res => res.json())
    .then(data => {
      setResults(data)
      setLoading(false)
    })
    .catch(err => {
      console.error(err)
      setLoading(false)
    })
  }

  const randomBG = () => {
    const bgList = [
      "city.jpg",
      "space.jpg",
      "galaxy.jpg",
    ]
    return bgList[Math.floor(Math.random() * bgList.length)];
  }

  useEffect(() => {
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

          <div className="mx-auto max-w-2xl transform rounded-xl bg-white dark:bg-gray-900 p-2 shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">

            <h1 className="text-center text-3xl font-bold mt-3">REDKV</h1>
            <h2 className="text-center text-xl font-medium text-gray-900 dark:text-gray-200">
              New URL Shortener Solution - Powered by Vercel Storage.
            </h2>

            <form id="form" onSubmit={handleSubmit} class="mt-6 sm:px-8">
              {/* URL Input */}
              <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-md">
                <textarea id="textarea" name="urls" className="w-full border-0 caret-blue-500 bg-clip-text text-transparent bg-gradient-to-b from-blue-500 to-red-500 placeholder:text-lg focus:ring-0 sm:text-sm focus:outline-none" rows="6" placeholder="You can input one or more URLs here. Each URL should be on a new line."></textarea>
              </div>
              <div className="flex items-center justify-between gap-3 mt-4">
                <button type="submit" className="w-full mt-4 px-4 py-2.5 rounded-md bg-blue-500 dark:bg-blue-900 hover:bg-blue-600 dark:hover:bg-blue-800 text-white text-lg font-medium focus:ring-0 sm:text-sm">
                  Submit
                  <i className={`fas fa-circle-notch fa-spin ml-2 ${loading ? 'block' : '!hidden'}`}></i>
                </button>
                <button type="reset" className="w-full mt-4 px-4 py-2.5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-lg font-medium focus:ring-0 sm:text-sm">
                  Reset
                  <i className="fas fa-undo-alt ml-2"></i>
                </button>
              </div>
            </form>

            {/* Results */}
            <div className="px-4 py-14 text-center sm:px-14">
              <i className="fas fa-link text-3xl text-gray-400"></i>
              <div className="mt-4 text-lg text-gray-900 dark:text-gray-100">
                {results.length > 0 ? 'Here are your shortened URLs:' : 'Your shortened URLs will appear here.'}
                <table className="w-full mt-4">
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-500">
                        <td className="text-left">
                          <a href={`/${result.key}`} target="_blank" className="block">
                            {result.url}
                          </a>
                        </td>
                        <td className="text-right">
                          <a href={`/${result.key}`} target="_blank" className="block text-sm">
                            {`${result.key}`}
                            <i className="fa fa-external-link-alt ml-1"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
      <img id="bg" src={ randomBG() } className={`fixed top-0 w-full h-full z-[1] object-cover filter brightness-50 duration-1000 transition-all`} />
    </main>
  )
}
