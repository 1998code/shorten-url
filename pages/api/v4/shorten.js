import { kv } from "@vercel/kv"

export default async function handler(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body

  // GET urls from POST body
  const urls = body.urls.trim()

  const password = body.password

  // Split the URLs into an array, line break or ,
  const urlsArray = urls.split(/[\n,]+/)
  
  const results = []
  
  // Shorten each URL
  for (const url of urlsArray) {
    if (url === '') continue

    // Randomly generate a key
    let key = Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 5)

    //Check if the key already exists
    const checkKey = await kv.get(key)

    while (checkKey) {
      key = Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 5)
    }

    // If a password is not null, set the password
    if (password !== "") {
      key = key + "$" + password
    }

    // Set the key
    await kv.set(key, url)

    // Push the result to the array
    results.push({
      key: key.split("$")[0],
      url: url
    })
  }

  // Return the results
  res.status(200).json(results)
}
