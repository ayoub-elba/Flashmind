import { useState, useRef, useEffect } from 'react'
import { useProject, PROJECT_COLORS } from '../contexts/ProjectContext'
import { ChevronDown, Plus, Check, Trash2, Loader2, Pencil } from 'lucide-react'

export default function ProjectSelector() {
    const {
        projects,
        activeProject,
        setActiveProject,
        createProject,
        deleteProject,
        renameProject,
    } = useProject()

    const [open, setOpen] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0])
    const [creating, setCreating] = useState(false)
    // Rename state
    const [renamingId, setRenamingId] = useState(null)
    const [renameValue, setRenameValue] = useState('')
    const [savingRename, setSavingRename] = useState(false)

    const inputRef = useRef(null)
    const renameInputRef = useRef(null)

    useEffect(() => {
        if (showCreate && inputRef.current) {
            inputRef.current.focus()
        }
    }, [showCreate])

    useEffect(() => {
        if (renamingId && renameInputRef.current) {
            renameInputRef.current.focus()
            renameInputRef.current.select()
        }
    }, [renamingId])

    const closeAll = () => {
        setOpen(false)
        setShowCreate(false)
        setNewName('')
        setRenamingId(null)
        setRenameValue('')
    }

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        const project = await createProject(newName.trim(), selectedColor)
        if (project) {
            setActiveProject(project)
        }
        setNewName('')
        setSelectedColor(PROJECT_COLORS[0])
        setShowCreate(false)
        setOpen(false)
        setCreating(false)
    }

    const handleStartRename = (e, project) => {
        e.preventDefault()
        e.stopPropagation()
        setRenamingId(project.id)
        setRenameValue(project.name)
    }

    const handleSaveRename = async () => {
        if (!renameValue.trim() || !renamingId) return
        setSavingRename(true)
        await renameProject(renamingId, renameValue.trim())
        setRenamingId(null)
        setRenameValue('')
        setSavingRename(false)
    }

    const handleCancelRename = () => {
        setRenamingId(null)
        setRenameValue('')
    }

    const handleDelete = (e, projectId) => {
        e.preventDefault()
        e.stopPropagation()
        if (projects.length <= 1) {
            alert('You need at least one project.')
            return
        }
        closeAll()
        setTimeout(async () => {
            if (!window.confirm('Delete this project and ALL its cards?')) return
            await deleteProject(projectId)
        }, 200)
    }

    if (!activeProject) return null

    return (
        <div className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => {
                    if (open) {
                        closeAll()
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

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute top-full left-0 mt-2 w-72 bg-slate-800 border border-white/10 rounded-xl shadow-2xl shadow-black/50"
                    style={{ zIndex: 9999 }}
                >
                    {/* Project list */}
                    <div className="max-h-64 overflow-y-auto py-1">
                        {projects.map((project) =>
                            renamingId === project.id ? (
                                /* Inline rename form */
                                <div key={project.id} className="px-3 py-2 flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: project.color }}
                                    />
                                    <input
                                        ref={renameInputRef}
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveRename()
                                            if (e.key === 'Escape') handleCancelRename()
                                        }}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveRename}
                                        disabled={savingRename || !renameValue.trim()}
                                        className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                                    >
                                        {savingRename ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            ) : (
                                /* Normal project row */
                                <div
                                    key={project.id}
                                    onClick={() => {
                                        setActiveProject(project)
                                        closeAll()
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
                                    {/* Rename button */}
                                    <span
                                        role="button"
                                        onClick={(e) => handleStartRename(e, project)}
                                        className="p-1 text-slate-500 hover:text-indigo-400 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 cursor-pointer"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </span>
                                    {/* Delete button */}
                                    {projects.length > 1 && (
                                        <span
                                            role="button"
                                            onClick={(e) => handleDelete(e, project.id)}
                                            className="p-1 text-slate-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 cursor-pointer"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </span>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/10" />

                    {/* Create form OR button */}
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
                            <div className="flex flex-wrap gap-1.5">
                                {PROJECT_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
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
                                    type="button"
                                    onClick={() => {
                                        setShowCreate(false)
                                        setNewName('')
                                    }}
                                    className="flex-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
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
                            type="button"
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
