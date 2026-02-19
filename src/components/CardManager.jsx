import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { createEmptyCard, cardToDbRow } from '../lib/fsrs'
import { Search, Trash2, ArrowLeft, Loader2, Plus, X, Check } from 'lucide-react'
import { format } from 'date-fns'

export default function CardManager({ onBack }) {
    const { user } = useAuth()
    const [cards, setCards] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [deletingId, setDeletingId] = useState(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [newQuestion, setNewQuestion] = useState('')
    const [newAnswer, setNewAnswer] = useState('')
    const [adding, setAdding] = useState(false)
    const questionRef = useRef(null)

    useEffect(() => {
        fetchCards()
    }, [user.id])

    useEffect(() => {
        if (showAddForm && questionRef.current) {
            questionRef.current.focus()
        }
    }, [showAddForm])

    const fetchCards = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('flashcards')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (data) setCards(data)
        setLoading(false)
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this card?')) return

        setDeletingId(id)
        const { error } = await supabase
            .from('flashcards')
            .delete()
            .eq('id', id)

        if (!error) {
            setCards(cards.filter((c) => c.id !== id))
        } else {
            alert('Failed to delete card')
        }
        setDeletingId(null)
    }

    const handleAddCard = async () => {
        if (!newQuestion.trim() || !newAnswer.trim()) return
        setAdding(true)

        const emptyCard = createEmptyCard(new Date())
        const fsrsFields = cardToDbRow(emptyCard)

        const { data, error } = await supabase
            .from('flashcards')
            .insert({
                user_id: user.id,
                question: newQuestion.trim(),
                answer: newAnswer.trim(),
                ...fsrsFields,
            })
            .select()

        if (!error && data) {
            setCards([data[0], ...cards])
            setNewQuestion('')
            setNewAnswer('')
            setShowAddForm(false)
        } else {
            alert('Failed to add card')
        }
        setAdding(false)
    }

    const filteredCards = cards.filter((card) => {
        const lowerSearch = searchTerm.toLowerCase()
        return (
            card.question.toLowerCase().includes(lowerSearch) ||
            card.answer.toLowerCase().includes(lowerSearch)
        )
    })

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Manage Cards</h2>
                        <p className="text-slate-400 text-sm">
                            {cards.length} cards total
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
                >
                    {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddForm ? 'Cancel' : 'Add Card'}
                </button>
            </div>

            {/* Add Card Form */}
            {showAddForm && (
                <div className="rounded-2xl bg-white/[0.03] border border-indigo-500/30 p-5 space-y-4 animate-in">
                    <h3 className="text-sm font-semibold text-white">New Flashcard</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Question</label>
                            <textarea
                                ref={questionRef}
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                placeholder="Enter the question..."
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Answer</label>
                            <textarea
                                value={newAnswer}
                                onChange={(e) => setNewAnswer(e.target.value)}
                                placeholder="Enter the answer..."
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={handleAddCard}
                            disabled={adding || !newQuestion.trim() || !newAnswer.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {adding ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            {adding ? 'Adding...' : 'Add Card'}
                        </button>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search cards based on question or answer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
            </div>

            {/* Card List */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                ) : filteredCards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Search className="w-8 h-8 mb-3 opacity-50" />
                        <p>{searchTerm ? `No cards found matching "${searchTerm}"` : 'No cards yet. Add your first card!'}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        <div className="grid grid-cols-12 px-6 py-3 bg-white/5 text-xs font-medium text-slate-400 uppercase tracking-wide">
                            <div className="col-span-5">Question</div>
                            <div className="col-span-5">Answer</div>
                            <div className="col-span-2 text-right">Actions</div>
                        </div>
                        {filteredCards.map((card) => (
                            <div key={card.id} className="grid grid-cols-12 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors group">
                                <div className="col-span-5 pr-4">
                                    <p className="text-sm text-white font-medium line-clamp-2">{card.question}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Created {format(new Date(card.created_at || new Date()), 'MMM d, yyyy')}
                                    </p>
                                </div>
                                <div className="col-span-5 pr-4">
                                    <p className="text-sm text-slate-300 line-clamp-2">{card.answer}</p>
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <button
                                        onClick={() => handleDelete(card.id)}
                                        disabled={deletingId === card.id}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Delete card"
                                    >
                                        {deletingId === card.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
