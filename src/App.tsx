import { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, CheckSquare, Plus, FolderPlus, FileText, 
  Download, Eye, Edit3, Columns, CheckCircle2, Circle, 
  Sparkles, Save, Search, X, Pin, 
  Play, Pause, RotateCcw, Clock, Tag, ArrowUpDown, ChevronRight, Menu
} from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { saveLocalData, loadLocalData } from './lib/storage';

interface Task {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  tags: string[];
  isPinned?: boolean;
}

interface Subject {
  id: string;
  name: string;
  color: string;
  notes: Note[];
  tasks: Task[];
}

type EditorMode = 'edit' | 'preview' | 'split';
type TaskFilter = 'all' | 'pending' | 'completed';
type TaskSort = 'date' | 'default';

const COLOR_OPTIONS = [
  { name: 'Zinc', class: 'bg-zinc-400 shadow-zinc-400/50' },
  { name: 'Emerald', class: 'bg-emerald-400 shadow-emerald-400/50' },
  { name: 'Blue', class: 'bg-blue-400 shadow-blue-400/50' },
  { name: 'Violet', class: 'bg-violet-400 shadow-violet-400/50' },
  { name: 'Rose', class: 'bg-rose-400 shadow-rose-400/50' },
  { name: 'Amber', class: 'bg-amber-400 shadow-amber-400/50' },
];

const DEFAULT_DATA: Subject[] = [
  {
    id: '1',
    name: 'Computer Science',
    color: 'bg-emerald-400 shadow-emerald-400/50',
    notes: [{ 
      id: 'n1', 
      title: 'Data Structures', 
      content: '# Data Structures\n\n- Binary Trees\n- Graphs\n\n```python\n# Graph Representation\nadj_list = {\n    "A": ["B", "C"],\n    "B": ["D"]\n}\n```', 
      updatedAt: 'Just now',
      tags: ['algorithms', 'exam'],
      isPinned: true
    }],
    tasks: [{ id: 't1', title: 'Finish Assignment 2', dueDate: '2026-09-10', completed: false }]
  }
];

