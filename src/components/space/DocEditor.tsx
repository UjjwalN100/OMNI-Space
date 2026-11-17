import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSpace } from '../../context/SpaceContext';
import { FileItem } from '../../types/space';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  Code, 
  Table, 
  Minus, 
  CheckCircle2, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  Eye, 
  Columns, 
  Edit3, 
  Download, 
  Printer, 
  Copy,
  Sparkles,
  FileText,
  X
} from 'lucide-react';

interface DocEditorProps {
  file: FileItem;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const DocEditor: React.FC<DocEditorProps> = ({
  file,
  isFullscreen = false,
  onToggleFullscreen,
  onClose
}) => {
  const { updateFileContent, downloadFile } = useSpace();

  const [title, setTitle] = useState(file.name);
  const [content, setContent] = useState(file.content || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if file changes
  useEffect(() => {
    setTitle(file.name);
    setContent(file.content || '');
    setSaveStatus('saved');
  }, [file.id]);

  // Debounced auto-save function (800ms)
  const triggerAutoSave = useCallback((newContent: string, newTitle: string) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      updateFileContent(file.id, newContent, newTitle);
      setSaveStatus('saved');
    }, 800);
  }, [file.id, updateFileContent]);

  // Handle content typing
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = e.target.value;
    setContent(nextContent);
    triggerAutoSave(nextContent, title);
  };

  // Handle title edit
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    triggerAutoSave(content, nextTitle);
  };

  // Manual save
  const handleManualSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    updateFileContent(file.id, content, title);
    setTimeout(() => setSaveStatus('saved'), 300);
  };

  // Formatting helpers to insert / wrap selection
  const applyFormat = (prefix: string, suffix: string = '', defaultText: string = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    const replacement = selected.length > 0 
      ? `${prefix}${selected}${suffix}` 
      : `${prefix}${defaultText}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    triggerAutoSave(newContent, title);

    // Reposition cursor inside wrapped text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selected.length > 0 
        ? start + replacement.length 
        : start + prefix.length + defaultText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Line-prefix helpers (Headings, lists, quotes)
  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Find the beginning of current line
    const lastNewline = content.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    setContent(newContent);
    triggerAutoSave(newContent, title);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  // Insert Table helper
  const insertTable = () => {
    const tableTemplate = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data A1 | Data B1 | Data C1 |\n| Data A2 | Data B2 | Data C2 |\n\n`;
    applyFormat(tableTemplate, '', '');
  };

  // Insert Callout helper
  const insertCallout = () => {
    const calloutTemplate = `\n> 💡 **Key Takeaway**:\n> Add your summary, actionable insights, or meeting notes here.\n\n`;
    applyFormat(calloutTemplate, '', '');
  };

  // Keyboard shortcut listener (Ctrl+B, Ctrl+I, Ctrl+S)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      applyFormat('**', '**', 'bold text');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      applyFormat('*', '*', 'italic text');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleManualSave();
    }
  };

  // Print document
  const handlePrint = () => {
    window.print();
  };

  // Metrics calculation
  const wordCount = content.trim().length > 0 ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Interactive Checklist toggle inside preview
  const handleToggleTaskInPreview = (taskLineIndex: number) => {
    const lines = content.split('\n');
    let taskCount = 0;

    const updatedLines = lines.map(line => {
      const match = line.match(/^(\s*-\s*\[)([ xX])(\]\s*.*)$/);
      if (match) {
        if (taskCount === taskLineIndex) {
          const isChecked = match[2].toLowerCase() === 'x';
          const newStatus = isChecked ? ' ' : 'x';
          taskCount++;
          return `${match[1]}${newStatus}${match[3]}`;
        }
        taskCount++;
      }
      return line;
    });

    const newContent = updatedLines.join('\n');
    setContent(newContent);
    triggerAutoSave(newContent, title);
  };

  // Copy code block helper
  const handleCopyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Custom Rich Markdown Renderer
  const renderFormattedPreview = () => {
    if (!content.trim()) {
      return (
        <div className="text-center py-24 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#16A085]" />
          <p className="text-sm font-medium">This document is blank.</p>
          <p className="text-xs text-slate-500 mt-1">Start typing or use the formatting toolbar above to write content.</p>
        </div>
      );
    }

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeBlockIdx = 0;
    let inTable = false;
    let tableBuffer: string[] = [];
    let taskIdx = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block handling
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const codeString = codeBuffer.join('\n');
          const currentIdx = codeBlockIdx++;
          elements.push(
            <div key={`code-${i}`} className="my-4 rounded-2xl bg-[#0F141C] border border-white/10 overflow-hidden shadow-lg group">
              <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/5 text-[11px] text-slate-400 font-mono">
                <span>Code Block</span>
                <button
                  onClick={() => handleCopyCode(codeString, currentIdx)}
                  className="flex items-center gap-1 hover:text-white transition"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCodeIdx === currentIdx ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                <code>{codeString}</code>
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Markdown Table handling
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true;
        tableBuffer.push(line);
        if (i === lines.length - 1 || !lines[i + 1]?.trim().startsWith('|')) {
          // Render table
          const rawRows = tableBuffer.map(r => r.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim()));
          const headers = rawRows[0] || [];
          const dataRows = rawRows.slice(2); // Skip separator row

          elements.push(
            <div key={`table-${i}`} className="my-5 overflow-x-auto rounded-2xl border border-[var(--border-line)] shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#16A085]/10 border-b border-[var(--border-line)] text-[#16A085] font-bold">
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} className="py-2.5 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-line)]">
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-white/[0.03]'}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-2 px-4 text-[var(--text-main)]">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          tableBuffer = [];
          inTable = false;
        }
        continue;
      }

      // Horizontal Divider
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(<hr key={`hr-${i}`} className="my-6 border-[var(--border-line)]" />);
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight mt-6 mb-3 pb-2 border-b border-[var(--border-line)]">
            {line.replace('# ', '')}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-xl sm:text-2xl font-bold text-[var(--text-main)] tracking-tight mt-5 mb-2">
            {line.replace('## ', '')}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base sm:text-lg font-bold text-[var(--text-main)] mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
        continue;
      }

      // Checklists / Tasks
      const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        const isChecked = taskMatch[2].toLowerCase() === 'x';
        const taskText = taskMatch[3];
        const currentTaskIdx = taskIdx++;
        elements.push(
          <div 
            key={`task-${i}`} 
            onClick={() => handleToggleTaskInPreview(currentTaskIdx)}
            className="flex items-center gap-3 py-1 cursor-pointer group select-none transition-colors"
          >
            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
              isChecked 
                ? 'bg-[#16A085] border-[#16A085] text-white shadow-xs' 
                : 'border-slate-500 hover:border-[#16A085]'
            }`}>
              {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <span className={`text-xs sm:text-sm ${
              isChecked 
                ? 'line-through text-slate-500 dark:text-slate-500' 
                : 'text-[var(--text-main)] group-hover:text-[#16A085]'
            }`}>
              {taskText}
            </span>
          </div>
        );
        continue;
      }

      // Bullet Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <div key={`bullet-${i}`} className="flex items-start gap-2.5 py-0.5 text-xs sm:text-sm text-[var(--text-main)]">
            <span className="text-[#16A085] font-bold mt-1 text-xs">•</span>
            <span className="leading-relaxed">{line.replace(/^(\s*[-*]\s+)/, '')}</span>
          </div>
        );
        continue;
      }

      // Blockquote / Callouts
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote 
            key={`quote-${i}`} 
            className="my-3 pl-4 py-2 border-l-4 border-[#16A085] bg-[#16A085]/5 rounded-r-xl text-xs sm:text-sm italic text-[var(--text-main)] leading-relaxed"
          >
            {line.replace('> ', '')}
          </blockquote>
        );
        continue;
      }

      // Empty line spacer
      if (!line.trim()) {
        elements.push(<div key={`empty-${i}`} className="h-3" />);
        continue;
      }

      // Normal paragraph
      elements.push(
        <p key={`p-${i}`} className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed my-1">
          {line}
        </p>
      );
    }

    return <div className="space-y-1 font-sans">{elements}</div>;
  };

  return (
    <div className={`flex flex-col h-full bg-[var(--surface-bg)] text-[var(--text-main)] select-text ${
      isFullscreen ? 'fixed inset-0 z-50' : 'relative'
    }`}>
      {/* 1. TOP DOCUMENT CONTROL BAR */}
      <div className="h-14 border-b border-[var(--border-line)] px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 bg-white/[0.02]">
        {/* Document Title & File Extension */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled Document"
              className="font-bold text-sm sm:text-base text-[var(--text-main)] bg-transparent hover:bg-white/5 focus:bg-white/10 rounded-lg px-2 py-1 border border-transparent focus:border-[#16A085]/50 focus:outline-none transition-all truncate"
            />
            <span className="text-xs font-mono text-slate-500 shrink-0">.{file.extension}</span>
          </div>

          {/* Real-time Save Status Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-[var(--border-line)] text-[11px]">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-400 font-medium">Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-slate-400">Saved to Cloud</span>
              </>
            )}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Word Count Badge */}
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 px-2 py-1 rounded-lg bg-white/[0.02] font-mono">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{readTimeMinutes} min read</span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-[var(--border-line)]">
            <button
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'edit' ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Editor Only"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'split' ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Split View (Editor + Live Preview)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'preview' ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Reading View"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          {/* Print / Export button */}
          <button
            onClick={handlePrint}
            className="p-2 text-slate-400 hover:text-[var(--text-main)] rounded-xl hover:bg-white/10 transition"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Download button */}
          <button
            onClick={() => downloadFile(file)}
            className="p-2 text-slate-400 hover:text-[var(--text-main)] rounded-xl hover:bg-white/10 transition"
            title="Download Document"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 text-slate-400 hover:text-[var(--text-main)] rounded-xl hover:bg-white/10 transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Close Editor button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-[var(--text-main)] rounded-xl hover:bg-white/10 transition border-l border-[var(--border-line)] pl-2.5 ml-1"
              title="Close Editor"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. FORMATTING TOOLBAR RIBBON (Visible in Edit & Split mode) */}
      {viewMode !== 'preview' && (
        <div className="border-b border-[var(--border-line)] px-4 py-2 bg-white/[0.02] flex items-center gap-1 flex-wrap overflow-x-auto text-xs shrink-0 select-none">
          {/* Headings */}
          <button
            onClick={() => applyLinePrefix('# ')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4 text-blue-400" />
          </button>
          <button
            onClick={() => applyLinePrefix('## ')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={() => applyLinePrefix('### ')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4 text-amber-400" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Inline Styles */}
          <button
            onClick={() => applyFormat('**', '**', 'bold text')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition font-bold"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormat('*', '*', 'italic text')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition italic"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormat('<u>', '</u>', 'underlined text')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormat('~~', '~~', 'strikethrough text')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Lists & Tasks */}
          <button
            onClick={() => applyLinePrefix('- ')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyLinePrefix('1. ')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyLinePrefix('- [ ] ')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Task Checklist"
          >
            <CheckSquare className="w-4 h-4 text-[#16A085]" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Inserts: Table, Quote, Code, Callout, Rule */}
          <button
            onClick={insertTable}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Insert Table Grid"
          >
            <Table className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline text-[11px]">Table</span>
          </button>
          <button
            onClick={() => applyLinePrefix('> ')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormat('```\n', '\n```', 'code here')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Code Block"
          >
            <Code className="w-4 h-4 text-purple-400" />
          </button>
          <button
            onClick={insertCallout}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Callout Box"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={() => applyFormat('\n---\n', '', '')}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Divider Line"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. DOCUMENT BODY CANVAS */}
      <div className="flex-1 overflow-hidden flex">
        {/* Editor Pane */}
        {viewMode !== 'preview' && (
          <div className={`h-full flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-[var(--border-line)]' : 'w-full'}`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Start writing your thoughts, documentation, plans, or notes..."
              className="flex-1 w-full p-6 sm:p-8 bg-transparent text-[var(--text-main)] font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 overflow-y-auto selection:bg-[#16A085]/30"
              spellCheck="false"
            />
          </div>
        )}

        {/* Formatted Preview Pane */}
        {viewMode !== 'edit' && (
          <div className={`h-full overflow-y-auto p-6 sm:p-10 ${
            viewMode === 'split' ? 'w-1/2' : 'w-full max-w-4xl mx-auto'
          }`}>
            <div className="max-w-3xl mx-auto">
              {renderFormattedPreview()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
