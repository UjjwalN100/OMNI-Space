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
  Quote, 
  Table as TableIcon, 
  Minus, 
  CheckCircle2, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  Download, 
  Printer, 
  FileText,
  X,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Pilcrow,
  Plus,
  Trash2,
  ChevronDown
} from 'lucide-react';

interface DocEditorProps {
  file: FileItem;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Convert legacy markdown / raw symbols into rich HTML on initial load
function convertMarkdownToHtml(raw: string): string {
  if (!raw || !raw.trim()) {
    return '<p><br></p>';
  }

  // If already rich HTML, return directly
  if (raw.includes('<p>') || raw.includes('<div>') || raw.includes('<h1>') || raw.includes('<h2>') || raw.includes('<h3>') || raw.includes('<table')) {
    return raw;
  }

  let html = raw
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<b><i>$1</i></b>')
    .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*?)\*/gim, '<i>$1</i>')
    .replace(/~~(.*?)~~/gim, '<strike>$1</strike>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^---$/gim, '<hr>');

  // Wrap lines in <p> if not already heading, blockquote or hr
  const lines = html.split('\n');
  const wrapped = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '<p><br></p>';
    if (trimmed.startsWith('<h1') || trimmed.startsWith('<h2') || trimmed.startsWith('<h3') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr')) {
      return trimmed;
    }
    return `<p>${line}</p>`;
  });

  return wrapped.join('');
}