export default function App() {
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  const [activeSubjectId, setActiveSubjectId] = useState<string>('');
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks'>('notes');
  const [editorMode, setEditorMode] = useState<EditorMode>('split');
  const [taskFilter] = useState<TaskFilter>('all');
  const [taskSort, setTaskSort] = useState<TaskSort>('default');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  
  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pomodoro Timer
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');

  // Modals & Search
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[1].class);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // 1. Initial Load from Device Storage
  useEffect(() => {
    async function initStorage() {
      const savedData = await loadLocalData();
      if (savedData && Array.isArray(savedData) && savedData.length > 0) {
        setSubjects(savedData);
        setActiveSubjectId(savedData[0].id);
        setActiveNoteId(savedData[0].notes[0]?.id || '');
      } else {
        setActiveSubjectId(DEFAULT_DATA[0].id);
        setActiveNoteId(DEFAULT_DATA[0].notes[0]?.id || '');
      }
      setIsLoaded(true);
    }
    initStorage();
  }, []);

  // 2. Auto-save to Local Filesystem
  useEffect(() => {
    if (!isLoaded) return;

    setIsSaved(false);
    const timeout = setTimeout(async () => {
      const success = await saveLocalData(subjects);
      if (success) setIsSaved(true);
    }, 500);

    return () => clearTimeout(timeout);
  }, [subjects, isLoaded]);

  // Pomodoro Engine
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (pomoActive && pomoTime > 0) {
      timer = setInterval(() => setPomoTime(t => t - 1), 1000);
    } else if (pomoTime === 0) {
      if (pomoMode === 'work') {
        setPomoMode('break');
        setPomoTime(5 * 60);
      } else {
        setPomoMode('work');
        setPomoTime(25 * 60);
      }
      setPomoActive(false);
    }
    return () => clearInterval(timer);
  }, [pomoActive, pomoTime, pomoMode]);

  const formatPomoTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];
  const activeNote = activeSubject?.notes.find(n => n.id === activeNoteId);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    subjects.forEach(s => s.notes?.forEach(n => n.tags?.forEach(t => tags.add(t))));
    return Array.from(tags);
  }, [subjects]);

  const wordCount = useMemo(() => activeNote?.content?.trim().split(/\s+/).filter(Boolean).length || 0, [activeNote?.content]);
  const charCount = useMemo(() => activeNote?.content?.length || 0, [activeNote?.content]);

  const sortedNotes = useMemo(() => {
    if (!activeSubject) return [];
    const filtered = (activeSubject.notes || []).filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(noteSearchQuery.toLowerCase()) || n.content.toLowerCase().includes(noteSearchQuery.toLowerCase());
      const matchesTag = selectedTag ? n.tags?.includes(selectedTag) : true;
      return matchesSearch && matchesTag;
    });
    return [...filtered].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [activeSubject, noteSearchQuery, selectedTag]);

  const sortedTasks = useMemo(() => {
    if (!activeSubject) return [];
    let list = activeSubject.tasks || [];
    if (taskFilter === 'pending') list = list.filter(t => !t.completed);
    if (taskFilter === 'completed') list = list.filter(t => t.completed);
    
    if (taskSort === 'date') {
      return [...list].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }
    return list;
  }, [activeSubject, taskFilter, taskSort]);

  const addTagToActiveNote = () => {
    if (!tagInput.trim() || !activeNote) return;
    const cleanTag = tagInput.trim().toLowerCase().replace('#', '');
    if (activeNote.tags?.includes(cleanTag)) return;

    setSubjects(subjects.map(s => {
      if (s.id !== activeSubjectId) return s;
      return {
        ...s,
        notes: s.notes.map(n => n.id === activeNoteId ? { ...n, tags: [...(n.tags || []), cleanTag] } : n)
      };
    }));
    setTagInput('');
  };

  const removeTagFromActiveNote = (tagToRemove: string) => {
    setSubjects(subjects.map(s => {
      if (s.id !== activeSubjectId) return s;
      return {
        ...s,
        notes: s.notes.map(n => n.id === activeNoteId ? { ...n, tags: n.tags.filter(t => t !== tagToRemove) } : n)
      };
    }));
  };

  const exportSingleNoteMd = async () => {
    if (!activeNote) return;
    try {
      const filePath = await save({
        defaultPath: `${activeNote.title || 'note'}.md`,
        filters: [{ name: 'Markdown File', extensions: ['md'] }]
      });
      if (filePath) {
        await saveLocalData({ exportedPath: filePath, content: activeNote.content });
      }
    } catch (err) {
      console.error('Failed to export markdown:', err);
    }
  };

  const togglePinNote = (noteId: string) => {
    setSubjects(subjects.map(s => {
      if (s.id !== activeSubjectId) return s;
      return { ...s, notes: s.notes.map(n => n.id === noteId ? { ...n, isPinned: !n.isPinned } : n) };
    }));
  };

  const addSubject = () => {
    if (!newSubjectName.trim()) return;
    const newSub: Subject = { id: Date.now().toString(), name: newSubjectName, color: selectedColor, notes: [], tasks: [] };
    setSubjects([...subjects, newSub]);
    setActiveSubjectId(newSub.id);
    setNewSubjectName('');
    setShowSubjectModal(false);
  };

  const addNote = () => {
    if (!activeSubject) return;
    const newNote: Note = { id: Date.now().toString(), title: 'Untitled Note', content: '', updatedAt: 'Just now', tags: [] };
    setSubjects(subjects.map(s => s.id === activeSubject.id ? { ...s, notes: [newNote, ...s.notes] } : s));
    setActiveNoteId(newNote.id);
  };

  const updateActiveNote = (title: string, content: string) => {
    setSubjects(subjects.map(s => {
      if (s.id !== activeSubjectId) return s;
      return { ...s, notes: s.notes.map(n => n.id === activeNoteId ? { ...n, title, content, updatedAt: 'Just now' } : n) };
    }));
  };

  const addTask = (title: string, dueDate: string) => {
    if (!activeSubject || !title.trim()) return;
    const newTask: Task = { id: Date.now().toString(), title, dueDate, completed: false };
    setSubjects(subjects.map(s => s.id === activeSubject.id ? { ...s, tasks: [newTask, ...s.tasks] } : s));
  };

  const toggleTask = (taskId: string) => {
    setSubjects(subjects.map(s => {
      if (s.id !== activeSubjectId) return s;
      return { ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) };
    }));
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#09090b] text-zinc-200 overflow-hidden text-xs antialiased font-sans select-none">
      
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between p-3 bg-[#09090b] border-b border-zinc-800">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 bg-zinc-900 rounded-md border border-zinc-800">
          <Menu className="w-4 h-4 text-zinc-300" />
        </button>
        <span className="font-semibold text-xs text-white uppercase tracking-wider">StudyHub</span>
        <span className="text-[9px] font-mono text-zinc-500">{isSaved ? 'Saved' : 'Saving...'}</span>
      </div>

      {/* PANE 1: Left Navigation Sidebar */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:flex w-full md:w-60 bg-[#09090b] border-r border-zinc-800/60 flex-col p-3.5 justify-between shrink-0 z-40`}>
        <div className="space-y-4 overflow-y-auto">
          
          {/* Header Branding */}
          <div className="hidden md:flex items-center justify-between px-1">
            <h1 className="font-semibold text-xs tracking-wider text-white uppercase flex items-center gap-2">
              <div className="p-1 bg-zinc-800/80 rounded-md border border-zinc-700/50">
                <BookOpen className="w-3.5 h-3.5 text-zinc-200" />
              </div>
              StudyHub
            </h1>
            <button 
              onClick={() => setShowSubjectModal(true)} 
              className="p-1 hover:bg-zinc-800/70 rounded-md text-zinc-400 hover:text-white transition active:scale-95"
              title="Add Subject"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Search Trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full bg-zinc-900/60 hover:bg-zinc-800/50 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-zinc-400 text-[11px] transition shadow-inner"
          >
            <span className="flex items-center gap-2"><Search className="w-3 h-3 text-zinc-500" /> Quick Search</span>
            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-400 border border-zinc-700/50">⌘K</span>
          </button>

          {/* Pomodoro Timer Glass Card */}
          <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-900/30 p-3 rounded-xl border border-zinc-800/80 space-y-2.5 shadow-sm backdrop-blur-md">
            <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-zinc-400" /> Focus</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${pomoMode === 'work' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'}`}>
                {pomoMode}
              </span>
            </div>
            <div className="text-2xl font-mono text-center tracking-wider text-white font-semibold">
              {formatPomoTime(pomoTime)}
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <button 
                onClick={() => setPomoActive(!pomoActive)} 
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md border border-zinc-700/60 shadow transition active:scale-95 flex items-center gap-1 text-[11px]"
              >
                {pomoActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {pomoActive ? 'Pause' : 'Start'}
              </button>
              <button 
                onClick={() => { setPomoActive(false); setPomoTime(25 * 60); }} 
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-md border border-zinc-800 transition active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Tags Section */}
          {allTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-zinc-500 px-1 font-semibold">
                <span>Filter Tags</span>
                {selectedTag && (
                  <button onClick={() => setSelectedTag(null)} className="text-zinc-400 hover:text-white font-normal lowercase hover:underline">reset</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 px-0.5">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition border ${selectedTag === tag ? 'bg-zinc-200 text-zinc-900 border-white font-semibold' : 'bg-zinc-900/80 text-zinc-400 border-zinc-800/80 hover:border-zinc-700 hover:text-zinc-200'}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subjects Navigation */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 px-1 font-semibold mb-1.5">Subjects</div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {subjects.map(sub => (
                <div
                  key={sub.id}
                  onClick={() => { setActiveSubjectId(sub.id); setActiveNoteId(sub.notes[0]?.id || ''); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer group transition-all duration-150 ${sub.id === activeSubjectId ? 'bg-zinc-800/90 text-white font-medium border border-zinc-700/60 shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}
                >
                  <span className={`w-2 h-2 rounded-full shadow-sm ${sub.color}`}></span>
                  <span className="truncate flex-1 text-left tracking-tight">{sub.name}</span>
                  <ChevronRight className={`w-3 h-3 text-zinc-600 transition-transform ${sub.id === activeSubjectId ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-100'}`} />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Sync Footer */}
        <div className="pt-3 border-t border-zinc-800/60 px-1 hidden md:flex items-center justify-between text-[10px] text-zinc-500">
          <span className="flex items-center gap-1.5 font-mono text-[9px]">
            <Save className={`w-3 h-3 ${isSaved ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
            {isSaved ? 'Local Storage Saved' : 'Auto Saving...'}
          </span>
        </div>
      </div>

      {/* PANE 2: Item List Pane */}
      <div className="w-full md:w-64 bg-[#0c0c0e] border-r border-zinc-800/60 flex flex-col shrink-0 select-none">
        
        {/* Tab Toggle */}
        <div className="p-3 border-b border-zinc-800/60 space-y-2.5">
          <div className="flex bg-zinc-900/80 p-1 rounded-lg border border-zinc-800/80">
            <button 
              onClick={() => setActiveTab('notes')} 
              className={`flex-1 py-1 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${activeTab === 'notes' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <FileText className="w-3 h-3" /> Notes
            </button>
            <button 
              onClick={() => setActiveTab('tasks')} 
              className={`flex-1 py-1 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${activeTab === 'tasks' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <CheckSquare className="w-3 h-3" /> Tasks
            </button>
          </div>

          {activeTab === 'notes' ? (
            <input 
              type="text" 
              placeholder="Search in active subject..." 
              value={noteSearchQuery} 
              onChange={(e) => setNoteSearchQuery(e.target.value)} 
              className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition" 
            />
          ) : (
            <div className="flex justify-between items-center text-[10px] px-1 text-zinc-400">
              <span>Sort Order:</span>
              <button onClick={() => setTaskSort(taskSort === 'default' ? 'date' : 'default')} className="flex items-center gap-1 text-zinc-300 hover:text-white font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                <ArrowUpDown className="w-2.5 h-2.5" /> {taskSort === 'date' ? 'Due Date' : 'Default'}
              </button>
            </div>
          )}
        </div>

        {/* Content Lists */}
        {activeTab === 'notes' ? (
          <div className="flex-1 flex flex-col p-2.5 overflow-hidden">
            <button 
              onClick={addNote} 
              className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg flex items-center justify-center gap-1.5 mb-2.5 text-xs font-medium tracking-tight transition active:scale-98 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" /> New Note
            </button>
            
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
              {sortedNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`p-2.5 rounded-lg border group relative cursor-pointer transition-all ${note.id === activeNoteId ? 'bg-zinc-800/80 border-zinc-700/80 shadow-md' : 'bg-transparent border-transparent hover:bg-zinc-900/50 hover:border-zinc-800/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-xs text-zinc-100 truncate tracking-tight pr-4 flex items-center gap-1.5">
                      {note.isPinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400/20" />}
                      {note.title || 'Untitled Note'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePinNote(note.id); }} 
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-amber-400 transition"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-zinc-500">{note.updatedAt}</span>
                    <div className="flex gap-1">
                      {note.tags?.map(t => <span key={t} className="text-[9px] font-mono text-zinc-400 bg-zinc-900 px-1 rounded border border-zinc-800">#{t}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 p-2.5 flex flex-col overflow-hidden">
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('taskTitle') as HTMLInputElement;
              const date = form.elements.namedItem('taskDate') as HTMLInputElement;
              addTask(input.value, date.value);
              form.reset();
            }} className="mb-2.5 space-y-2 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
              <input name="taskTitle" placeholder="Add task description..." className="w-full bg-zinc-950/80 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-700" required />
              <div className="flex gap-1.5">
                <input name="taskDate" type="date" className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none focus:border-zinc-700" required />
                <button type="submit" className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700/60 rounded text-xs font-medium transition">Add</button>
              </div>
            </form>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
              {sortedTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 p-2 bg-zinc-900/40 border border-zinc-800/60 rounded-lg">
                  <button onClick={() => toggleTask(task.id)} className="text-zinc-500 hover:text-white transition">
                    {task.completed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Circle className="w-3.5 h-3.5 text-zinc-600" />}
                  </button>
                  <span className={`flex-1 text-xs tracking-tight truncate ${task.completed ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>{task.title}</span>
                  <span className="text-[9px] text-zinc-500 font-mono">{task.dueDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PANE 3: Main Markdown Workspace */}
      <div className="flex-1 bg-[#09090b] flex flex-col overflow-hidden">
        {activeNote ? (
          <div className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full h-full overflow-hidden">
            
            {/* Note Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-3">
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) => updateActiveNote(e.target.value, activeNote.content)}
                placeholder="Note Title"
                className="bg-transparent text-xl md:text-2xl font-bold text-white focus:outline-none flex-1 tracking-tight placeholder:text-zinc-700"
              />
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportSingleNoteMd} 
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition shadow-sm" 
                  title="Export Markdown File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <div className="flex bg-zinc-900/80 p-1 rounded-lg border border-zinc-800">
                  <button onClick={() => setEditorMode('edit')} className={`p-1.5 rounded-md transition ${editorMode === 'edit' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditorMode('split')} className={`p-1.5 rounded-md transition ${editorMode === 'split' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}><Columns className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditorMode('preview')} className={`p-1.5 rounded-md transition ${editorMode === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}><Eye className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>

            {/* Note Tag Management */}
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800/30">
              <Tag className="w-3 h-3 text-zinc-500" />
              <div className="flex flex-wrap gap-1.5 items-center">
                {activeNote.tags?.map(tag => (
                  <span key={tag} className="bg-zinc-900/80 border border-zinc-800 text-zinc-300 font-mono text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    #{tag}
                    <button onClick={() => removeTagFromActiveNote(tag)} className="text-zinc-500 hover:text-white"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
                <form onSubmit={(e) => { e.preventDefault(); addTagToActiveNote(); }}>
                  <input
                    type="text"
                    placeholder="+ add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="bg-transparent text-[10px] font-mono text-zinc-500 focus:outline-none focus:text-zinc-200 w-20"
                  />
                </form>
              </div>
            </div>

            {/* Markdown Workspace */}
            <div className="flex-1 flex gap-6 overflow-hidden">
              {(editorMode === 'edit' || editorMode === 'split') && (
                <textarea
                  value={activeNote.content}
                  onChange={(e) => updateActiveNote(activeNote.title, e.target.value)}
                  placeholder="Start typing markdown..."
                  className="flex-1 bg-transparent text-zinc-300 resize-none focus:outline-none text-xs leading-relaxed font-mono overflow-y-auto selection:bg-zinc-800"
                />
              )}
              {editorMode === 'split' && <div className="w-[1px] bg-zinc-800/60 h-full"></div>}
              {(editorMode === 'preview' || editorMode === 'split') && (
                <div className="flex-1 overflow-y-auto markdown-preview text-xs text-zinc-300 select-text leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeNote.content || '_No content yet._'}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* Editor Footer */}
            <div className="pt-3 border-t border-zinc-800/60 mt-3 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>{wordCount} words | {charCount} characters</span>
              <span className="text-zinc-600">Local Filesystem Storage</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-xs tracking-tight gap-2">
            <Sparkles className="w-6 h-6 text-zinc-700 animate-pulse" />
            <span>Select or create a note to start writing</span>
          </div>
        )}
      </div>

      {/* Command Palette Modal */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-center pt-24 z-50">
          <div className="bg-[#0c0c0e] border border-zinc-800 w-[90%] md:w-[520px] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center px-3.5 border-b border-zinc-800">
              <Search className="w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Type to search notes across all subjects..." 
                value={commandQuery} 
                onChange={(e) => setCommandQuery(e.target.value)} 
                className="w-full bg-transparent p-3.5 text-xs text-white focus:outline-none placeholder:text-zinc-600" 
                autoFocus 
              />
              <button onClick={() => setCommandPaletteOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c0c0e] border border-zinc-800 p-6 rounded-xl w-full max-w-xs space-y-4 shadow-2xl">
            <h3 className="font-semibold text-white text-xs">Create New Subject</h3>
            <input 
              type="text" 
              placeholder="Subject Name" 
              value={newSubjectName} 
              onChange={(e) => setNewSubjectName(e.target.value)} 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-zinc-700" 
              autoFocus 
            />
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-medium">Color Accent</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.class} onClick={() => setSelectedColor(c.class)} className={`w-6 h-6 rounded-full ${c.class} border-2 ${selectedColor === c.class ? 'border-white scale-110' : 'border-transparent'} transition`} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowSubjectModal(false)} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={addSubject} className="px-3 py-1.5 text-xs bg-zinc-200 text-zinc-900 font-semibold rounded-lg hover:bg-white transition">Create</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}