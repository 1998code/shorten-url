import { kv } from "@vercel/kv"

export default async function handler(req, res) {

  // GET urls from POST body
  const urls = req.body

  console.log(urls)

  // Split the URLs into an array, line break or ,
  const urlsArray = urls.split(/[\n,]+/)

  // Shorten each URL
    // await kv.set('shortenKey', 'originalURL')
    // need to check shortenKey doesn't already exist, else need to create a new one to prevent overwriting

    const results = []

    for (const url of urlsArray) {
      // radomly generate a key
      let key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      // check if key already exists
      const checkKey = await kv.get(key)

      // while check key
      while (checkKey) {
        key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      }

      // set the key
      await kv.set(key, url)

      // push the result to the array
      results.push({
        key: key,
        url: url
      })
    }

    // Return the results
    res.status(200).json(results)
}
