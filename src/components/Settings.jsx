import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Mail, Lock, Loader2, Check, AlertCircle } from 'lucide-react'

export default function Settings({ onBack }) {
    const { user } = useAuth()

    // Email change
    const [newEmail, setNewEmail] = useState('')
    const [emailLoading, setEmailLoading] = useState(false)
    const [emailMsg, setEmailMsg] = useState(null)

    // Password change
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordMsg, setPasswordMsg] = useState(null)

    const handleEmailChange = async (e) => {
        e.preventDefault()
        if (!newEmail.trim()) return
        setEmailLoading(true)
        setEmailMsg(null)

        const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })

        if (error) {
            setEmailMsg({ type: 'error', text: error.message })
        } else {
            setEmailMsg({ type: 'success', text: 'A confirmation email has been sent to your new address. Check your inbox to confirm the change.' })
            setNewEmail('')
        }
        setEmailLoading(false)
    }

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
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        }
        setPasswordLoading(false)
    }

    return (
        <div className="max-w-xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Settings</h2>
            </div>

            {/* Account info */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
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

            {/* Change Email */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-medium text-white">Change Email</h3>
                </div>

                <form onSubmit={handleEmailChange} className="space-y-3">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">New email address</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="new@email.com"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>

                    {emailMsg && (
                        <div className={`flex items-start gap-2 text-xs p-3 rounded-lg ${emailMsg.type === 'error'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                            {emailMsg.type === 'error'
                                ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                : <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            }
                            {emailMsg.text}
                        </div>
                    )}

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

            {/* Change Password */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-medium text-white">Change Password</h3>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">New password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Confirm new password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                    </div>

                    {passwordMsg && (
                        <div className={`flex items-start gap-2 text-xs p-3 rounded-lg ${passwordMsg.type === 'error'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                            {passwordMsg.type === 'error'
                                ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                : <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            }
                            {passwordMsg.text}
                        </div>
                    )}

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
        </div>
    )
}
