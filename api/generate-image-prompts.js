export default async function handler(req, res) {
    const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { question } = req.body || {}

    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "question" in body' })
    }

    // Security: Limit input length and strip special characters to prevent prompt injection
    const sanitizedQuestion = question.substring(0, 500).replace(/[^\w\s\u00C0-\u017F.,!?'-]/gi, '')

    if (!sanitizedQuestion.trim()) {
        return res.status(400).json({ error: 'Invalid "question" content' })
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

    if (!GOOGLE_API_KEY) {
        return res.status(500).json({ error: 'Google API key not configured' })
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Tu es un expert en conception visuelle. Je vais te donner un concept ou une phrase (Flashcard). Ta mission est de générer 4 termes de recherche courts en ANGLAIS pour trouver une image sur Unsplash.

Terme 1 : Le mot-clé principal (Littéral).
Terme 2 : Une métaphore visuelle concrète (ex: pour "Liberté" -> "Flying Bird").
Terme 3 : Un objet connexe ou une mise en situation.
Terme 4 : Une émotion ou une ambiance (ex: "Dark moody").

Renvoie UNIQUEMENT un tableau JSON de chaînes de caractères, sans aucun texte supplémentaire.
Exemple: ["Freedom", "Flying Bird", "Open Chain", "Blue Sky"]

Voici la flashcard: "${sanitizedQuestion}"`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 800,
                        responseMimeType: "application/json"
                    }
                })
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            return res.status(response.status).json({ error: errorText })
        }

        const data = await response.json()

        // Extract the text from Gemini response
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text || text.trim() === '') {
            console.error('Empty response from Gemini:', data)
            return res.status(500).json({ error: 'Internal Server Error' })
        }

        // Parse JSON array from the response (handle markdown code blocks)
        let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        let suggestions;
        try {
            suggestions = JSON.parse(cleaned)
        } catch (parseError) {
            console.error('Failed to parse JSON:', cleaned)
            return res.status(500).json({ error: 'Internal Server Error' })
        }

        return res.status(200).json({ suggestions })
    } catch (error) {
        console.error('Gemini API Error:', error)
        return res.status(500).json({ error: 'Internal Server Error' })
    }
}
