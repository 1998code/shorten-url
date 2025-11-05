import crypto from 'crypto'
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const adminPassword = process.env.ADMIN_PASSWORD || '0000'

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { password } = body || {}
    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }

    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid password' })
    }

    const oneWeek = 60 * 60 * 24 * 7
    const secure = process.env.NODE_ENV === 'production'
    const token = crypto.createHmac('sha256', adminPassword).update('admin').digest('hex')
    res.setHeader('Set-Cookie', `admin_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${oneWeek}; ${secure ? 'Secure;' : ''}`)
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Internal error' })
  }
}

