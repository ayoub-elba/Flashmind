import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import CSVUploader from './CSVUploader'
import ReviewSession from './ReviewSession'
import CardManager from './CardManager'
import ProjectSelector from './ProjectSelector'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts'
import {
    Brain, LogOut, PlayCircle, Upload, Clock, Zap, Shield,
    Gauge, X, Pencil, TrendingUp, BookOpen, AlertTriangle,
    Check, Loader2,
} from 'lucide-react'
import { addDays, format, startOfDay } from 'date-fns'

// ─────────────────────────────────────────
// Mock data generator for design preview
// ─────────────────────────────────────────
function generateMockCards(count = 120) {
    const stateWeights = [0.15, 0.2, 0.55, 0.1]
    const now = new Date()
    const cards = []

    for (let i = 0; i < count; i++) {
        const rand = Math.random()
        let state = 0
        let cumulative = 0
        for (let s = 0; s < stateWeights.length; s++) {
            cumulative += stateWeights[s]
            if (rand < cumulative) { state = s; break }
        }

        const stability = state === 0 ? 0 : Math.round((Math.random() * 60 + 1) * 10) / 10
        const difficulty = Math.round((Math.random() * 9 + 1) * 10) / 10
        const dueOffset = Math.floor(Math.random() * 21) - 3
        const due = addDays(now, dueOffset)

        cards.push({
            id: `mock-${i}`,
            question: `Flashcard question #${i + 1}`,
            answer: `Answer for card #${i + 1}`,
            due: due.toISOString(),
            stability,
            difficulty,
            state,
            reps: state === 0 ? 0 : Math.floor(Math.random() * 20),
            lapses: Math.floor(Math.random() * 5),
            elapsed_days: Math.floor(Math.random() * 30),
            scheduled_days: Math.floor(Math.random() * 30),
        })
    }
    return cards
}

const STATE_LABELS = { 0: 'New', 1: 'Learning', 2: 'Review', 3: 'Relearning' }
const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444']
const USE_MOCK = false

