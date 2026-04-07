import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { getUserSettings, saveUserSettings } from '../lib/fsrs'
import {
    ArrowLeft, Mail, Lock, Loader2, Check, AlertCircle,
    Trash2, Target, ListOrdered,
} from 'lucide-react'

export default function Settings({ onBack }) {
    const { user, signOut } = useAuth()

    // Email change
    const [newEmail, setNewEmail] = useState('')
    const [emailLoading, setEmailLoading] = useState(false)
    const [emailMsg, setEmailMsg] = useState(null)

    // Password change
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordMsg, setPasswordMsg] = useState(null)

    // FSRS Settings
    const [retentionRate, setRetentionRate] = useState(0.9)
    const [dailyLimit, setDailyLimit] = useState(0)
    const [settingsSaved, setSettingsSaved] = useState(false)


    // Delete
    const [deleting, setDeleting] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    // Load saved settings
    useEffect(() => {
        const s = getUserSettings()
        setRetentionRate(s.retentionRate)
        setDailyLimit(s.dailyLimit)
    }, [])

    // ── Email Change ──
    const handleEmailChange = async (e) => {
        e.preventDefault()
        if (!newEmail.trim()) return
        setEmailLoading(true)
        setEmailMsg(null)

        const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })

        if (error) {
            setEmailMsg({ type: 'error', text: error.message })
        } else {
            setEmailMsg({ type: 'success', text: 'Confirmation email sent to your new address.' })
            setNewEmail('')
        }
        setEmailLoading(false)
    }

    // ── Password Change ──
    const handlePasswordChange = async (e) => {
        e.preventDefault()
        if (!newPassword || !confirmPassword) return

        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
            return
        }
        if (newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
            return
        }

        setPasswordLoading(true)
        setPasswordMsg(null)

        const { error } = await supabase.auth.updateUser({ password: newPassword })

        if (error) {
            setPasswordMsg({ type: 'error', text: error.message })
        } else {
            setPasswordMsg({ type: 'success', text: 'Password updated successfully!' })
            setNewPassword('')
            setConfirmPassword('')
        }
        setPasswordLoading(false)
    }

    // ── Save FSRS Settings ──
    const handleSaveSettings = () => {
        saveUserSettings({ retentionRate, dailyLimit })
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 2000)
    }

    // ── Delete Account ──
    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') return
        setDeleting(true)

        // Delete all user's flashcards
        await supabase.from('flashcards').delete().eq('user_id', user.id)
        // Delete all user's projects
        await supabase.from('projects').delete().eq('user_id', user.id)
        // Clear settings
        localStorage.removeItem('flashmind_settings')
        localStorage.removeItem('flashmind_active_project')
        // Sign out
        await signOut()
        setDeleting(false)
    }

    const StatusMessage = ({ msg }) => {
        if (!msg) return null
        return (
            <div className={`flex items-start gap-2 text-xs p-3 rounded-lg ${msg.type === 'error'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                {msg.type === 'error'
                    ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    : <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                }
                {msg.text}
            </div>
        )
    }

    return (
        <div className="max-w-xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Settings</h2>
            </div>

            {/* Account info */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Account</h3>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                            {user.email?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <p className="text-white font-medium">{user.email}</p>
                        <p className="text-xs text-slate-500">
                            Member since {new Date(user.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Review Settings ── */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-5">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Review Settings</h3>

                {/* Retention Rate */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-indigo-400" />
                        <label className="text-sm font-medium text-white">Target Retention</label>
                        <span className="ml-auto text-sm font-bold text-indigo-400">
                            {Math.round(retentionRate * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.70"
                        max="0.97"
                        step="0.01"
                        value={retentionRate}
                        onChange={(e) => setRetentionRate(parseFloat(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>70% (less reviews)</span>
                        <span>97% (more reviews)</span>
                    </div>
                </div>

                {/* Daily Limit */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <ListOrdered className="w-4 h-4 text-indigo-400" />
                        <label className="text-sm font-medium text-white">Daily Review Limit</label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min="0"
                            max="500"
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(parseInt(e.target.value) || 0)}
                            className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                        <span className="text-xs text-slate-400">
                            {dailyLimit === 0 ? 'Unlimited' : `${dailyLimit} cards max per session`}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleSaveSettings}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-lg transition-all"
                >
                    {settingsSaved ? (
                        <>
                            <Check className="w-4 h-4" />
                            Saved!
                        </>
                    ) : (
                        'Save Review Settings'
                    )}
                </button>
            </div>

            {/* ── Change Email ── */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-medium text-white">Change Email</h3>
                </div>
                <form onSubmit={handleEmailChange} className="space-y-3">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="New email address"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <StatusMessage msg={emailMsg} />
                    <button
                        type="submit"
                        disabled={emailLoading || !newEmail.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {emailLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Update Email
                    </button>
                </form>
            </div>

            {/* ── Change Password ── */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-medium text-white">Change Password</h3>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        required
                        minLength={6}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <StatusMessage msg={passwordMsg} />
                    <button
                        type="submit"
                        disabled={passwordLoading || !newPassword || !confirmPassword}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Update Password
                    </button>
                </form>
            </div>

            {/* ── Delete Account ── */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <h3 className="text-sm font-medium text-red-400">Delete Account</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                    This will permanently delete all your flashcards, projects, and settings. This action cannot be undone.
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            Type <span className="text-red-400 font-bold">DELETE</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="w-full bg-white/5 border border-red-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                    </div>
                    <button
                        onClick={handleDeleteAccount}
                        disabled={deleting || deleteConfirmText !== 'DELETE'}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {deleting ? 'Deleting...' : 'Delete My Account'}
                    </button>
                </div>
            </div>
        </div>
    )
}
