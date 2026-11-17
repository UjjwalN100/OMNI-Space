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
  Trash2
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
    .replace(/~~(.*?)~~/gim, '<del>$1</del>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^---$/gim, '<hr>');

  // Wrap lines in <p> if not already heading, blockquote or hr
  const lines = html.split('\n');
  const wrapped = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '<p><br></p>';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr') || trimmed.startsWith('<table')) {
      return trimmed;
    }
    return `<p>${trimmed}</p>`;
  });

  return wrapped.join('');
}

export const DocEditor: React.FC<DocEditorProps> = ({ 
  file, 
  onClose,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const { updateFileContent } = useSpace();
  const [title, setTitle] = useState(file.name);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [wordCount, setWordCount] = useState(0);

  // Active formatting state for highlighting toolbar buttons
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

  // Table status and tracking
  const [isInsideTable, setIsInsideTable] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTableRef = useRef<{
    cell: HTMLTableCellElement | null;
    row: HTMLTableRowElement | null;
    table: HTMLTableElement | null;
  }>({ cell: null, row: null, table: null });

  // Compute word count from inner text
  const updateMetrics = (text: string) => {
    const cleanText = text.trim();
    const count = cleanText.length > 0 ? cleanText.split(/\s+/).length : 0;
    setWordCount(count);
  };

  // Initialize editor content once on load
  useEffect(() => {
    setTitle(file.name);
    setSaveStatus('saved');
    if (editorRef.current) {
      const initialHtml = convertMarkdownToHtml(file.content || '');
      editorRef.current.innerHTML = initialHtml;
      updateMetrics(editorRef.current.innerText || '');
      const hasTable = !!editorRef.current.querySelector('table');
      setIsInsideTable(hasTable);
    }
  }, [file.id]);

  // Debounced auto-save (800ms)
  const triggerAutoSave = useCallback((newTitle: string) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (editorRef.current) {
        const htmlContent = editorRef.current.innerHTML;
        try {
          await updateFileContent(file.id, htmlContent, newTitle);
          setSaveStatus('saved');
        } catch (err) {
          console.error('Failed to auto-save document:', err);
          setSaveStatus('unsaved');
        }
      }
    }, 800);
  }, [file.id, updateFileContent]);

  // Handle editor canvas input
  const handleInput = () => {
    setSaveStatus('unsaved');
    if (editorRef.current) {
      updateMetrics(editorRef.current.innerText || '');
    }
    triggerAutoSave(title);
    updateActiveStyles();
  };

  // Handle document title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    setSaveStatus('unsaved');
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
      if (node.nodeName === 'TABLE') {
        const table = node as HTMLTableElement;
        return { cell: null, row: null, table };
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

      // Check if cursor is inside a table, or if document contains any table
      const { cell, row, table } = getActiveCellAndTable();
      if (table) {
        lastTableRef.current = { cell, row, table };
        setIsInsideTable(true);
      } else {
        const hasTableInDoc = !!editorRef.current?.querySelector('table');
        setIsInsideTable(hasTableInDoc);
      }

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

  // Prevent mousedown from blurring the editor canvas
  const preventBlur = (e: React.MouseEvent) => {
    e.preventDefault();
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

  // Insert a fresh HTML Table directly via DOM (3 rows x 3 columns standard)
  const insertTable = (rows: number = 3, cols: number = 3) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    // Create table element directly via DOM
    const table = document.createElement('table');
    table.className = 'omni-doc-table';

    const thead = document.createElement('thead');
    const headerTr = document.createElement('tr');
    for (let c = 1; c <= cols; c++) {
      const th = document.createElement('th');
      th.textContent = `Header ${c}`;
      headerTr.appendChild(th);
    }
    thead.appendChild(headerTr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let r = 1; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 1; c <= cols; c++) {
        const td = document.createElement('td');
        td.innerHTML = '<br>';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const pAfter = document.createElement('p');
    pAfter.innerHTML = '<br>';

    // Try to insert at selection, otherwise append
    const selection = window.getSelection();
    let inserted = false;
    if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      try {
        const range = selection.getRangeAt(0);
        let node: Node | null = range.startContainer;
        while (node && node.parentNode !== editorRef.current) {
          node = node.parentNode;
        }

        if (node && editorRef.current.contains(node)) {
          (node as ChildNode).after(table);
          table.after(pAfter);
          inserted = true;
        } else {
          range.insertNode(table);
          table.after(pAfter);
          inserted = true;
        }
      } catch {
        inserted = false;
      }
    }

    if (!inserted) {
      editorRef.current.appendChild(table);
      editorRef.current.appendChild(pAfter);
    }

    // Place cursor in first header cell
    const firstCell = table.querySelector('th, td') as HTMLTableCellElement | null;
    if (firstCell) {
      const range = document.createRange();
      range.selectNodeContents(firstCell);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    lastTableRef.current = { cell: firstCell, row: table.rows[0] || null, table };
    setIsInsideTable(true);
    updateMetrics(editorRef.current.innerText || '');
    handleInput();
    updateActiveStyles();
  };

  // TABLE MANIPULATION: Add Row
  const handleAddRow = (below: boolean = true) => {
    let { row, table } = getActiveCellAndTable();
    if (!table) {
      table = lastTableRef.current.table || editorRef.current?.querySelector('table') || null;
    }
    if (!table) return;

    if (!row) {
      row = lastTableRef.current.row || (table.rows.length > 0 ? table.rows[table.rows.length - 1] : null);
    }

    const colCount = row ? row.cells.length : (table.rows[0]?.cells.length || 3);

    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement('td');
      td.innerHTML = '<br>';
      newRow.appendChild(td);
    }

    if (row && below) {
      row.after(newRow);
    } else if (row && !below) {
      row.before(newRow);
    } else {
      const tbody = table.querySelector('tbody') || table;
      tbody.appendChild(newRow);
    }

    // Place cursor in first cell of new row
    const firstCell = newRow.cells[0];
    if (firstCell) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(firstCell);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
      lastTableRef.current = { cell: firstCell, row: newRow, table };
    }

    setIsInsideTable(true);
    handleInput();
    updateActiveStyles();
  };

  // TABLE MANIPULATION: Delete Current Row
  const handleDeleteRow = () => {
    let { row, table } = getActiveCellAndTable();
    if (!table) {
      table = lastTableRef.current.table || editorRef.current?.querySelector('table') || null;
    }
    if (!table) return;

    if (!row) {
      row = lastTableRef.current.row || (table.rows.length > 0 ? table.rows[table.rows.length - 1] : null);
    }
    if (!row) return;

    if (table.rows.length <= 1) {
      table.remove();
      setIsInsideTable(false);
      lastTableRef.current = { cell: null, row: null, table: null };
    } else {
      const fallbackRow = (row.nextElementSibling || row.previousElementSibling || table.rows[0]) as HTMLTableRowElement | null;
      row.remove();
      const fallbackCell = fallbackRow?.cells[0] || null;
      lastTableRef.current = { cell: fallbackCell, row: fallbackRow, table };
    }
    handleInput();
    updateActiveStyles();
  };

  // TABLE MANIPULATION: Add Column
  const handleAddColumn = (after: boolean = true) => {
    let { cell, table } = getActiveCellAndTable();
    if (!table) {
      table = lastTableRef.current.table || editorRef.current?.querySelector('table') || null;
    }
    if (!table) return;

    if (!cell) {
      cell = lastTableRef.current.cell || (table.rows[0]?.cells.length ? table.rows[0].cells[table.rows[0].cells.length - 1] : null);
    }

    const colIndex = cell ? cell.cellIndex : (table.rows[0]?.cells.length || 1) - 1;

    for (let i = 0; i < table.rows.length; i++) {
      const r = table.rows[i];
      const isHeader = r.parentElement?.tagName === 'THEAD' || (i === 0 && r.cells[0]?.tagName === 'TH');
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.innerHTML = isHeader ? `Header ${r.cells.length + 1}` : '<br>';

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
    updateActiveStyles();
  };

  // TABLE MANIPULATION: Delete Current Column
  const handleDeleteColumn = () => {
    let { cell, table } = getActiveCellAndTable();
    if (!table) {
      table = lastTableRef.current.table || editorRef.current?.querySelector('table') || null;
    }
    if (!table) return;

    if (!cell) {
      cell = lastTableRef.current.cell || (table.rows[0]?.cells.length ? table.rows[0].cells[table.rows[0].cells.length - 1] : null);
    }

    const colIndex = cell ? cell.cellIndex : 0;
    const numCols = table.rows[0]?.cells.length || 0;

    if (numCols <= 1) {
      table.remove();
      setIsInsideTable(false);
      lastTableRef.current = { cell: null, row: null, table: null };
    } else {
      for (let i = 0; i < table.rows.length; i++) {
        const r = table.rows[i];
        if (r.cells[colIndex]) {
          r.cells[colIndex].remove();
        }
      }
    }

    handleInput();
    updateActiveStyles();
  };

  // TABLE MANIPULATION: Delete Entire Table
  const handleDeleteTable = () => {
    let { table } = getActiveCellAndTable();
    if (!table) {
      table = lastTableRef.current.table || editorRef.current?.querySelector('table') || null;
    }
    if (table) {
      table.remove();
      setIsInsideTable(false);
      lastTableRef.current = { cell: null, row: null, table: null };
      handleInput();
      updateActiveStyles();
    }
  };

  // Print document
  const handlePrint = () => {
    window.print();
  };

  // Export document as plain text or styled file
  const handleDownload = () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerText;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\.[^/.]+$/, '')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden">
      {/* 1. TOP UTILITY HEADER */}
      <div className="border-b border-[var(--border-line)] px-4 py-2.5 flex items-center justify-between gap-3 bg-[var(--surface-bg)] shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2 min-w-0 max-w-md">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled Document..."
              className="bg-transparent text-base sm:text-lg font-bold text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[#16A085] rounded px-1.5 py-0.5 truncate w-full"
            />
            <span className="text-xs text-slate-400 font-mono shrink-0">.docx</span>
          </div>

          {/* Auto-save Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 bg-white/5 border border-white/10">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span className="text-amber-400 text-[11px]">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[11px]">Saved to Cloud</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-slate-400 text-[11px]">Unsaved</span>
              </>
            )}
          </div>
        </div>

        {/* Right side stats and actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 mr-2 border-r border-[var(--border-line)] pr-3">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
          </div>

          {/* Export / Print */}
          <button
            onClick={handleDownload}
            className="p-2 text-slate-400 hover:text-[var(--text-main)] rounded-xl hover:bg-white/10 transition"
            title="Download as Text"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrint}
            className="p-2 text-slate-400 hover:text-[var(--text-main)] rounded-xl hover:bg-white/10 transition"
            title="Print Document"
          >
            <Printer className="w-4 h-4" />
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
      <div className="border-b border-[var(--border-line)] px-4 py-2 bg-white/[0.02] flex items-center gap-1 flex-wrap text-xs shrink-0 select-none">
        {/* Headings */}
        <button
          onMouseDown={preventBlur}
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
          onMouseDown={preventBlur}
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
          onMouseDown={preventBlur}
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
          onMouseDown={preventBlur}
          onClick={() => executeCommand('formatBlock', '<p>')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Normal Paragraph"
        >
          <Pilcrow className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Inline Formatting (Bold, Italic, Underline, Strikethrough, Highlight) */}
        <button
          onMouseDown={preventBlur}
          onClick={() => executeCommand('bold')}
          className={`p-1.5 rounded-lg transition font-bold ${
            activeStyles.bold ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          onMouseDown={preventBlur}
          onClick={() => executeCommand('italic')}
          className={`p-1.5 rounded-lg transition italic ${
            activeStyles.italic ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          onMouseDown={preventBlur}
          onClick={() => executeCommand('underline')}
          className={`p-1.5 rounded-lg transition ${
            activeStyles.underline ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>

        <button
          onMouseDown={preventBlur}
          onClick={() => executeCommand('strikeThrough')}
          className={`p-1.5 rounded-lg transition ${
            activeStyles.strike ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <button
          onMouseDown={preventBlur}
          onClick={() => executeCommand('hiliteColor', '#f59e0b40')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Highlight Text"
        >
          <Highlighter className="w-4 h-4 text-amber-400" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Lists */}
        <button
          onMouseDown={preventBlur}
          onClick={() => executeCommand('insertUnorderedList')}
          className={`p-1.5 rounded-lg transition ${
            activeStyles.ul ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          onMouseDown={preventBlur}
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
          onMouseDown={preventBlur}
          onClick={() => executeCommand('justifyLeft')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          onMouseDown={preventBlur}
          onClick={() => executeCommand('justifyCenter')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          onMouseDown={preventBlur}
          onClick={() => executeCommand('justifyRight')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* TABLE CONTROLS */}
        <button
          onMouseDown={preventBlur}
          onClick={() => insertTable(3, 3)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition font-medium border border-emerald-500/20 shadow-xs"
          title="Insert 3x3 Table Grid"
        >
          <TableIcon className="w-4 h-4" />
          <span className="text-[11px] font-semibold">Table</span>
        </button>

        {/* DYNAMIC FAST TABLE ACTIONS (Appears whenever cursor is in a table or table exists) */}
        {isInsideTable && (
          <div className="flex items-center gap-1 bg-[#16A085]/15 border border-[#16A085]/40 px-2 py-0.5 rounded-xl animate-in fade-in duration-150">
            <span className="text-[10px] font-bold text-[#16A085] uppercase tracking-wider mr-1 hidden sm:inline">Table:</span>
            
            <button
              onMouseDown={preventBlur}
              onClick={() => handleAddRow(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-[#16A085] hover:text-white text-[11px] font-semibold text-[var(--text-main)] transition"
              title="Add Row Below"
            >
              <Plus className="w-3 h-3 text-[#16A085]" />
              <span>Row</span>
            </button>
            <button
              onMouseDown={preventBlur}
              onClick={handleDeleteRow}
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition"
              title="Delete Current Row"
            >
              <Minus className="w-3 h-3" />
              <span>Row</span>
            </button>

            <div className="h-3 w-px bg-white/20 mx-0.5" />

            <button
              onMouseDown={preventBlur}
              onClick={() => handleAddColumn(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-[#16A085] hover:text-white text-[11px] font-semibold text-[var(--text-main)] transition"
              title="Add Column Right"
            >
              <Plus className="w-3 h-3 text-[#16A085]" />
              <span>Col</span>
            </button>
            <button
              onMouseDown={preventBlur}
              onClick={handleDeleteColumn}
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition"
              title="Delete Current Column"
            >
              <Minus className="w-3 h-3" />
              <span>Col</span>
            </button>

            <div className="h-3 w-px bg-white/20 mx-0.5" />

            <button
              onMouseDown={preventBlur}
              onClick={handleDeleteTable}
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition"
              title="Delete Entire Table"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px]">Delete</span>
            </button>
          </div>
        )}

        <button
          onMouseDown={preventBlur}
          onClick={() => executeCommand('formatBlock', activeStyles.blockquote ? '<p>' : '<blockquote>')}
          className={`p-1.5 rounded-lg transition ${
            activeStyles.blockquote ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <button
          onMouseDown={preventBlur}
          onClick={() => executeCommand('insertHorizontalRule')}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          title="Divider Line"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* 3. WYSIWYG DOCUMENT CANVAS (Google Docs Style Paper Container) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start bg-black/[0.04] dark:bg-black/20">
        <div className="w-full max-w-4xl min-h-[850px] h-fit p-6 sm:p-12 rounded-2xl bg-[var(--surface-bg)] border border-[var(--border-line)] shadow-2xl flex flex-col mb-20 overflow-hidden">
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
