import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { createEmptyCard, cardToDbRow } from '../lib/fsrs'
import { useFlashcards } from '../hooks/useFlashcards'
import { useQueryClient } from '@tanstack/react-query'
import ImageSearchModal from './ImageSearchModal'
import { Search, Trash2, ArrowLeft, Loader2, Plus, X, Check, Pencil, ImageIcon } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function CardManager({ onBack }) {
    const { user } = useAuth()
    const { activeProject } = useProject()
    
    const queryClient = useQueryClient()
    const { data: cards = [], isLoading: loading } = useFlashcards()

    const [searchTerm, setSearchTerm] = useState('')
    const [deletingId, setDeletingId] = useState(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [newQuestion, setNewQuestion] = useState('')
    const [newAnswer, setNewAnswer] = useState('')
    const [adding, setAdding] = useState(false)
    const [newImageUrl, setNewImageUrl] = useState('')
    const [showImageSearch, setShowImageSearch] = useState(false)
    const [imageSearchContext, setImageSearchContext] = useState('') // 'add' or 'edit'
    const questionRef = useRef(null)

    // Per-card inline editing
    const [editingId, setEditingId] = useState(null)
    const [editQuestion, setEditQuestion] = useState('')
    const [editAnswer, setEditAnswer] = useState('')
    const [editImageUrl, setEditImageUrl] = useState('')
    const [saving, setSaving] = useState(false)

    // Infinite scroll
    const [visibleCount, setVisibleCount] = useState(50)
    const observerRef = useRef(null)
    const sentinelRef = useRef(null)

    // Reset when search changes
    useEffect(() => {
        setVisibleCount(50)
    }, [searchTerm])

    // IntersectionObserver: load 50 more when sentinel comes into view
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect()
        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount((prev) => prev + 50)
            }
        }, { threshold: 0.1 })
        if (sentinelRef.current) {
            observerRef.current.observe(sentinelRef.current)
        }
        return () => observerRef.current?.disconnect()
    }, [searchTerm])


    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this card?')) return

        setDeletingId(id)
        const { error } = await supabase
            .from('flashcards')
            .delete()
            .eq('id', id)

        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['flashcards', user.id, activeProject.id] })
            toast.success('Card deleted successfully')
        } else {
            toast.error('Failed to delete card')
        }
        setDeletingId(null)
    }

    useEffect(() => {
        if (showAddForm && questionRef.current) {
            questionRef.current.focus()
        }
    }, [showAddForm])

    const handleAddCard = async () => {
        if (!newQuestion.trim() || !newAnswer.trim()) return
        setAdding(true)

        const emptyCard = createEmptyCard(new Date())
        const fsrsFields = cardToDbRow(emptyCard)

        const { data, error } = await supabase
            .from('flashcards')
            .insert({
                user_id: user.id,
                project_id: activeProject.id,
                question: newQuestion.trim(),
                answer: newAnswer.trim(),
                image_url: newImageUrl || null,
                ...fsrsFields,
            })
            .select()

        if (!error && data) {
            queryClient.invalidateQueries({ queryKey: ['flashcards', user.id, activeProject.id] })
            setNewQuestion('')
            setNewAnswer('')
            setNewImageUrl('')
            setShowAddForm(false)
            toast.success('Card added!')
        } else {
            toast.error('Failed to add card')
        }
        setAdding(false)
    }

    const handleStartEdit = (card) => {
        setEditingId(card.id)
        setEditQuestion(card.question)
        setEditAnswer(card.answer)
        setEditImageUrl(card.image_url || '')
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditQuestion('')
        setEditAnswer('')
        setEditImageUrl('')
    }

    const handleSaveEdit = async () => {
        if (!editQuestion.trim() || !editAnswer.trim()) return
        setSaving(true)

        const { error } = await supabase
            .from('flashcards')
            .update({
                question: editQuestion.trim(),
                answer: editAnswer.trim(),
                image_url: editImageUrl || null,
            })
            .eq('id', editingId)

        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['flashcards', user.id, activeProject.id] })
            handleCancelEdit()
            toast.success('Card saved!')
        } else {
            toast.error('Failed to save card')
        }
        setSaving(false)
    }

    const filteredCards = cards.filter((card) => {
        const lowerSearch = searchTerm.toLowerCase()
        return (
            card.question.toLowerCase().includes(lowerSearch) ||
            card.answer.toLowerCase().includes(lowerSearch)
        )
    })

    const visibleCards = filteredCards.slice(0, visibleCount)
    const hasMore = visibleCount < filteredCards.length

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

                    {/* Image Section */}
                    <div>
                        {newImageUrl ? (
                            <div className="relative inline-block">
                                <img src={newImageUrl} alt="" className="h-20 rounded-lg object-cover" />
                                <button
                                    onClick={() => setNewImageUrl('')}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { setImageSearchContext('add'); setShowImageSearch(true) }}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-indigo-400 bg-white/5 border border-white/10 hover:border-indigo-500/30 rounded-lg transition-all"
                            >
                                <ImageIcon className="w-3.5 h-3.5" />
                                Add Image
                            </button>
                        )}
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
                        {visibleCards.map((card) =>
                            editingId === card.id ? (
                                <div key={card.id} className="px-6 py-4 bg-indigo-500/5">
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wide">Question</label>
                                                <textarea
                                                    value={editQuestion}
                                                    onChange={(e) => setEditQuestion(e.target.value)}
                                                    rows={3}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wide">Answer</label>
                                                <textarea
                                                    value={editAnswer}
                                                    onChange={(e) => setEditAnswer(e.target.value)}
                                                    rows={3}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                                                />
                                            </div>
                                        </div>
                                        {/* Image in edit */}
                                        <div>
                                            {editImageUrl ? (
                                                <div className="relative inline-block">
                                                    <img src={editImageUrl} alt="" className="h-16 rounded-lg object-cover" />
                                                    <button
                                                        onClick={() => setEditImageUrl('')}
                                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setImageSearchContext('edit'); setShowImageSearch(true) }}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-indigo-400 bg-white/5 border border-white/10 hover:border-indigo-500/30 rounded-lg transition-all"
                                                >
                                                    <ImageIcon className="w-3 h-3" />
                                                    Add Image
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={handleCancelEdit}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={saving || !editQuestion.trim() || !editAnswer.trim()}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                {saving ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div key={card.id} className="grid grid-cols-12 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors group">
                                    <div className="col-span-5 pr-4 flex items-center gap-3">
                                        {card.image_url && (
                                            <img src={card.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                        )}
                                        <div>
                                            <p className="text-sm text-white font-medium line-clamp-2">{card.question}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Created {format(new Date(card.created_at || new Date()), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="col-span-5 pr-4">
                                        <p className="text-sm text-slate-300 line-clamp-2">{card.answer}</p>
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-1">
                                        <button
                                            onClick={() => handleStartEdit(card)}
                                            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Edit card"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
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
                            )
                        )}
                        {/* Sentinel for IntersectionObserver */}
                        {hasMore && (
                            <div ref={sentinelRef} className="flex items-center justify-center py-6 text-slate-500">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                <span className="text-sm">Loading more cards...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image Search Modal */}
            {showImageSearch && (
                <ImageSearchModal
                    initialQuery={imageSearchContext === 'add' ? newQuestion : editQuestion}
                    onSelect={(url) => {
                        if (imageSearchContext === 'add') {
                            setNewImageUrl(url)
                        } else {
                            setEditImageUrl(url)
                        }
                        setShowImageSearch(false)
                    }}
                    onClose={() => setShowImageSearch(false)}
                />
            )}
        </div>
    )
}
