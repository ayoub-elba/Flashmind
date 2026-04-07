import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'

export function useFlashcards() {
    const { user } = useAuth() as any
    const { activeProject } = useProject() as any

    return useQuery({
        queryKey: ['flashcards', user?.id, activeProject?.id],
        queryFn: async () => {
            if (!user?.id || !activeProject?.id) return []

            const { data, error } = await supabase
                .from('flashcards')
                .select('*')
                .eq('user_id', user.id)
                .eq('project_id', activeProject.id)
                .order('created_at', { ascending: false })

            if (error) throw new Error(error.message)
            return data || []
        },
        // Only run this query when both user and activeProject are truthy
        enabled: !!user?.id && !!activeProject?.id,
        // Set staleTime to a few minutes. We will invalidate the cache manually when making changes.
        staleTime: 5 * 60 * 1000, 
    })
}
