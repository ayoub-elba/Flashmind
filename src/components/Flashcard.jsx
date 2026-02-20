import { useState, useRef, useEffect } from 'react'
import { RotateCcw, Pencil, Check, X, Volume2 } from 'lucide-react'

export default function Flashcard({ card, flipped, onFlip, onSave, onSpeak, speaking }) {
    const [editing, setEditing] = useState(false)
    const [editQuestion, setEditQuestion] = useState(card.question)
    const [editAnswer, setEditAnswer] = useState(card.answer)
    const questionRef = useRef(null)

    // Sync local state when card changes
    useEffect(() => {
        setEditQuestion(card.question)
        setEditAnswer(card.answer)
        setEditing(false)
    }, [card.id])

    const startEdit = (e) => {
        e.stopPropagation()
        setEditing(true)
        setEditQuestion(card.question)
        setEditAnswer(card.answer)
    }

    const cancelEdit = (e) => {
        e.stopPropagation()
        setEditing(false)
        setEditQuestion(card.question)
        setEditAnswer(card.answer)
    }

    const saveEdit = (e) => {
        e.stopPropagation()
        if (editQuestion.trim() && editAnswer.trim()) {
            onSave?.(card.id, editQuestion.trim(), editAnswer.trim())
            setEditing(false)
        }
    }

    const handleSpeak = (e, text) => {
        e.stopPropagation()
        onSpeak?.(text)
    }

    if (editing) {
        return (
            <div className="w-full max-w-lg mx-auto rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-indigo-500/30 backdrop-blur-sm p-6 space-y-4">
                {/* Question edit */}
                <div>
                    <label className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-2 block">
                        Question
                    </label>
                    <textarea
                        ref={questionRef}
                        value={editQuestion}
                        onChange={(e) => setEditQuestion(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-indigo-500/50 transition-colors"
                        rows={3}
                        autoFocus
                    />
                </div>

                {/* Answer edit */}
                <div>
                    <label className="text-xs font-medium text-violet-400 uppercase tracking-widest mb-2 block">
                        Answer
                    </label>
                    <textarea
                        value={editAnswer}
                        onChange={(e) => setEditAnswer(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
                        rows={3}
                    />
                </div>

                {/* Save / Cancel */}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 border border-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Cancel
                    </button>
                    <button
                        onClick={saveEdit}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                    >
                        <Check className="w-3 h-3" />
                        Save
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="perspective-1000 w-full max-w-lg mx-auto">
            <div
                onClick={onFlip}
                className={`relative w-full min-h-[280px] cursor-pointer transition-all duration-500 preserve-3d ${flipped ? 'rotate-y-180' : ''
                    }`}
            >
                {/* Front */}
                <div className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm p-8 flex flex-col items-center justify-center">
                    {/* Top buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                        <button
                            onClick={(e) => handleSpeak(e, card.question)}
                            className={`p-1.5 transition-colors ${speaking
                                    ? 'text-indigo-400 animate-pulse'
                                    : 'text-slate-500 hover:text-indigo-400'
                                }`}
                            title="Read aloud"
                        >
                            <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={startEdit}
                            className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors"
                            title="Edit card"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <span className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-4">
                        Question
                    </span>
                    <p className="text-xl text-white text-center leading-relaxed font-medium">
                        {card.question}
                    </p>
                    <div className="absolute bottom-4 flex items-center gap-1.5 text-slate-500 text-xs">
                        <RotateCcw className="w-3 h-3" />
                        Click to reveal answer
                    </div>
                </div>

                {/* Back */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 backdrop-blur-sm p-8 flex flex-col items-center justify-center">
                    {/* Top buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                        <button
                            onClick={(e) => handleSpeak(e, card.answer)}
                            className={`p-1.5 transition-colors ${speaking
                                    ? 'text-violet-400 animate-pulse'
                                    : 'text-slate-500 hover:text-violet-400'
                                }`}
                            title="Read aloud"
                        >
                            <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={startEdit}
                            className="p-1.5 text-slate-500 hover:text-violet-400 transition-colors"
                            title="Edit card"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <span className="text-xs font-medium text-violet-400 uppercase tracking-widest mb-4">
                        Answer
                    </span>
                    <p className="text-xl text-white text-center leading-relaxed font-medium">
                        {card.answer}
                    </p>
                </div>
            </div>
        </div>
    )
}
