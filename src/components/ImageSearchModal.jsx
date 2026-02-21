import { useState, useRef, useEffect } from 'react'
import { Search, X, Loader2, ImageIcon, Sparkles } from 'lucide-react'

export default function ImageSearchModal({ initialQuery = '', onSelect, onClose }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const [suggestions, setSuggestions] = useState([])
    const [loadingSuggestions, setLoadingSuggestions] = useState(false)
    const inputRef = useRef(null)

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus()
        // Generate AI suggestions if we have a query
        if (initialQuery.trim()) {
            generateSuggestions(initialQuery.trim())
        }
    }, [])

    const generateSuggestions = async (text) => {
        setLoadingSuggestions(true)
        try {
            const res = await fetch('/api/generate-image-prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: text }),
            })
            const data = await res.json()
            if (data.suggestions && Array.isArray(data.suggestions)) {
                setSuggestions(data.suggestions.slice(0, 4))
            }
        } catch {
            setSuggestions([])
        }
        setLoadingSuggestions(false)
    }

    const handleSearch = async (searchQuery) => {
        const q = searchQuery || query
        if (!q.trim()) return
        setQuery(q)
        setLoading(true)
        setSearched(true)

        try {
            const res = await fetch(`/api/search-images?q=${encodeURIComponent(q.trim())}`)
            const data = await res.json()

            if (data.results) {
                setResults(data.results)
            } else {
                setResults([])
            }
        } catch {
            setResults([])
        }
        setLoading(false)
    }

    const handleChipClick = (term) => {
        setQuery(term)
        handleSearch(term)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[80vh] bg-slate-800 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                        <ImageIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-white flex-shrink-0">Search Images</h3>
                        <div className="flex-1" />
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* AI Suggestions */}
                    <div className="flex items-center gap-2 flex-wrap min-h-[32px]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        {loadingSuggestions ? (
                            <>
                                <div className="h-7 w-20 bg-white/5 rounded-full animate-pulse" />
                                <div className="h-7 w-28 bg-white/5 rounded-full animate-pulse" />
                                <div className="h-7 w-24 bg-white/5 rounded-full animate-pulse" />
                                <div className="h-7 w-20 bg-white/5 rounded-full animate-pulse" />
                            </>
                        ) : suggestions.length > 0 ? (
                            suggestions.map((term, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleChipClick(term)}
                                    className="px-3 py-1 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all whitespace-nowrap"
                                >
                                    {term}
                                </button>
                            ))
                        ) : (
                            <span className="text-[10px] text-slate-500">AI suggestions</span>
                        )}
                    </div>

                    {/* Search bar */}
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search Unsplash..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                        <button
                            onClick={() => handleSearch()}
                            disabled={loading || !query.trim()}
                            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {results.map((img) => (
                                <button
                                    key={img.id}
                                    onClick={() => onSelect(img.small, img.author, img.authorUrl)}
                                    className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-indigo-500/50 transition-all hover:scale-[1.02]"
                                >
                                    <img
                                        src={img.thumb}
                                        alt={img.alt}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                        <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded-md">
                                            Select
                                        </span>
                                    </div>
                                    <span className="absolute bottom-1 left-1 text-[9px] text-white/60 bg-black/40 px-1 rounded">
                                        {img.author}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && searched && results.length === 0 && (
                        <div className="text-center py-12">
                            <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">No images found. Try another search term.</p>
                        </div>
                    )}

                    {!loading && !searched && (
                        <div className="text-center py-12">
                            <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">Click a suggestion or search for images.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-white/10">
                    <p className="text-[10px] text-slate-500 text-center">
                        Photos by <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-400">Unsplash</a> · Suggestions by Gemini AI
                    </p>
                </div>
            </div>
        </div>
    )
}
