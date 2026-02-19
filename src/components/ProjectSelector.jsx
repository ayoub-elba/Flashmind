import { useState, useRef, useEffect } from 'react'
import { useProject, PROJECT_COLORS } from '../contexts/ProjectContext'
import { ChevronDown, Plus, X, Check, Trash2, Loader2 } from 'lucide-react'

export default function ProjectSelector() {
    const {
        projects,
        activeProject,
        setActiveProject,
        createProject,
        deleteProject,
    } = useProject()

    const [open, setOpen] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0])
    const [creating, setCreating] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const inputRef = useRef(null)

    useEffect(() => {
        if (showCreate && inputRef.current) {
            inputRef.current.focus()
        }
    }, [showCreate])

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        const project = await createProject(newName.trim(), selectedColor)
        if (project) {
            setActiveProject(project)
            setNewName('')
            setSelectedColor(PROJECT_COLORS[0])
            setShowCreate(false)
            setOpen(false)
        }
        setCreating(false)
    }

    const handleDelete = async (e, projectId) => {
        e.stopPropagation()
        if (projects.length <= 1) {
            alert('You need at least one project.')
            return
        }
        if (!confirm('Delete this project and ALL its cards?')) return
        setDeletingId(projectId)
        await deleteProject(projectId)
        setDeletingId(null)
    }

    const closeDropdown = () => {
        setOpen(false)
        setShowCreate(false)
        setNewName('')
    }

    if (!activeProject) return null

    return (
        <div className="relative">
            {/* Trigger button */}
            <button
                onClick={() => {
                    if (open) {
                        closeDropdown()
                    } else {
                        setOpen(true)
                    }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm"
            >
                <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeProject.color }}
                />
                <span className="text-white font-medium max-w-[140px] truncate">
                    {activeProject.name}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Backdrop — closes dropdown on click outside */}
            {open && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={closeDropdown}
                />
            )}

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 border border-white/10 rounded-xl shadow-2xl shadow-black/50 z-50">
                    {/* Project list */}
                    <div className="max-h-64 overflow-y-auto py-1">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => {
                                    setActiveProject(project)
                                    closeDropdown()
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${project.id === activeProject.id
                                        ? 'bg-indigo-500/10 text-white'
                                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: project.color }}
                                />
                                <span className="flex-1 text-sm font-medium truncate">
                                    {project.name}
                                </span>
                                {project.id === activeProject.id && (
                                    <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                )}
                                {projects.length > 1 && (
                                    <button
                                        onClick={(e) => handleDelete(e, project.id)}
                                        className="p-1 text-slate-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                    >
                                        {deletingId === project.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/10" />

                    {/* Create new project */}
                    {showCreate ? (
                        <div className="p-3 space-y-3">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Project name..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate()
                                    if (e.key === 'Escape') {
                                        setShowCreate(false)
                                        setNewName('')
                                    }
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                            />
                            {/* Color picker */}
                            <div className="flex flex-wrap gap-1.5">
                                {PROJECT_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-6 h-6 rounded-full transition-all ${selectedColor === color
                                                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110'
                                                : 'hover:scale-110'
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowCreate(false)
                                        setNewName('')
                                    }}
                                    className="flex-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={creating || !newName.trim()}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                    Create
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-400 hover:bg-white/5 transition-colors rounded-b-xl"
                        >
                            <Plus className="w-4 h-4" />
                            New Project
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
