import { kv } from "@vercel/kv"

export default async function handler(req, res) {

  let count = 0

  for await (const key of kv.scanIterator()) {
    count++
  }

  // Return the results
  res.status(200).json(count)

}
