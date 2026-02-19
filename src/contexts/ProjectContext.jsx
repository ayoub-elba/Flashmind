import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const ProjectContext = createContext({})

export function useProject() {
    return useContext(ProjectContext)
}

const PROJECT_COLORS = [
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#06b6d4', // cyan
]

export { PROJECT_COLORS }

export function ProjectProvider({ children }) {
    const { user } = useAuth()
    const [projects, setProjects] = useState([])
    const [activeProject, setActiveProjectState] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchProjects = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })

        if (!error && data) {
            setProjects(data)

            // Restore last active project from localStorage, or pick first
            const savedId = localStorage.getItem(`flashmind_active_project_${user.id}`)
            const saved = data.find((p) => p.id === savedId)
            if (saved) {
                setActiveProjectState(saved)
            } else if (data.length > 0) {
                setActiveProjectState(data[0])
            }

            // If user has no projects yet, create a default one
            if (data.length === 0) {
                await createProject('General', '#6366f1')
            }
        }
        setLoading(false)
    }, [user.id])

    useEffect(() => {
        fetchProjects()
    }, [fetchProjects])

    const setActiveProject = (project) => {
        setActiveProjectState(project)
        localStorage.setItem(`flashmind_active_project_${user.id}`, project.id)
    }

    const createProject = async (name, color = '#6366f1') => {
        const { data, error } = await supabase
            .from('projects')
            .insert({ user_id: user.id, name, color })
            .select()

        if (!error && data) {
            const newProjects = [...projects, data[0]]
            setProjects(newProjects)

            // If it's the first project, auto-select it
            if (!activeProject) {
                setActiveProject(data[0])
            }
            return data[0]
        }
        return null
    }

    const deleteProject = async (projectId) => {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)

        if (!error) {
            const remaining = projects.filter((p) => p.id !== projectId)
            setProjects(remaining)

            // If we deleted the active project, switch to first available
            if (activeProject?.id === projectId && remaining.length > 0) {
                setActiveProject(remaining[0])
            }
        }
        return !error
    }

    const renameProject = async (projectId, name) => {
        const { error } = await supabase
            .from('projects')
            .update({ name })
            .eq('id', projectId)

        if (!error) {
            setProjects(projects.map((p) =>
                p.id === projectId ? { ...p, name } : p
            ))
            if (activeProject?.id === projectId) {
                setActiveProjectState((prev) => ({ ...prev, name }))
            }
        }
        return !error
    }

    const updateProjectColor = async (projectId, color) => {
        const { error } = await supabase
            .from('projects')
            .update({ color })
            .eq('id', projectId)

        if (!error) {
            setProjects(projects.map((p) =>
                p.id === projectId ? { ...p, color } : p
            ))
            if (activeProject?.id === projectId) {
                setActiveProjectState((prev) => ({ ...prev, color }))
            }
        }
        return !error
    }

    const value = {
        projects,
        activeProject,
        setActiveProject,
        createProject,
        deleteProject,
        renameProject,
        updateProjectColor,
        loading,
        refreshProjects: fetchProjects,
    }

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    )
}
