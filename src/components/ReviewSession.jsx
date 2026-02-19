import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { createFSRS, Rating, dbRowToCard, cardToDbRow, getUserSettings } from '../lib/fsrs'
import Flashcard from './Flashcard'
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Frown, Meh, Smile, Laugh, Trash2 } from 'lucide-react'

export default function ReviewSession({ onBack }) {
    const { user } = useAuth()
    const { activeProject } = useProject()
    const [cards, setCards] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [sessionStats, setSessionStats] = useState({ reviewed: 0, total: 0 })
    const [scheduling, setScheduling] = useState(null)

    const fetchDueCards = useCallback(async () => {
        if (!activeProject) return
        setLoading(true)
        const now = new Date().toISOString()
        const settings = getUserSettings()

        const { data, error } = await supabase
            .from('flashcards')
            .select('*')
            .eq('user_id', user.id)
            .eq('project_id', activeProject.id)
            .lte('due', now)
            .order('due', { ascending: true })

        if (!error && data) {
            // Apply daily limit if set
            const limited = settings.dailyLimit > 0 ? data.slice(0, settings.dailyLimit) : data
            setCards(limited)
            setSessionStats((s) => ({ ...s, total: limited.length }))
        }
        setLoading(false)
    }, [user.id, activeProject?.id])

    useEffect(() => {
        fetchDueCards()
    }, [fetchDueCards])

    // Compute scheduling whenever the current card changes
    useEffect(() => {
        if (cards.length > 0 && currentIndex < cards.length) {
            const card = cards[currentIndex]
            const fsrsCard = dbRowToCard(card)
            const settings = getUserSettings()
            const fsrs = createFSRS(settings.retentionRate)
            const result = fsrs.repeat(fsrsCard, new Date())
            setScheduling(result)
        } else {
            setScheduling(null)
        }
    }, [cards, currentIndex])

    const handleDelete = async () => {
        if (updating) return
        setUpdating(true)
        const card = cards[currentIndex]

        const { error } = await supabase
            .from('flashcards')
            .delete()
            .eq('id', card.id)

        if (!error) {
            const newCards = [...cards]
            newCards.splice(currentIndex, 1)
            setCards(newCards)
            setFlipped(false)
            setUpdating(false)
        } else {
            alert('Failed to delete card')
            setUpdating(false)
        }
    }

    const handleSaveCard = async (cardId, newQuestion, newAnswer) => {
        const { error } = await supabase
            .from('flashcards')
            .update({ question: newQuestion, answer: newAnswer })
            .eq('id', cardId)

        if (!error) {
            // Update local state
            const newCards = [...cards]
            const idx = newCards.findIndex((c) => c.id === cardId)
            if (idx !== -1) {
                newCards[idx] = { ...newCards[idx], question: newQuestion, answer: newAnswer }
                setCards(newCards)
            }
        } else {
            alert('Failed to save changes')
        }
    }

    const handleAnswer = async (rating) => {
        if (updating || !scheduling) return
        setUpdating(true)

        const card = cards[currentIndex]
        const scheduledItem = scheduling[rating]
        const newCard = scheduledItem.card
        const dbFields = cardToDbRow(newCard)

        await supabase
            .from('flashcards')
            .update(dbFields)
            .eq('id', card.id)

        setSessionStats((s) => ({ ...s, reviewed: s.reviewed + 1 }))
        setFlipped(false)

        setTimeout(() => {
            setCurrentIndex((prev) => prev + 1)
            setUpdating(false)
        }, 300)
    }

    /**
     * Get a human-readable interval string from a scheduled card
     */
    const getIntervalLabel = (rating) => {
        if (!scheduling) return ''
        const card = scheduling[rating].card
        const days = card.scheduled_days
        if (days === 0) {
            // Learning step — show minutes
            const diffMs = card.due.getTime() - Date.now()
            const minutes = Math.max(1, Math.round(diffMs / 60000))
            return minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`
        }
        if (days >= 365) return `${Math.round(days / 365 * 10) / 10}y`
        if (days >= 30) return `${Math.round(days / 30 * 10) / 10}mo`
        return `${days}d`
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
        )
    }

    // All done
    if (currentIndex >= cards.length) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    {cards.length === 0 ? 'No cards due!' : 'Session Complete! 🎉'}
                </h2>
                <p className="text-slate-400 mb-8">
                    {cards.length === 0
                        ? 'All your cards are up to date. Come back later!'
                        : `You reviewed ${sessionStats.reviewed} card${sessionStats.reviewed !== 1 ? 's' : ''}.`}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Dashboard
                    </button>
                    {cards.length > 0 && (
                        <button
                            onClick={() => {
                                setCurrentIndex(0)
                                setSessionStats({ reviewed: 0, total: 0 })
                                fetchDueCards()
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Review Again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    const card = cards[currentIndex]
    const progress = ((currentIndex) / cards.length) * 100

    return (
        <div className="max-w-lg mx-auto space-y-6">
            {/* Progress bar */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="text-sm text-slate-400 font-mono min-w-[3rem] text-right">
                    {currentIndex + 1}/{cards.length}
                </span>
            </div>

            {/* Flashcard */}
            <Flashcard card={card} flipped={flipped} onFlip={() => setFlipped(!flipped)} onSave={handleSaveCard} />

            {/* Delete button */}
            <div className="flex justify-center">
                <button
                    onClick={() => {
                        if (confirm('Are you sure you want to delete this card?')) {
                            handleDelete()
                        }
                    }}
                    disabled={updating}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors opacity-50 hover:opacity-100"
                >
                    <Trash2 className="w-3 h-3" />
                    Delete Card
                </button>
            </div>

            {/* Answer buttons (visible after flip) */}
            {flipped && (
                <div className="grid grid-cols-4 gap-3 animate-fade-in">
                    <button
                        onClick={() => handleAnswer(Rating.Again)}
                        disabled={updating}
                        className="flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                        <Frown className="w-6 h-6" />
                        <span className="text-xs font-medium">Again</span>
                        <span className="text-[10px] text-red-400/60">{getIntervalLabel(Rating.Again)}</span>
                    </button>
                    <button
                        onClick={() => handleAnswer(Rating.Hard)}
                        disabled={updating}
                        className="flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-50"
                    >
                        <Meh className="w-6 h-6" />
                        <span className="text-xs font-medium">Hard</span>
                        <span className="text-[10px] text-orange-400/60">{getIntervalLabel(Rating.Hard)}</span>
                    </button>
                    <button
                        onClick={() => handleAnswer(Rating.Good)}
                        disabled={updating}
                        className="flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                    >
                        <Smile className="w-6 h-6" />
                        <span className="text-xs font-medium">Good</span>
                        <span className="text-[10px] text-emerald-400/60">{getIntervalLabel(Rating.Good)}</span>
                    </button>
                    <button
                        onClick={() => handleAnswer(Rating.Easy)}
                        disabled={updating}
                        className="flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all disabled:opacity-50"
                    >
                        <Laugh className="w-6 h-6" />
                        <span className="text-xs font-medium">Easy</span>
                        <span className="text-[10px] text-sky-400/60">{getIntervalLabel(Rating.Easy)}</span>
                    </button>
                </div>
            )}
        </div>
    )
}
