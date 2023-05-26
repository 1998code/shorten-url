import { kv } from "@vercel/kv"

export default async function handler(req, res) {

  const body = JSON.parse(req.body)

  // GET urls from POST body
  const urls = body.urls.trim()

  const password = body.password

  // Split the URLs into an array, line break or ,
  const urlsArray = urls.split(/[\n,]+/)
  
  const results = []
  
  // Shorten each URL
  for (const url of urlsArray) {
    if (url === '') continue

    // radomly generate a key
    let key = Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 5)

    // check if key already exists
    const checkKey = await kv.get(key)

    // while check key
    while (checkKey) {
      key = Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 5)
    }

    // if password is not null, set the password
    if (password !== "") {
      key = key + "$" + password
    }

    // set the key
    await kv.set(key, url)

    // push the result to the array
    results.push({
      key: key.split("$")[0],
      url: url
    })
  }

  // Return the results
  res.status(200).json(results)
}
