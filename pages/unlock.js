import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Unlock() {
  const router = useRouter()

  const randomBG = () => {
    const bgList = [
      "city.jpg",
      "space.jpg",
      "galaxy.jpg",
    ]
    return bgList[Math.floor(Math.random() * bgList.length)];
  }

  // handleSubmit redirect to /{key}${password}
  const handleSubmit = async () => {
    // Prevent
    event.preventDefault()

    // Get the form data
    const form = document.getElementById('form')
    const formData = new FormData(form)
    const key = router.query.key
    
    const password = formData.get('password')

    // redirect to /${key}$${password}
    window.location.href = `/${key}$${password}`
  }

  useEffect(() => {
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

            <div className="flex items-center justify-center gap-4 my-8">
              <a href="https://github.com/1998code/shorten-url" target="_blank" className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-500">
                <i className="fab fa-github fa-x"></i>
              </a>
              <a href="https://twitter.com/1998design" target="_blank" className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-500">
                <i className="fab fa-twitter fa-x"></i>
              </a>
            </div>

            {/* Headings */}
            <i className="w-full text-center fa fa-lock text-7xl" />
            <h1 className="text-center text-3xl font-bold mt-3">Magic Teleport Lock</h1>
            <h2 className="text-center text-lg font-medium text-gray-900 dark:text-gray-200">
              This page is secured. Please enter the password to continue.
            </h2>

            {/* Form */}
            <form id="form" onSubmit={handleSubmit} className="mt-6 mb-12 sm:px-8">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-md">
                <input type="text" name="password" className="w-full p-4 rounded-md bg-transparent text-gray-900 dark:text-gray-100 text-lg font-medium focus:ring-0 sm:text-sm focus:outline-none" placeholder="Password (required)" required />
              </div>
              <div className="flex items-center justify-between gap-3 mt-4">
                <button type="submit" className="w-full mt-4 px-4 py-2.5 rounded-md bg-blue-500 dark:bg-blue-900 hover:bg-blue-600 dark:hover:bg-blue-800 text-white text-lg font-medium focus:ring-0 sm:text-sm">
                  Unlock
                  <i className={`fa fa-paper-plane ml-2`}></i>
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
      <img id="bg" src={ randomBG() } className={`fixed top-0 w-full h-full z-[1] object-cover filter brightness-50 duration-1000 transition-all`} />
    </main>
  )
}
