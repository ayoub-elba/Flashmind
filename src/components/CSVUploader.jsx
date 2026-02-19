import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { createEmptyCard, cardToDbRow } from '../lib/fsrs'
import Papa from 'papaparse'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react'

export default function CSVUploader({ onUploadComplete }) {
    const { user } = useAuth()
    const [dragActive, setDragActive] = useState(false)
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState([])
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState(null)

    const handleFile = (f) => {
        if (!f || !f.name.endsWith('.csv')) {
            setResult({ type: 'error', message: 'Please upload a CSV file.' })
            return
        }
        setFile(f)
        setResult(null)

        // First try with headers, then fallback to headerless mode
        Papa.parse(f, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields.map((h) => h.toLowerCase().trim())
                const hasQuestionCol = headers.includes('question')
                const hasAnswerCol = headers.includes('answer') || headers.includes('réponse') || headers.includes('reponse')

                if (hasQuestionCol && hasAnswerCol) {
                    // CSV has proper headers
                    const answerKey = headers.includes('answer') ? 'answer' : (headers.includes('réponse') ? 'réponse' : 'reponse')
                    const normalized = results.data.map((row) => {
                        const obj = {}
                        Object.keys(row).forEach((key) => {
                            obj[key.toLowerCase().trim()] = row[key]
                        })
                        return { question: obj.question, answer: obj[answerKey] || obj.answer }
                    }).filter((row) => row.question && row.answer)

                    setPreview(normalized.slice(0, 5))
                    setResult({
                        type: 'info',
                        message: `Found ${normalized.length} cards. Preview below.`,
                        data: normalized,
                    })
                } else {
                    // No matching headers — re-parse without headers (treat as 2-column CSV)
                    Papa.parse(f, {
                        header: false,
                        skipEmptyLines: true,
                        complete: (rawResults) => {
                            const rows = rawResults.data.filter((r) => r.length >= 2)
                            if (rows.length === 0) {
                                setResult({ type: 'error', message: 'CSV is empty or has less than 2 columns.' })
                                setFile(null)
                                setPreview([])
                                return
                            }
                            const normalized = rows.map((r) => ({
                                question: r[0]?.trim(),
                                answer: r[1]?.trim(),
                            })).filter((row) => row.question && row.answer)

                            setPreview(normalized.slice(0, 5))
                            setResult({
                                type: 'info',
                                message: `Found ${normalized.length} cards (auto-detected: col 1 = Question, col 2 = Answer). Preview below.`,
                                data: normalized,
                            })
                        },
                        error: () => {
                            setResult({ type: 'error', message: 'Failed to parse CSV.' })
                        },
                    })
                }
            },
            error: () => {
                setResult({ type: 'error', message: 'Failed to parse CSV.' })
            },
        })
    }

    const handleDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const handleUpload = async () => {
        if (!result?.data) return
        setUploading(true)

        const emptyCard = createEmptyCard(new Date())
        const fsrsFields = cardToDbRow(emptyCard)

        const cards = result.data.map((row) => ({
            user_id: user.id,
            question: row.question.trim(),
            answer: row.answer.trim(),
            ...fsrsFields,
        }))

        const { error } = await supabase.from('flashcards').insert(cards)

        if (error) {
            setResult({ type: 'error', message: `Upload failed: ${error.message}` })
        } else {
            setResult({
                type: 'success',
                message: `Successfully imported ${cards.length} cards!`,
            })
            setFile(null)
            setPreview([])
            if (onUploadComplete) onUploadComplete()
        }
        setUploading(false)
    }

    const reset = () => {
        setFile(null)
        setPreview([])
        setResult(null)
    }

    return (
        <div className="space-y-4">
            {/* Drop zone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${dragActive
                    ? 'border-indigo-500 bg-indigo-500/5'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}
            >
                <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-white font-medium">
                            Drop your CSV file here or click to browse
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            2 columns: <span className="text-indigo-400 font-mono">Question</span>,{' '}
                            <span className="text-indigo-400 font-mono">Answer</span> (header optional)
                        </p>
                    </div>
                </div>
            </div>

            {/* File info */}
            {file && (
                <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm text-white flex-1 truncate">{file.name}</span>
                    <button onClick={reset} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Status message */}
            {result && (
                <div
                    className={`flex items-start gap-3 p-4 rounded-xl text-sm ${result.type === 'error'
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                        : result.type === 'success'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                        }`}
                >
                    {result.type === 'error' ? (
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : result.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : null}
                    <span>{result.message}</span>
                </div>
            )}

            {/* Preview table */}
            {preview.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-white/10">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="px-4 py-3 text-left text-slate-300 font-medium">Question</th>
                                <th className="px-4 py-3 text-left text-slate-300 font-medium">Answer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {preview.map((row, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 text-white">{row.question}</td>
                                    <td className="px-4 py-3 text-slate-300">{row.answer}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {result?.data?.length > 5 && (
                        <div className="px-4 py-2 text-xs text-slate-400 bg-white/5 text-center">
                            ...and {result.data.length - 5} more
                        </div>
                    )}
                </div>
            )}

            {/* Upload button */}
            {result?.data && (
                <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Importing...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-5 h-5" />
                            Import {result.data.length} Cards
                        </>
                    )}
                </button>
            )}
        </div>
    )
}
