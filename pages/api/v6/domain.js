export default async function handler(req, res) {
  const { add } = req.query

  try {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains?teamId=${process.env.TEAM_ID_VERCEL}`,
      {
        body: `{\n  "name": "${add.replaceAll('http://','').replaceAll('https://','')}"\n}`,
        headers: {
          Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      }
    )
    
    var data = await response.json()

    if (data.error) {
      const { projectName, teamName, ...cleanedData } = data.error
      data = cleanedData
    }
    
    return res.status(response.status).json(data)
    
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error occurred!', details: err.message })
  }
}
