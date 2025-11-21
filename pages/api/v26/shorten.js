import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv();

// Check if URL is an Apple App Store URL
const isAppleAppStoreUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  const normalizedUrl = url.trim()
  if (normalizedUrl.includes('apps.apple.com')) {
    return true
  }
  try {
    const urlObj = new URL(normalizedUrl.startsWith('http') ? normalizedUrl : `https://${normalizedUrl}`)
    return urlObj.hostname === 'apps.apple.com' || urlObj.hostname.endsWith('.apps.apple.com')
  } catch {
    return false
  }
}

// Call Apple's shorten API
const shortenWithApple = async (url) => {
  try {
    const encodedUrl = encodeURIComponent(url)
    const response = await fetch(`https://toolbox.marketingtools.apple.com/api/shorten?url=${encodedUrl}`, {
      headers: {
        'accept': '*/*',
        'referer': 'https://toolbox.marketingtools.apple.com/',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Apple API returned ${response.status}`)
    }
    
    const data = await response.json()
    return data.shortUrl || null
  } catch (error) {
    console.error('Error calling Apple API:', error)
    return null
  }
}

export default async function handler(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
  const urls = body.urls.trim()
  const password = body.password
  const urlsArray = urls.split(/[\n,]+/)

  const promises = urlsArray.map(async (url) => {
    if (url === '') return null

    // Check if this is an Apple App Store URL
    if (isAppleAppStoreUrl(url)) {
      // Use Apple's API for App Store URLs
      const appleShortUrl = await shortenWithApple(url)
      
      if (appleShortUrl) {
        // Extract the key from Apple's short URL (e.g., "https://apple.co/4i5IeYt" -> "4i5IeYt")
        const appleKey = appleShortUrl.replace(/^https?:\/\/apple\.co\//, '').replace(/^https?:\/\/[^\/]+\//, '')
        
        return {
          key: appleKey,
          url: url,
          shortUrl: appleShortUrl
        }
      } else {
        // Fallback to regular shortening if Apple API fails
        console.warn(`Apple API failed for ${url}, falling back to regular shortening`)
      }
    }

    // Regular shortening logic
    let keys = Array.from({length: 10}, () => Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 5))
    let existingKeys = await Promise.all(keys.map(key => redis.get(key)))
    let key = keys.find((key, index) => !existingKeys[index])

    if (password !== "") {
      key = key + "$" + password
    }

    await redis.set(key, url)

    return {
      key: key.split("$")[0],
      url: url
    }
  })

  const results = await Promise.all(promises)

  res.status(200).json(results.filter(result => result !== null))
}