export const DocEditor: React.FC<DocEditorProps> = ({
  file,
  isFullscreen = false,
  onToggleFullscreen,
  onClose
}) => {
  const { updateFileContent, downloadFile } = useSpace();

  const [title, setTitle] = useState(file.name);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('saved');
  const [wordCount, setWordCount] = useState(0);

  // Active toolbar formatting states (bold, italic, underline, etc.)
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    h1: false,
    h2: false,
    h3: false,
    ul: false,
    ol: false,
    blockquote: false
  });

  // Table status and dropdown popover state
  const [isInsideTable, setIsInsideTable] = useState(false);
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);

  // Compute word count from inner text
  const updateMetrics = (text: string) => {
    const cleanText = text.trim();
    const count = cleanText.length > 0 ? cleanText.split(/\s+/).length : 0;
    setWordCount(count);
  };

  // Close table dropdown when clicking outside
  useEffect(() => {
    if (!isTableDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node)) {
        setIsTableDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTableDropdownOpen]);

  // Initialize editor content once on load
  useEffect(() => {
    setTitle(file.name);
    setSaveStatus('saved');
    if (editorRef.current) {
      const initialHtml = convertMarkdownToHtml(file.content || '');
      editorRef.current.innerHTML = initialHtml;
      updateMetrics(editorRef.current.innerText || '');
    }
  }, [file.id]);

  // Debounced auto-save (800ms)
  const triggerAutoSave = useCallback((newTitle: string) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
      updateFileContent(file.id, currentHtml, newTitle);
      setSaveStatus('saved');
    }, 800);
  }, [file.id, updateFileContent]);

  // Handle typing inside contentEditable
  const handleInput = () => {
    if (editorRef.current) {
      updateMetrics(editorRef.current.innerText || '');
    }
    triggerAutoSave(title);
    updateActiveStyles();
  };

  // Handle title edit
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    triggerAutoSave(nextTitle);
  };

  // Helper to find the current active cell, row, and table under cursor
  const getActiveCellAndTable = useCallback((): {
    cell: HTMLTableCellElement | null;
    row: HTMLTableRowElement | null;
    table: HTMLTableElement | null;
  } => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return { cell: null, row: null, table: null };

    let node: Node | null = selection.anchorNode;
    while (node && node !== editorRef.current && node !== document.body) {
      if (node.nodeName === 'TD' || node.nodeName === 'TH') {
        const cell = node as HTMLTableCellElement;
        const row = cell.closest('tr') as HTMLTableRowElement | null;
        const table = cell.closest('table') as HTMLTableElement | null;
        return { cell, row, table };
      }
      node = node.parentNode;
    }
    return { cell: null, row: null, table: null };
  }, []);

  // Update active toolbar button highlights based on cursor selection
  const updateActiveStyles = () => {
    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      const isStrike = document.queryCommandState('strikeThrough');
      const isUl = document.queryCommandState('insertUnorderedList');
      const isOl = document.queryCommandState('insertOrderedList');

      // Check current block format (h1, h2, h3, etc.)
      const blockValue = (document.queryCommandValue('formatBlock') || '').toLowerCase();

      // Check if inside a table
      const { table } = getActiveCellAndTable();
      setIsInsideTable(!!table);

      setActiveStyles({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        strike: isStrike,
        h1: blockValue === 'h1',
        h2: blockValue === 'h2',
        h3: blockValue === 'h3',
        ul: isUl,
        ol: isOl,
        blockquote: blockValue === 'blockquote'
      });
    } catch {
      // Ignore if document selection is unavailable
    }
  };

  // Execute rich-text format command
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      updateMetrics(editorRef.current.innerText || '');
    }
    triggerAutoSave(title);
    updateActiveStyles();
  };

  // Insert a fresh HTML Table (configurable rows and cols)
  const insertTable = (rows: number = 3, cols: number = 3) => {
    let headerCells = '';
    for (let c = 1; c <= cols; c++) {
      headerCells += `<th>Column ${c}</th>`;
    }
    let bodyRows = '';
    for (let r = 1; r < rows; r++) {
      let cells = '';
      for (let c = 1; c <= cols; c++) {
        cells += `<td>Cell ${r},${c}</td>`;
      }
      bodyRows += `<tr>${cells}</tr>`;
    }

    const tableHtml = `
      <table class="omni-doc-table">
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
      <p><br></p>
    `;
    executeCommand('insertHTML', tableHtml);
    setIsTableDropdownOpen(false);
  };

  // TABLE MANIPULATION: Add Row
  const handleAddRow = (below: boolean = true) => {
    const { row, table } = getActiveCellAndTable();
    if (!table) return;

    const targetRow = row || (table.rows.length > 0 ? table.rows[table.rows.length - 1] : null);
    const colCount = targetRow ? targetRow.cells.length : 3;

    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement('td');
      td.innerHTML = '<br>';
      newRow.appendChild(td);
    }

    if (targetRow && below) {
      targetRow.after(newRow);
    } else if (targetRow && !below) {
      targetRow.before(newRow);
    } else {
      table.appendChild(newRow);
    }

    // Place cursor into the first cell of the newly added row
    setTimeout(() => {
      const firstCell = newRow.cells[0];
      if (firstCell) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(firstCell);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 10);

    handleInput();
    setIsTableDropdownOpen(false);
  };

  // TABLE MANIPULATION: Delete Current Row
  const handleDeleteRow = () => {
    const { row, table } = getActiveCellAndTable();
    if (!table || !row) return;

    if (table.rows.length <= 1) {
      table.remove();
      setIsInsideTable(false);
    } else {
      row.remove();
    }
    handleInput();
    setIsTableDropdownOpen(false);
  };

  // TABLE MANIPULATION: Add Column
  const handleAddColumn = (after: boolean = true) => {
    const { cell, table } = getActiveCellAndTable();
    if (!table) return;

    const colIndex = cell ? cell.cellIndex : (table.rows[0]?.cells.length || 1) - 1;

    for (let i = 0; i < table.rows.length; i++) {
      const r = table.rows[i];
      const isHeader = r.parentElement?.tagName === 'THEAD' || (i === 0 && r.cells[0]?.tagName === 'TH');
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.innerHTML = isHeader ? `Header` : '<br>';

      const targetCell = r.cells[colIndex];
      if (targetCell) {
        if (after) {
          targetCell.after(newCell);
        } else {
          targetCell.before(newCell);
        }
      } else {
        r.appendChild(newCell);
      }
    }
    handleInput();
    setIsTableDropdownOpen(false);
  };

  // TABLE MANIPULATION: Delete Current Column
  const handleDeleteColumn = () => {
    const { cell, table } = getActiveCellAndTable();
    if (!table) return;

    const colIndex = cell ? cell.cellIndex : 0;
    const numCols = table.rows[0]?.cells.length || 0;

    if (numCols <= 1) {
      table.remove();
      setIsInsideTable(false);
    } else {
      for (let i = 0; i < table.rows.length; i++) {
        const r = table.rows[i];
        if (r.cells[colIndex]) {
          r.cells[colIndex].remove();
        }
      }
    }
    handleInput();
    setIsTableDropdownOpen(false);
  };

  // TABLE MANIPULATION: Delete Entire Table
  const handleDeleteTable = () => {
    const { table } = getActiveCellAndTable();
    if (table) {
      table.remove();
      setIsInsideTable(false);
      handleInput();
    }
    setIsTableDropdownOpen(false);
  };

  // Print document
  const handlePrint = () => {
    window.print();
  };

  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

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

      {/* 2. WYSIWYG FORMATTING TOOLBAR RIBBON */}
      <div className="border-b border-[var(--border-line)] px-4 py-2 bg-white/[0.02] flex items-center gap-1 flex-wrap overflow-x-auto text-xs shrink-0 select-none">
        {/* Headings */}
        <button
          onClick={() => executeCommand('formatBlock', activeStyles.h1 ? '<p>' : '<h1>')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition font-bold ${
            activeStyles.h1 ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px]">H1</span>
        </button>

        <button
          onClick={() => executeCommand('formatBlock', activeStyles.h2 ? '<p>' : '<h2>')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition font-bold ${
            activeStyles.h2 ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px]">H2</span>
        </button>

        <button
          onClick={() => executeCommand('formatBlock', activeStyles.h3 ? '<p>' : '<h3>')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition font-bold ${
            activeStyles.h3 ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px]">H3</span>
        </button>

        <button
          onClick={() => executeCommand('formatBlock', '<p>')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Normal Paragraph"
        >
          <Pilcrow className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Inline Formatting (Bold, Italic, Underline, Strikethrough, Highlight) */}
        <button
          onClick={() => executeCommand('bold')}
          className={`p-1.5 rounded-lg transition font-bold ${
            activeStyles.bold ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          onClick={() => executeCommand('italic')}
          className={`p-1.5 rounded-lg transition italic ${
            activeStyles.italic ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          onClick={() => executeCommand('underline')}
          className={`p-1.5 rounded-lg transition ${
            activeStyles.underline ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>

        <button
          onClick={() => executeCommand('strikeThrough')}
          className={`p-1.5 rounded-lg transition ${
            activeStyles.strike ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <button
          onClick={() => executeCommand('hiliteColor', '#f59e0b40')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Highlight Text"
        >
          <Highlighter className="w-4 h-4 text-amber-400" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Lists */}
        <button
          onClick={() => executeCommand('insertUnorderedList')}
          className={`p-1.5 rounded-lg transition ${
            activeStyles.ul ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          onClick={() => executeCommand('insertOrderedList')}
          className={`p-1.5 rounded-lg transition ${
            activeStyles.ol ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Text Alignment */}
        <button
          onClick={() => executeCommand('justifyLeft')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => executeCommand('justifyCenter')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          onClick={() => executeCommand('justifyRight')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* TABLE CONTROLS (Always available + Dynamic Contextual Options) */}
        <div className="relative" ref={tableMenuRef}>
          <button
            onClick={() => setIsTableDropdownOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-medium ${
              isInsideTable 
                ? 'bg-[#16A085]/20 text-[#16A085] border border-[#16A085]/40 shadow-xs' 
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Table Operations"
          >
            <TableIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px]">Table</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {/* Table Dropdown Menu */}
          {isTableDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-52 glass-panel rounded-2xl shadow-2xl p-1.5 z-50 border border-[var(--border-line)] bg-[var(--surface-bg)] text-[var(--text-main)] text-xs animate-in fade-in duration-100">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Insert Table
              </div>
              <button
                onClick={() => insertTable(3, 3)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition"
              >
                <span>3 × 3 Grid</span>
                <span className="text-[10px] text-slate-400 font-mono">Standard</span>
              </button>
              <button
                onClick={() => insertTable(4, 4)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition"
              >
                <span>4 × 4 Grid</span>
                <span className="text-[10px] text-slate-400 font-mono">Large</span>
              </button>
              <button
                onClick={() => insertTable(2, 2)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition"
              >
                <span>2 × 2 Grid</span>
                <span className="text-[10px] text-slate-400 font-mono">Compact</span>
              </button>

              {/* Context Actions (Active if inside a table) */}
              {isInsideTable && (
                <>
                  <div className="my-1 border-t border-[var(--border-line)]" />
                  <div className="px-2.5 py-1 text-[10px] font-bold text-[#16A085] uppercase tracking-wider">
                    Edit Current Table
                  </div>
                  <button
                    onClick={() => handleAddRow(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#16A085]" />
                    <span>Insert Row Below</span>
                  </button>
                  <button
                    onClick={handleDeleteRow}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-400 text-left transition font-medium"
                  >
                    <Minus className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete Current Row</span>
                  </button>
                  <button
                    onClick={() => handleAddColumn(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#16A085]" />
                    <span>Insert Column Right</span>
                  </button>
                  <button
                    onClick={handleDeleteColumn}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-rose-400 text-left transition font-medium"
                  >
                    <Minus className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete Current Column</span>
                  </button>
                  <div className="my-1 border-t border-[var(--border-line)]" />
                  <button
                    onClick={handleDeleteTable}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-400 text-left transition font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Entire Table</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* DYNAMIC FAST TABLE ACTIONS (Appears right in the ribbon when cursor is in any table cell) */}
        {isInsideTable && (
          <div className="flex items-center gap-1 bg-[#16A085]/15 border border-[#16A085]/30 px-2 py-0.5 rounded-xl animate-in fade-in duration-150">
            <button
              onClick={() => handleAddRow(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-[#16A085] hover:text-white text-[11px] font-semibold text-[var(--text-main)] transition"
              title="Add Row Below"
            >
              <Plus className="w-3 h-3 text-[#16A085] group-hover:text-white" />
              <span>Row</span>
            </button>
            <button
              onClick={handleDeleteRow}
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition"
              title="Delete Current Row"
            >
              <Minus className="w-3 h-3" />
              <span>Row</span>
            </button>
            <div className="h-3 w-px bg-white/20 mx-0.5" />
            <button
              onClick={() => handleAddColumn(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-[#16A085] hover:text-white text-[11px] font-semibold text-[var(--text-main)] transition"
              title="Add Column Right"
            >
              <Plus className="w-3 h-3 text-[#16A085] group-hover:text-white" />
              <span>Col</span>
            </button>
            <button
              onClick={handleDeleteColumn}
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition"
              title="Delete Current Column"
            >
              <Minus className="w-3 h-3" />
              <span>Col</span>
            </button>
            <div className="h-3 w-px bg-white/20 mx-0.5" />
            <button
              onClick={handleDeleteTable}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition"
              title="Delete Table"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={() => executeCommand('formatBlock', activeStyles.blockquote ? '<p>' : '<blockquote>')}
          className={`p-1.5 rounded-lg transition ${
            activeStyles.blockquote ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <button
          onClick={() => executeCommand('insertHorizontalRule')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Divider Line"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* 3. WYSIWYG DOCUMENT CANVAS (Google Docs Style Paper Container) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-black/[0.04] dark:bg-black/20">
        <div className="w-full max-w-4xl min-h-[750px] p-8 sm:p-14 rounded-2xl bg-[var(--surface-bg)] border border-[var(--border-line)] shadow-xl flex flex-col">
          {/* True ContentEditable Canvas */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyUp={updateActiveStyles}
            onMouseUp={updateActiveStyles}
            onSelect={updateActiveStyles}
            className="omni-doc-canvas flex-1 w-full text-[var(--text-main)] font-sans text-sm sm:text-base leading-relaxed focus:outline-none"
            spellCheck="true"
          />
        </div>
      </div>
    </div>
  );
};
