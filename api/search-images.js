export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    const { q, page = 1, per_page = 12 } = req.query

    if (!q) {
        return res.status(400).json({ error: 'Missing query parameter "q"' })
    }

    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY

    if (!UNSPLASH_ACCESS_KEY) {
        return res.status(500).json({ error: 'Unsplash API key not configured' })
    }

    try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&page=${page}&per_page=${per_page}&orientation=landscape`

        const response = await fetch(url, {
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
            },
        })

        if (!response.ok) {
            const errorText = await response.text()
            return res.status(response.status).json({ error: errorText })
        }

        const data = await response.json()

        // Return only what we need
        const results = data.results.map((img) => ({
            id: img.id,
            url: img.urls.regular,
            thumb: img.urls.thumb,
            small: img.urls.small,
            alt: img.alt_description || img.description || '',
            author: img.user.name,
            authorUrl: img.user.links.html,
        }))

        return res.status(200).json({
            results,
            total: data.total,
            total_pages: data.total_pages,
        })
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch images' })
    }
}
