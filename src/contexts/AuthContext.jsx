import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [approved, setApproved] = useState(null) // null = unknown, true/false

    // Check if user is approved
    const checkApproval = async (userId) => {
        if (!userId) {
            setApproved(null)
            return
        }
        const { data, error } = await supabase
            .from('profiles')
            .select('approved')
            .eq('id', userId)
            .single()

        if (error || !data) {
            // Profile doesn't exist yet (might be first login before trigger runs)
            setApproved(false)
        } else {
            setApproved(data.approved)
        }
    }

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            const u = session?.user ?? null
            setUser(u)
            if (u) {
                checkApproval(u.id)
            } else {
                setApproved(null)
            }
            setLoading(false)
        }).catch(() => {
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                const u = session?.user ?? null
                setUser(u)
                if (u) {
                    checkApproval(u.id)
                } else {
                    setApproved(null)
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error }
    }

    const signUp = async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password })
        return { error }
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        return { error }
    }

    const value = {
        user,
        loading,
        approved,
        signIn,
        signUp,
        signOut,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
