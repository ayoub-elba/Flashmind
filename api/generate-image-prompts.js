export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const { question } = req.body || {}

    if (!question) {
        return res.status(400).json({ error: 'Missing "question" in body' })
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

Voici la flashcard: "${question}"`
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
            return res.status(500).json({ error: 'Empty response from Gemini', rawData: data })
        }

        // Parse JSON array from the response (handle markdown code blocks)
        let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        let suggestions;
        try {
            suggestions = JSON.parse(cleaned)
        } catch (parseError) {
            return res.status(500).json({ error: 'Failed to parse JSON', rawText: text, cleanedText: cleaned })
        }

        return res.status(200).json({ suggestions })
    } catch (error) {
        return res.status(500).json({ error: 'Failed to generate suggestions', details: error.message, stack: error.stack })
    }
}