// ─────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────
export default function Dashboard() {
    const { user, signOut } = useAuth()
    const { activeProject, loading: projectLoading } = useProject()
    const [cards, setCards] = useState([])
    const [view, setView] = useState('home')
    const [loading, setLoading] = useState(true)

    // Per-card inline editing for leeches
    const [editingLeechId, setEditingLeechId] = useState(null)
    const [editQuestion, setEditQuestion] = useState('')
    const [editAnswer, setEditAnswer] = useState('')
    const [savingLeech, setSavingLeech] = useState(false)

    const fetchCards = async () => {
        if (!activeProject) return
        setLoading(true)
        if (USE_MOCK) {
            setCards(generateMockCards(120))
            setLoading(false)
            return
        }
        const { data } = await supabase
            .from('flashcards')
            .select('*')
            .eq('user_id', user.id)
            .eq('project_id', activeProject.id)

        if (data) setCards(data)
        setLoading(false)
    }

    const handleStartEditLeech = (card) => {
        setEditingLeechId(card.id)
        setEditQuestion(card.question)
        setEditAnswer(card.answer)
    }

    const handleCancelEditLeech = () => {
        setEditingLeechId(null)
        setEditQuestion('')
        setEditAnswer('')
    }

    const handleSaveLeech = async () => {
        if (!editQuestion.trim() || !editAnswer.trim()) return
        setSavingLeech(true)

        const { error } = await supabase
            .from('flashcards')
            .update({ question: editQuestion.trim(), answer: editAnswer.trim() })
            .eq('id', editingLeechId)

        if (!error) {
            setCards(cards.map((c) =>
                c.id === editingLeechId
                    ? { ...c, question: editQuestion.trim(), answer: editAnswer.trim() }
                    : c
            ))
            handleCancelEditLeech()
        } else {
            alert('Failed to save card')
        }
        setSavingLeech(false)
    }

    useEffect(() => {
        fetchCards()
    }, [user.id, activeProject?.id])

    // ── Derived stats ──
    const now = new Date()
    const today = startOfDay(now)

    const dueToday = cards.filter(
        (c) => new Date(c.due) <= now
    ).length

    const activeCards = cards.filter((c) => c.state === 2 || c.state === 1 || c.state === 3)
    const avgStability = activeCards.length > 0
        ? Math.round((activeCards.reduce((sum, c) => sum + (c.stability || 0), 0) / activeCards.length) * 10) / 10
        : 0

    const avgDifficulty = cards.length > 0
        ? Math.round((cards.reduce((sum, c) => sum + (c.difficulty || 0), 0) / cards.length) * 10) / 10
        : 0

    // 14-day forecast
    const forecastData = Array.from({ length: 14 }, (_, i) => {
        const day = addDays(today, i)
        const dayEnd = addDays(day, 1)
        const count = cards.filter((c) => {
            const due = new Date(c.due)
            if (i === 0) return due <= dayEnd
            return due > day && due <= dayEnd
        }).length
        return {
            date: format(day, 'dd/MM'),
            cards: count,
            isToday: i === 0,
        }
    })

    // State distribution for pie chart
    const stateDistribution = [0, 1, 2, 3].map((s) => ({
        name: STATE_LABELS[s],
        value: cards.filter((c) => c.state === s).length,
    })).filter((d) => d.value > 0)

    // Top 10 hardest cards (leeches)
    const leeches = [...cards]
        .sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0))
        .slice(0, 10)

    // ── Subviews ──
    if (view === 'review') {
        return (
            <Layout user={user} signOut={signOut}>
                <ReviewSession onBack={() => { setView('home'); fetchCards() }} />
            </Layout>
        )
    }

    if (view === 'cards') {
        return (
            <Layout user={user} signOut={signOut}>
                <CardManager onBack={() => { setView('home'); fetchCards() }} />
            </Layout>
        )
    }

    if (view === 'upload') {
        return (
            <Layout user={user} signOut={signOut}>
                <div className="max-w-xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">Import Cards</h2>
                        <button onClick={() => setView('home')} className="text-slate-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <CSVUploader projectId={activeProject?.id} onUploadComplete={() => fetchCards()} />
                </div>
            </Layout>
        )
    }

    // ── Main Dashboard ──
    return (
        <Layout user={user} signOut={signOut}>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {cards.length} cards in your collection
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setView('review')}
                            disabled={dueToday === 0}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <PlayCircle className="w-4 h-4" />
                            Review ({dueToday})
                        </button>
                        <button
                            onClick={() => setView('cards')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-all"
                        >
                            <BookOpen className="w-4 h-4" />
                            Cards
                        </button>
                        <button
                            onClick={() => setView('upload')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-all"
                        >
                            <Upload className="w-4 h-4" />
                            Import
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        icon={<Clock className="w-5 h-5" />}
                        label="Due Today"
                        value={dueToday}
                        accent="indigo"
                        highlight={dueToday > 0}
                    />
                    <KPICard
                        icon={<Shield className="w-5 h-5" />}
                        label="Target Retention"
                        value="90%"
                        accent="emerald"
                        subtitle="FSRS default"
                    />
                    <KPICard
                        icon={<TrendingUp className="w-5 h-5" />}
                        label="Avg. Stability"
                        value={`${avgStability}d`}
                        accent="sky"
                        subtitle="active cards"
                    />
                    <KPICard
                        icon={<Gauge className="w-5 h-5" />}
                        label="Avg. Difficulty"
                        value={`${avgDifficulty}/10`}
                        accent={avgDifficulty < 4 ? 'emerald' : avgDifficulty < 7 ? 'amber' : 'red'}
                    />
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Bar Chart — 14 day forecast (2/3 width) */}
                    <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] border border-white/10 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-4 h-4 text-indigo-400" />
                            <h3 className="text-sm font-semibold text-white">14-Day Review Forecast</h3>
                        </div>
                        {cards.length === 0 ? (
                            <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
                                Import cards to see your review forecast
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={forecastData} barSize={20}>
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        axisLine={{ stroke: '#334155' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            color: '#f1f5f9',
                                        }}
                                        cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                                        formatter={(value) => [`${value} cards`, 'Due']}
                                    />
                                    <Bar
                                        dataKey="cards"
                                        radius={[6, 6, 0, 0]}
                                        fill="url(#barGradient)"
                                    />
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#818cf8" />
                                            <stop offset="100%" stopColor="#6366f1" />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Pie Chart — State distribution (1/3 width) */}
                    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-4 h-4 text-violet-400" />
                            <h3 className="text-sm font-semibold text-white">Card States</h3>
                        </div>
                        {stateDistribution.length === 0 ? (
                            <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
                                No cards yet
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <ResponsiveContainer width="100%" height={160}>
                                    <PieChart>
                                        <Pie
                                            data={stateDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={70}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {stateDistribution.map((entry) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={PIE_COLORS[
                                                        Object.values(STATE_LABELS).indexOf(entry.name)
                                                    ]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '12px',
                                                fontSize: '13px',
                                                color: '#f1f5f9',
                                            }}
                                            formatter={(value, name) => [`${value}`, name]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Legend */}
                                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
                                    {stateDistribution.map((entry) => {
                                        const colorIdx = Object.values(STATE_LABELS).indexOf(entry.name)
                                        return (
                                            <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-300">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{ backgroundColor: PIE_COLORS[colorIdx] }}
                                                />
                                                {entry.name} ({entry.value})
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Leech table — Top 10 hardest cards */}
                {leeches.length > 0 && (
                    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                            <h3 className="text-sm font-semibold text-white">Hardest Cards (Leeches)</h3>
                            <span className="text-xs text-slate-500 ml-auto">Top 10 by difficulty</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-4 py-2.5 text-left text-slate-400 font-medium text-xs uppercase tracking-wide">Question</th>
                                        <th className="px-4 py-2.5 text-center text-slate-400 font-medium text-xs uppercase tracking-wide">Difficulty</th>
                                        <th className="px-4 py-2.5 text-center text-slate-400 font-medium text-xs uppercase tracking-wide">Stability</th>
                                        <th className="px-4 py-2.5 text-center text-slate-400 font-medium text-xs uppercase tracking-wide">State</th>
                                        <th className="px-4 py-2.5 text-right text-slate-400 font-medium text-xs uppercase tracking-wide">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {leeches.map((card) =>
                                        editingLeechId === card.id ? (
                                            <tr key={card.id} className="bg-indigo-500/5">
                                                <td colSpan={5} className="px-4 py-4">
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wide">Question</label>
                                                                <textarea
                                                                    value={editQuestion}
                                                                    onChange={(e) => setEditQuestion(e.target.value)}
                                                                    rows={2}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wide">Answer</label>
                                                                <textarea
                                                                    value={editAnswer}
                                                                    onChange={(e) => setEditAnswer(e.target.value)}
                                                                    rows={2}
                                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={handleCancelEditLeech}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={handleSaveLeech}
                                                                disabled={savingLeech || !editQuestion.trim() || !editAnswer.trim()}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                            >
                                                                {savingLeech ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                {savingLeech ? 'Saving...' : 'Save'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={card.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-3 text-white max-w-[300px] truncate">
                                                    {card.question}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <DifficultyBadge value={card.difficulty} />
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-300">
                                                    {card.stability ? `${Math.round(card.stability)}d` : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <StateBadge state={card.state} />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => handleStartEditLeech(card)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function KPICard({ icon, label, value, accent, highlight, subtitle }) {
    const accentMap = {
        indigo: {
            bg: 'from-indigo-500/10 to-indigo-500/5',
            border: highlight ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'border-indigo-500/20',
            icon: 'text-indigo-400 bg-indigo-500/10',
            value: 'text-white',
        },
        emerald: {
            bg: 'from-emerald-500/10 to-emerald-500/5',
            border: 'border-emerald-500/20',
            icon: 'text-emerald-400 bg-emerald-500/10',
            value: 'text-emerald-400',
        },
        sky: {
            bg: 'from-sky-500/10 to-sky-500/5',
            border: 'border-sky-500/20',
            icon: 'text-sky-400 bg-sky-500/10',
            value: 'text-sky-400',
        },
        amber: {
            bg: 'from-amber-500/10 to-amber-500/5',
            border: 'border-amber-500/20',
            icon: 'text-amber-400 bg-amber-500/10',
            value: 'text-amber-400',
        },
        red: {
            bg: 'from-red-500/10 to-red-500/5',
            border: 'border-red-500/20',
            icon: 'text-red-400 bg-red-500/10',
            value: 'text-red-400',
        },
    }

    const a = accentMap[accent] || accentMap.indigo

    return (
        <div className={`rounded-2xl bg-gradient-to-br ${a.bg} border ${a.border} p-5 transition-all`}>
            <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-8 h-8 rounded-lg ${a.icon} flex items-center justify-center`}>
                    {icon}
                </div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
            </div>
            <p className={`text-3xl font-bold ${a.value}`}>{value}</p>
            {subtitle && (
                <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>
            )}
        </div>
    )
}

function DifficultyBadge({ value }) {
    const v = value || 0
    let color = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (v >= 7) color = 'text-red-400 bg-red-500/10 border-red-500/20'
    else if (v >= 4) color = 'text-amber-400 bg-amber-500/10 border-amber-500/20'

    return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-md border ${color}`}>
            {Math.round(v * 10) / 10}/10
        </span>
    )
}

function StateBadge({ state }) {
    const config = {
        0: { label: 'New', color: 'text-indigo-400 bg-indigo-500/10' },
        1: { label: 'Learning', color: 'text-amber-400 bg-amber-500/10' },
        2: { label: 'Review', color: 'text-emerald-400 bg-emerald-500/10' },
        3: { label: 'Relearning', color: 'text-red-400 bg-red-500/10' },
    }
    const c = config[state] || config[0]
    return (
        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-md ${c.color}`}>
            {c.label}
        </span>
    )
}

function Layout({ children, user, signOut }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
            {/* Background blurs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl"></div>
            </div>

            {/* Nav */}
            <nav className="relative z-10 border-b border-white/5 bg-white/5 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                            <Brain className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight">FlashMind</h1>
                        <ProjectSelector />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400 hidden sm:block">
                            {user.email}
                        </span>
                        <button
                            onClick={signOut}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {children}
            </main>
        </div>
    )
}
