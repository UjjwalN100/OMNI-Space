import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSpace } from '../../context/SpaceContext';
import { FileItem } from '../../types/space';
import { 
  FileSpreadsheet, 
  Download, 
  Maximize2, 
  Minimize2, 
  X, 
  CheckCircle2, 
  Loader2, 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  DollarSign, 
  Percent, 
  Hash, 
  Plus, 
  Minus, 
  Trash2, 
  Table, 
  Sparkles,
  Calculator,
  ChevronRight,
  Sheet as SheetIcon
} from 'lucide-react';

interface SheetEditorProps {
  file: FileItem;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  textColor?: string;
  bgColor?: string;
  format?: 'text' | 'currency' | 'percent' | 'number';
}

export interface CellData {
  raw: string;
  style?: CellStyle;
}

export interface SheetTab {
  id: string;
  name: string;
  rowCount: number;
  colCount: number;
  data: Record<string, CellData>;
}

// Convert 0 -> A, 25 -> Z, 26 -> AA
export function indexToColLetter(index: number): string {
  let temp = index + 1;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

// Convert A -> 0, Z -> 25, AA -> 26
export function colLetterToIndex(col: string): number {
  let index = 0;
  const upper = col.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

// Parse coordinate 'B4' -> { col: 'B', row: 4, colIdx: 1, rowIdx: 3 }
export function parseCoord(coord: string) {
  const match = coord.match(/^([A-Za-z]+)([0-9]+)$/);
  if (!match) return null;
  const colLetter = match[1].toUpperCase();
  const rowNumber = parseInt(match[2], 10);
  return {
    col: colLetter,
    row: rowNumber,
    colIdx: colLetterToIndex(colLetter),
    rowIdx: rowNumber - 1
  };
}

// Expand a range like 'A1:B3' into ['A1', 'A2', 'A3', 'B1', 'B2', 'B3']
export function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split(':');
  if (parts.length === 1) return [parts[0].toUpperCase()];
  const start = parseCoord(parts[0]);
  const end = parseCoord(parts[1]);
  if (!start || !end) return [];

  const minCol = Math.min(start.colIdx, end.colIdx);
  const maxCol = Math.max(start.colIdx, end.colIdx);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const coords: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    const letter = indexToColLetter(c);
    for (let r = minRow; r <= maxRow; r++) {
      coords.push(`${letter}${r}`);
    }
  }
  return coords;
}

// Evaluate formula given sheet data
export function evaluateFormula(formula: string, data: Record<string, CellData>, visited: Set<string> = new Set()): string | number {
  if (!formula.startsWith('=')) {
    return formula;
  }

  const expr = formula.substring(1).trim();

  // Helper to get numeric value of a cell
  const getCellValue = (coord: string): number => {
    if (visited.has(coord)) return 0; // prevent circular ref
    const cell = data[coord];
    if (!cell || !cell.raw) return 0;
    if (cell.raw.startsWith('=')) {
      const nextVisited = new Set(visited).add(coord);
      const res = evaluateFormula(cell.raw, data, nextVisited);
      const num = Number(res);
      return isNaN(num) ? 0 : num;
    }
    const cleanNum = cell.raw.replace(/[^0-9.-]/g, '');
    const num = Number(cleanNum);
    return isNaN(num) ? 0 : num;
  };

  // Helper to extract range or args from FUNCTION(arg1, arg2...)
  const parseFuncArgs = (rawArgs: string): string[] => {
    const tokens = rawArgs.split(',').map(s => s.trim());
    const coords: string[] = [];
    tokens.forEach(tok => {
      if (tok.includes(':')) {
        coords.push(...expandRange(tok));
      } else if (tok) {
        coords.push(tok.toUpperCase());
      }
    });
    return coords;
  };

  // Direct single cell reference (e.g. =B2)
  const singleCellMatch = expr.match(/^([A-Za-z]+[0-9]+)$/);
  if (singleCellMatch) {
    const targetCoord = singleCellMatch[1].toUpperCase();
    if (visited.has(targetCoord)) return '#CIRCULAR!';
    const targetCell = data[targetCoord];
    if (!targetCell || !targetCell.raw) return '';
    if (targetCell.raw.startsWith('=')) {
      const nextVisited = new Set(visited).add(targetCoord);
      return evaluateFormula(targetCell.raw, data, nextVisited);
    }
    return targetCell.raw;
  }

  // SUM(A1:A5)
  const sumMatch = expr.match(/^SUM\((.*)\)$/i);
  if (sumMatch) {
    const coords = parseFuncArgs(sumMatch[1]);
    const total = coords.reduce((acc, c) => acc + getCellValue(c), 0);
    return total;
  }

  // AVERAGE(A1:A5) or AVG(A1:A5)
  const avgMatch = expr.match(/^(?:AVERAGE|AVG)\((.*)\)$/i);
  if (avgMatch) {
    const coords = parseFuncArgs(avgMatch[1]);
    if (coords.length === 0) return 0;
    const total = coords.reduce((acc, c) => acc + getCellValue(c), 0);
    return Math.round((total / coords.length) * 100) / 100;
  }

  // COUNT(A1:A5)
  const countMatch = expr.match(/^COUNT\((.*)\)$/i);
  if (countMatch) {
    const coords = parseFuncArgs(countMatch[1]);
    let count = 0;
    coords.forEach(c => {
      const val = data[c]?.raw;
      if (val !== undefined && val !== null && val.trim() !== '') {
        count++;
      }
    });
    return count;
  }

  // MIN(A1:A5)
  const minMatch = expr.match(/^MIN\((.*)\)$/i);
  if (minMatch) {
    const coords = parseFuncArgs(minMatch[1]);
    if (coords.length === 0) return 0;
    const vals = coords.map(c => getCellValue(c));
    return Math.min(...vals);
  }

  // MAX(A1:A5)
  const maxMatch = expr.match(/^MAX\((.*)\)$/i);
  if (maxMatch) {
    const coords = parseFuncArgs(maxMatch[1]);
    if (coords.length === 0) return 0;
    const vals = coords.map(c => getCellValue(c));
    return Math.max(...vals);
  }

  // Simple arithmetic expression with cell coordinates (e.g. A1 + B1, A1 * 2)
  try {
    const resolvedExpr = expr.replace(/[A-Za-z]+[0-9]+/g, (match) => {
      return String(getCellValue(match.toUpperCase()));
    });
    // Sanitize: only allow numbers, math operators, parens, spaces
    if (/^[0-9+\-*/().\s]+$/.test(resolvedExpr)) {
      // Safe math evaluation
      const result = Function(`'use strict'; return (${resolvedExpr})`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return Math.round(result * 1000) / 1000;
      }
    }
  } catch {
    return '#ERROR!';
  }

  return expr;
}

// Format computed value based on cell format
export function formatCellValue(value: string | number, format?: CellStyle['format']): string {
  if (value === undefined || value === null || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return String(value);

  switch (format) {
    case 'currency':
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'percent':
      return `${(num * 100).toFixed(1)}%`;
    case 'number':
      return num.toLocaleString('en-US');
    default:
      return String(value);
  }
}

// Generate default clean starter spreadsheet
function createDefaultSheet(): SheetTab[] {
  return [
    {
      id: 'sheet-1',
      name: 'Sheet 1',
      rowCount: 25,
      colCount: 10,
      data: {
        'A1': { raw: 'Item', style: { bold: true, align: 'left', bgColor: 'rgba(22, 160, 133, 0.15)' } },
        'B1': { raw: 'Category', style: { bold: true, align: 'left', bgColor: 'rgba(22, 160, 133, 0.15)' } },
        'C1': { raw: 'Quantity', style: { bold: true, align: 'right', bgColor: 'rgba(22, 160, 133, 0.15)' } },
        'D1': { raw: 'Unit Price', style: { bold: true, align: 'right', bgColor: 'rgba(22, 160, 133, 0.15)' } },
        'E1': { raw: 'Total', style: { bold: true, align: 'right', bgColor: 'rgba(22, 160, 133, 0.15)' } },
        
        'A2': { raw: 'Cloud Server A1' },
        'B2': { raw: 'Infrastructure' },
        'C2': { raw: '4', style: { align: 'right' } },
        'D2': { raw: '120', style: { align: 'right', format: 'currency' } },
        'E2': { raw: '=C2*D2', style: { align: 'right', format: 'currency' } },

        'A3': { raw: 'Database Vault' },
        'B3': { raw: 'Storage' },
        'C3': { raw: '2', style: { align: 'right' } },
        'D3': { raw: '250', style: { align: 'right', format: 'currency' } },
        'E3': { raw: '=C3*D3', style: { align: 'right', format: 'currency' } },

        'A4': { raw: 'AI Token Credits' },
        'B4': { raw: 'Compute' },
        'C4': { raw: '10', style: { align: 'right' } },
        'D4': { raw: '45', style: { align: 'right', format: 'currency' } },
        'E4': { raw: '=C4*D4', style: { align: 'right', format: 'currency' } },

        'A5': { raw: 'Summary Total', style: { bold: true, bgColor: 'rgba(255, 255, 255, 0.05)' } },
        'B5': { raw: '', style: { bgColor: 'rgba(255, 255, 255, 0.05)' } },
        'C5': { raw: '', style: { bgColor: 'rgba(255, 255, 255, 0.05)' } },
        'D5': { raw: '', style: { bgColor: 'rgba(255, 255, 255, 0.05)' } },
        'E5': { raw: '=SUM(E2:E4)', style: { bold: true, align: 'right', format: 'currency', bgColor: 'rgba(255, 255, 255, 0.05)' } },
      }
    }
  ];
}

// Parse raw file content (JSON or CSV)
function parseSheetContent(rawContent: string): SheetTab[] {
  if (!rawContent || !rawContent.trim()) {
    return createDefaultSheet();
  }

  // Try parsing JSON sheet format
  try {
    const parsed = JSON.parse(rawContent);
    if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
      return parsed.sheets;
    }
  } catch {
    // Not json, try parsing as CSV or plain text
  }

  // Parse CSV fallback
  const lines = rawContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    const data: Record<string, CellData> = {};
    let maxCols = 10;
    lines.forEach((line, rIdx) => {
      const rowNum = rIdx + 1;
      const cols = line.split(',');
      if (cols.length > maxCols) maxCols = cols.length;
      cols.forEach((val, cIdx) => {
        const colLetter = indexToColLetter(cIdx);
        const cellVal = val.trim().replace(/^"|"$/g, '');
        if (cellVal) {
          data[`${colLetter}${rowNum}`] = {
            raw: cellVal,
            style: rIdx === 0 ? { bold: true, bgColor: 'rgba(22, 160, 133, 0.15)' } : undefined
          };
        }
      });
    });

    return [
      {
        id: 'sheet-1',
        name: 'Sheet 1',
        rowCount: Math.max(lines.length + 10, 25),
        colCount: Math.max(maxCols + 3, 12),
        data
      }
    ];
  }

  return createDefaultSheet();
}

export const SheetEditor: React.FC<SheetEditorProps> = ({
  file,
  onClose,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const { updateFileContent } = useSpace();
  const [title, setTitle] = useState(file.name);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Sheets collection & active sheet tab index
  const [sheets, setSheets] = useState<SheetTab[]>(() => parseSheetContent(file.content || ''));
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // Active cell selection & edit buffer
  const [activeCoord, setActiveCoord] = useState('A1');
  const [isEditingCell, setIsEditingCell] = useState(false);
  const [cellEditValue, setCellEditValue] = useState('');
  const [formulaInput, setFormulaInput] = useState('');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSheet = sheets[activeSheetIndex] || sheets[0];
  const currentSheetRef = useRef(currentSheet);
  currentSheetRef.current = currentSheet;

  // Focus spreadsheet container on mount for instant keyboard responsiveness
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Debounced cloud auto-save
  const triggerAutoSave = useCallback((updatedSheets: SheetTab[], newTitle: string) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = JSON.stringify({
          activeSheetIndex,
          sheets: updatedSheets
        }, null, 2);
        await updateFileContent(file.id, payload, newTitle);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to auto-save spreadsheet:', err);
        setSaveStatus('unsaved');
      }
    }, 800);
  }, [file.id, activeSheetIndex, updateFileContent]);

  // Sync formula input and cell buffer ONLY when selected cell or sheet tab changes
  useEffect(() => {
    const cell = currentSheetRef.current?.data[activeCoord];
    const raw = cell?.raw || '';
    setFormulaInput(raw);
    setCellEditValue(raw);
    setIsEditingCell(false);
  }, [activeCoord, activeSheetIndex]);

  // Auto-focus input when entering edit mode and put caret at the end
  useEffect(() => {
    if (isEditingCell && activeInputRef.current) {
      activeInputRef.current.focus();
      const len = activeInputRef.current.value.length;
      activeInputRef.current.setSelectionRange(len, len);
    }
  }, [isEditingCell]);

  // Update cell raw value in state and schedule cloud auto-save
  const updateCellValue = useCallback((coord: string, newRaw: string) => {
    setSheets(prevSheets => {
      const nextSheets = [...prevSheets];
      const sheet = { ...nextSheets[activeSheetIndex] };
      const nextData = { ...sheet.data };

      if (!newRaw.trim()) {
        if (nextData[coord]) {
          delete nextData[coord];
        }
      } else {
        nextData[coord] = {
          ...nextData[coord],
          raw: newRaw
        };
      }

      sheet.data = nextData;
      nextSheets[activeSheetIndex] = sheet;
      triggerAutoSave(nextSheets, title);
      return nextSheets;
    });
  }, [activeSheetIndex, title, triggerAutoSave]);

  // Update cell formatting style (Bold, Italic, Align, Format, Colors)
  const updateCellStyle = useCallback((coord: string, styleUpdates: Partial<CellStyle>) => {
    setSheets(prevSheets => {
      const nextSheets = [...prevSheets];
      const sheet = { ...nextSheets[activeSheetIndex] };
      const nextData = { ...sheet.data };

      const existing = nextData[coord] || { raw: '' };
      nextData[coord] = {
        ...existing,
        style: {
          ...existing.style,
          ...styleUpdates
        }
      };

      sheet.data = nextData;
      nextSheets[activeSheetIndex] = sheet;
      triggerAutoSave(nextSheets, title);
      return nextSheets;
    });
  }, [activeSheetIndex, title, triggerAutoSave]);

  // Commit cell editing buffer to state and optionally navigate
  const commitCellEdit = useCallback((
    valueToCommit?: string,
    direction: 'down' | 'up' | 'right' | 'left' | 'none' = 'none'
  ) => {
    const activeSheet = currentSheetRef.current;
    const finalVal = valueToCommit !== undefined ? valueToCommit : cellEditValue;
    const currentVal = activeSheet?.data[activeCoord]?.raw || '';

    if (finalVal !== currentVal) {
      updateCellValue(activeCoord, finalVal);
    }

    setIsEditingCell(false);

    if (direction !== 'none') {
      const coord = parseCoord(activeCoord);
      if (!coord) return;
      if (direction === 'down' && coord.row < activeSheet.rowCount) {
        setActiveCoord(`${coord.col}${coord.row + 1}`);
      } else if (direction === 'up' && coord.row > 1) {
        setActiveCoord(`${coord.col}${coord.row - 1}`);
      } else if (direction === 'right' && coord.colIdx < activeSheet.colCount - 1) {
        setActiveCoord(`${indexToColLetter(coord.colIdx + 1)}${coord.row}`);
      } else if (direction === 'left' && coord.colIdx > 0) {
        setActiveCoord(`${indexToColLetter(coord.colIdx - 1)}${coord.row}`);
      }
    }
  }, [cellEditValue, activeCoord, updateCellValue]);

  // Cancel cell editing and revert to previous raw value
  const cancelCellEdit = useCallback(() => {
    setIsEditingCell(false);
    const cell = currentSheetRef.current?.data[activeCoord];
    const orig = cell?.raw || '';
    setFormulaInput(orig);
    setCellEditValue(orig);
  }, [activeCoord]);

  // Handle formula bar input change
  const handleFormulaBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormulaInput(val);
    setCellEditValue(val);
  };

  // Keyboard navigation across spreadsheet cells
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If user is editing the cell, the active input handles its own keystrokes
    if (isEditingCell) return;

    // Quick formatting shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      const currentCell = currentSheetRef.current?.data[activeCoord];
      updateCellStyle(activeCoord, { bold: !currentCell?.style?.bold });
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      const currentCell = currentSheetRef.current?.data[activeCoord];
      updateCellStyle(activeCoord, { italic: !currentCell?.style?.italic });
      return;
    }

    const coord = parseCoord(activeCoord);
    if (!coord) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (coord.row > 1) setActiveCoord(`${coord.col}${coord.row - 1}`);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (coord.row < currentSheet.rowCount) setActiveCoord(`${coord.col}${coord.row + 1}`);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (coord.colIdx > 0) setActiveCoord(`${indexToColLetter(coord.colIdx - 1)}${coord.row}`);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (coord.colIdx < currentSheet.colCount - 1) setActiveCoord(`${indexToColLetter(coord.colIdx + 1)}${coord.row}`);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        if (coord.colIdx > 0) setActiveCoord(`${indexToColLetter(coord.colIdx - 1)}${coord.row}`);
      } else {
        if (coord.colIdx < currentSheet.colCount - 1) setActiveCoord(`${indexToColLetter(coord.colIdx + 1)}${coord.row}`);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        if (coord.row > 1) setActiveCoord(`${coord.col}${coord.row - 1}`);
      } else {
        if (coord.row < currentSheet.rowCount) setActiveCoord(`${coord.col}${coord.row + 1}`);
      }
    } else if (e.key === 'F2') {
      e.preventDefault();
      setIsEditingCell(true);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      updateCellValue(activeCoord, '');
      setFormulaInput('');
      setCellEditValue('');
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Start typing directly into cell: replace content with new key (prevent default to avoid duplicate input)
      e.preventDefault();
      setIsEditingCell(true);
      setCellEditValue(e.key);
      setFormulaInput(e.key);
    }
  };

  // Add / Delete Rows and Columns
  const handleAddRow = (below = true) => {
    setSheets(prev => {
      const next = [...prev];
      const sheet = { ...next[activeSheetIndex] };
      const coord = parseCoord(activeCoord);
      const targetRow = coord ? (below ? coord.row + 1 : coord.row) : sheet.rowCount + 1;

      // Shift cells down
      const nextData: Record<string, CellData> = {};
      Object.entries(sheet.data).forEach(([key, cell]) => {
        const c = parseCoord(key);
        if (!c) return;
        if (c.row >= targetRow) {
          nextData[`${c.col}${c.row + 1}`] = cell;
        } else {
          nextData[key] = cell;
        }
      });

      sheet.rowCount += 1;
      sheet.data = nextData;
      next[activeSheetIndex] = sheet;
      triggerAutoSave(next, title);
      return next;
    });
  };

  const handleDeleteRow = () => {
    const coord = parseCoord(activeCoord);
    if (!coord || currentSheet.rowCount <= 2) return;

    setSheets(prev => {
      const next = [...prev];
      const sheet = { ...next[activeSheetIndex] };
      const nextData: Record<string, CellData> = {};

      Object.entries(sheet.data).forEach(([key, cell]) => {
        const c = parseCoord(key);
        if (!c) return;
        if (c.row === coord.row) {
          // Deleted row, skip
        } else if (c.row > coord.row) {
          nextData[`${c.col}${c.row - 1}`] = cell;
        } else {
          nextData[key] = cell;
        }
      });

      const newRowCount = sheet.rowCount - 1;
      sheet.rowCount = newRowCount;
      sheet.data = nextData;
      next[activeSheetIndex] = sheet;
      triggerAutoSave(next, title);

      if (coord.row > newRowCount) {
        setActiveCoord(`${coord.col}${Math.max(1, newRowCount)}`);
      }
      return next;
    });
  };

  const handleAddColumn = (after = true) => {
    setSheets(prev => {
      const next = [...prev];
      const sheet = { ...next[activeSheetIndex] };
      const coord = parseCoord(activeCoord);
      const targetColIdx = coord ? (after ? coord.colIdx + 1 : coord.colIdx) : sheet.colCount;

      // Shift cells right
      const nextData: Record<string, CellData> = {};
      Object.entries(sheet.data).forEach(([key, cell]) => {
        const c = parseCoord(key);
        if (!c) return;
        if (c.colIdx >= targetColIdx) {
          nextData[`${indexToColLetter(c.colIdx + 1)}${c.row}`] = cell;
        } else {
          nextData[key] = cell;
        }
      });

      sheet.colCount += 1;
      sheet.data = nextData;
      next[activeSheetIndex] = sheet;
      triggerAutoSave(next, title);
      return next;
    });
  };

  const handleDeleteColumn = () => {
    const coord = parseCoord(activeCoord);
    if (!coord || currentSheet.colCount <= 2) return;

    setSheets(prev => {
      const next = [...prev];
      const sheet = { ...next[activeSheetIndex] };
      const nextData: Record<string, CellData> = {};

      Object.entries(sheet.data).forEach(([key, cell]) => {
        const c = parseCoord(key);
        if (!c) return;
        if (c.colIdx === coord.colIdx) {
          // Deleted col, skip
        } else if (c.colIdx > coord.colIdx) {
          nextData[`${indexToColLetter(c.colIdx - 1)}${c.row}`] = cell;
        } else {
          nextData[key] = cell;
        }
      });

      const newColCount = sheet.colCount - 1;
      sheet.colCount = newColCount;
      sheet.data = nextData;
      next[activeSheetIndex] = sheet;
      triggerAutoSave(next, title);

      if (coord.colIdx >= newColCount) {
        setActiveCoord(`${indexToColLetter(Math.max(0, newColCount - 1))}${coord.row}`);
      }
      return next;
    });
  };

  // Add new sheet tab
  const handleAddSheetTab = () => {
    setSheets(prev => {
      const newSheetNumber = prev.length + 1;
      const newTab: SheetTab = {
        id: `sheet-${Date.now()}`,
        name: `Sheet ${newSheetNumber}`,
        rowCount: 25,
        colCount: 10,
        data: {}
      };
      const next = [...prev, newTab];
      setActiveSheetIndex(next.length - 1);
      triggerAutoSave(next, title);
      return next;
    });
  };

  // Export current active sheet to CSV
  const handleExportCSV = () => {
    const rows: string[] = [];
    for (let r = 1; r <= currentSheet.rowCount; r++) {
      const rowVals: string[] = [];
      let hasData = false;
      for (let c = 0; c < currentSheet.colCount; c++) {
        const letter = indexToColLetter(c);
        const cell = currentSheet.data[`${letter}${r}`];
        if (cell?.raw) hasData = true;
        const val = cell?.raw ? evaluateFormula(cell.raw, currentSheet.data) : '';
        // Escape quotes
        const escaped = String(val).replace(/"/g, '""');
        rowVals.push(`"${escaped}"`);
      }
      if (hasData) {
        rows.push(rowVals.join(','));
      }
    }

    const csvContent = rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\.[^/.]+$/, '')}_${currentSheet.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Active cell formatting info for ribbon buttons
  const activeCellData = currentSheet?.data[activeCoord];
  const activeStyle = activeCellData?.style || {};

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden select-none focus:outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* 1. TOP UTILITY HEADER */}
      <div className="border-b border-[var(--border-line)] px-4 py-2.5 flex items-center justify-between gap-3 bg-[var(--surface-bg)] shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2 min-w-0 max-w-md">
            <input
              type="text"
              value={title}
              onChange={e => {
                const next = e.target.value;
                setTitle(next);
                setSaveStatus('unsaved');
                triggerAutoSave(sheets, next);
              }}
              placeholder="Untitled Spreadsheet..."
              className="bg-transparent text-base sm:text-lg font-bold text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[#16A085] rounded px-1.5 py-0.5 truncate w-full"
            />
            <span className="text-xs text-slate-400 font-mono shrink-0">.xlsx</span>
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

        {/* Right side Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition shadow-xs"
            title="Download as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 text-slate-400 hover:text-[var(--text-main)] rounded-xl hover:bg-white/10 transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

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

      {/* 2. SPREADSHEET TOOLBAR RIBBON */}
      <div className="border-b border-[var(--border-line)] px-4 py-2 bg-white/[0.02] flex items-center gap-1.5 flex-wrap overflow-x-auto text-xs shrink-0">
        {/* Font Weight / Style */}
        <button
          onClick={() => updateCellStyle(activeCoord, { bold: !activeStyle.bold })}
          className={`p-1.5 rounded-lg transition font-bold ${
            activeStyle.bold ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          onClick={() => updateCellStyle(activeCoord, { italic: !activeStyle.italic })}
          className={`p-1.5 rounded-lg transition italic ${
            activeStyle.italic ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Alignment */}
        <button
          onClick={() => updateCellStyle(activeCoord, { align: 'left' })}
          className={`p-1.5 rounded-lg transition ${
            activeStyle.align === 'left' || !activeStyle.align ? 'bg-white/20 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => updateCellStyle(activeCoord, { align: 'center' })}
          className={`p-1.5 rounded-lg transition ${
            activeStyle.align === 'center' ? 'bg-white/20 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          onClick={() => updateCellStyle(activeCoord, { align: 'right' })}
          className={`p-1.5 rounded-lg transition ${
            activeStyle.align === 'right' ? 'bg-white/20 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Formats: Currency, Percent, Normal */}
        <button
          onClick={() => updateCellStyle(activeCoord, { format: activeStyle.format === 'currency' ? 'text' : 'currency' })}
          className={`p-1.5 rounded-lg transition ${
            activeStyle.format === 'currency' ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Currency ($)"
        >
          <DollarSign className="w-4 h-4" />
        </button>

        <button
          onClick={() => updateCellStyle(activeCoord, { format: activeStyle.format === 'percent' ? 'text' : 'percent' })}
          className={`p-1.5 rounded-lg transition ${
            activeStyle.format === 'percent' ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Percentage (%)"
        >
          <Percent className="w-4 h-4" />
        </button>

        <button
          onClick={() => updateCellStyle(activeCoord, { format: 'number' })}
          className={`p-1.5 rounded-lg transition ${
            activeStyle.format === 'number' ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Formatted Number (1,234.00)"
        >
          <Hash className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Grid Management: Rows and Columns */}
        <div className="flex items-center gap-1 bg-[#16A085]/10 border border-[#16A085]/30 px-2 py-0.5 rounded-xl">
          <span className="text-[10px] font-bold text-[#16A085] uppercase tracking-wider mr-1 hidden sm:inline">Row:</span>
          <button
            onClick={() => handleAddRow(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-[#16A085] hover:text-white text-[11px] font-semibold text-[var(--text-main)] transition"
            title="Insert Row Below"
          >
            <Plus className="w-3 h-3 text-[#16A085]" />
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

          <div className="h-3 w-px bg-white/20 mx-1" />

          <span className="text-[10px] font-bold text-[#16A085] uppercase tracking-wider mr-1 hidden sm:inline">Col:</span>
          <button
            onClick={() => handleAddColumn(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-[#16A085] hover:text-white text-[11px] font-semibold text-[var(--text-main)] transition"
            title="Insert Column Right"
          >
            <Plus className="w-3 h-3 text-[#16A085]" />
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
        </div>

        {/* Clear Cell */}
        <button
          onClick={() => {
            updateCellValue(activeCoord, '');
            setFormulaInput('');
            setCellEditValue('');
          }}
          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition ml-auto"
          title="Clear Active Cell"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 3. FORMULA BAR (Google Sheets style fx bar) */}
      <div className="border-b border-[var(--border-line)] px-4 py-2 bg-[var(--surface-bg)] flex items-center gap-2 shrink-0">
        {/* Cell Coordinate Box */}
        <div className="px-3 py-1 rounded-lg bg-white/[0.05] border border-[var(--border-line)] text-xs font-mono font-bold text-[#16A085] min-w-[54px] text-center shrink-0">
          {activeCoord}
        </div>

        {/* fx symbol */}
        <div className="text-xs font-serif italic font-bold text-slate-400 select-none px-1">
          fx
        </div>

        {/* Formula Input */}
        <input
          type="text"
          value={formulaInput}
          onChange={handleFormulaBarChange}
          onFocus={() => {
            const cell = currentSheetRef.current?.data[activeCoord];
            const raw = cell?.raw || '';
            setFormulaInput(raw);
            setCellEditValue(raw);
          }}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              e.preventDefault();
              commitCellEdit(formulaInput, 'down');
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelCellEdit();
            }
          }}
          onBlur={() => {
            commitCellEdit(formulaInput, 'none');
          }}
          placeholder="Enter value or formula (e.g. =SUM(A1:A5), =C2*D2)..."
          className="flex-1 bg-transparent text-sm text-[var(--text-main)] font-mono focus:outline-none focus:ring-1 focus:ring-[#16A085] rounded-lg px-2 py-1 border border-transparent hover:border-white/10 transition"
        />

        {/* Quick Function Chips */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px]">
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              const coord = parseCoord(activeCoord);
              const defaultRange = coord && coord.row > 1 ? `${coord.col}1:${coord.col}${coord.row - 1}` : 'A1:A5';
              const str = `=SUM(${defaultRange})`;
              setFormulaInput(str);
              setCellEditValue(str);
              commitCellEdit(str, 'none');
            }}
            className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#16A085]/20 hover:text-[#16A085] border border-white/10 font-mono text-slate-300 transition"
          >
            SUM
          </button>
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              const coord = parseCoord(activeCoord);
              const defaultRange = coord && coord.row > 1 ? `${coord.col}1:${coord.col}${coord.row - 1}` : 'A1:A5';
              const str = `=AVG(${defaultRange})`;
              setFormulaInput(str);
              setCellEditValue(str);
              commitCellEdit(str, 'none');
            }}
            className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#16A085]/20 hover:text-[#16A085] border border-white/10 font-mono text-slate-300 transition"
          >
            AVG
          </button>
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              const coord = parseCoord(activeCoord);
              const defaultRange = coord && coord.row > 1 ? `${coord.col}1:${coord.col}${coord.row - 1}` : 'A1:A5';
              const str = `=COUNT(${defaultRange})`;
              setFormulaInput(str);
              setCellEditValue(str);
              commitCellEdit(str, 'none');
            }}
            className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#16A085]/20 hover:text-[#16A085] border border-white/10 font-mono text-slate-300 transition"
          >
            COUNT
          </button>
        </div>
      </div>

      {/* 4. SPREADSHEET GRID CANVAS */}
      <div className="flex-1 overflow-auto bg-black/[0.03] dark:bg-black/30 relative">
        <table className="border-collapse table-fixed w-max text-xs select-none">
          {/* Column Header Row */}
          <thead className="sticky top-0 z-20 bg-[var(--surface-bg)] shadow-xs">
            <tr>
              {/* Top-left corner box */}
              <th className="w-12 h-8 border-b border-r border-[var(--border-line)] bg-white/[0.04] text-slate-400 font-normal text-[10px] text-center select-none sticky left-0 z-30">
                #
              </th>
              {Array.from({ length: currentSheet.colCount }).map((_, cIdx) => {
                const colLetter = indexToColLetter(cIdx);
                const isColActive = parseCoord(activeCoord)?.col === colLetter;
                return (
                  <th
                    key={colLetter}
                    className={`w-28 h-8 px-2 border-b border-r border-[var(--border-line)] font-bold text-center select-none transition-colors ${
                      isColActive ? 'bg-[#16A085]/20 text-[#16A085] border-b-2 border-b-[#16A085]' : 'bg-white/[0.02] text-slate-400'
                    }`}
                  >
                    {colLetter}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Grid Body Rows */}
          <tbody>
            {Array.from({ length: currentSheet.rowCount }).map((_, rIdx) => {
              const rowNum = rIdx + 1;
              const isRowActive = parseCoord(activeCoord)?.row === rowNum;

              return (
                <tr key={rowNum} className="hover:bg-white/[0.015]">
                  {/* Sticky Row Number Column */}
                  <td 
                    className={`h-7 w-12 border-b border-r border-[var(--border-line)] font-mono text-[10px] text-center select-none sticky left-0 z-10 transition-colors ${
                      isRowActive ? 'bg-[#16A085]/20 text-[#16A085] font-bold border-r-2 border-r-[#16A085]' : 'bg-[var(--surface-bg)] text-slate-400'
                    }`}
                  >
                    {rowNum}
                  </td>

                  {/* Row Cells */}
                  {Array.from({ length: currentSheet.colCount }).map((_, cIdx) => {
                    const colLetter = indexToColLetter(cIdx);
                    const coord = `${colLetter}${rowNum}`;
                    const cellData = currentSheet.data[coord];
                    const isSelected = activeCoord === coord;
                    const style = cellData?.style || {};

                    // Computed displayed value
                    const rawVal = cellData?.raw || '';
                    const evaluated = rawVal ? evaluateFormula(rawVal, currentSheet.data) : '';
                    const displayedVal = formatCellValue(evaluated, style.format);

                    return (
                      <td
                        key={coord}
                        onClick={() => {
                          containerRef.current?.focus();
                          if (activeCoord !== coord) {
                            if (isEditingCell) {
                              commitCellEdit(cellEditValue, 'none');
                            }
                            setActiveCoord(coord);
                            setIsEditingCell(false);
                          }
                        }}
                        onDoubleClick={() => {
                          setActiveCoord(coord);
                          setIsEditingCell(true);
                        }}
                        style={{
                          backgroundColor: style.bgColor || undefined,
                          color: style.textColor || undefined,
                          textAlign: style.align || 'left',
                          fontWeight: style.bold ? 'bold' : 'normal',
                          fontStyle: style.italic ? 'italic' : 'normal'
                        }}
                        className={`h-7 w-28 px-2 border-b border-r border-[var(--border-line)] relative cursor-cell truncate transition-all text-xs ${
                          isSelected 
                            ? 'outline-2 outline-[#16A085] outline-offset-[-2px] z-10 bg-[#16A085]/10 shadow-sm font-semibold' 
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        {isSelected && isEditingCell ? (
                          <input
                            ref={activeInputRef}
                            type="text"
                            value={cellEditValue}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              const val = e.target.value;
                              setCellEditValue(val);
                              setFormulaInput(val);
                            }}
                            onKeyDown={e => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitCellEdit(e.currentTarget.value, e.shiftKey ? 'up' : 'down');
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                commitCellEdit(e.currentTarget.value, e.shiftKey ? 'left' : 'right');
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelCellEdit();
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                commitCellEdit(e.currentTarget.value, 'up');
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                commitCellEdit(e.currentTarget.value, 'down');
                              }
                            }}
                            onBlur={e => {
                              commitCellEdit(e.currentTarget.value, 'none');
                            }}
                            style={{
                              textAlign: style.align || 'left',
                              fontWeight: style.bold ? 'bold' : 'normal',
                              fontStyle: style.italic ? 'italic' : 'normal'
                            }}
                            className="absolute inset-0 w-full h-full px-2 bg-[var(--surface-bg)] text-[var(--text-main)] font-mono text-xs focus:outline-none ring-2 ring-[#16A085] z-30 shadow-md"
                          />
                        ) : (
                          <span className="truncate block">
                            {displayedVal}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. BOTTOM STATUS & SHEET TABS BAR */}
      <div className="border-t border-[var(--border-line)] px-3 py-1.5 bg-[var(--surface-bg)] flex items-center justify-between gap-3 text-xs shrink-0 select-none">
        {/* Sheet Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto min-w-0">
          {sheets.map((sheet, sIdx) => {
            const isActiveTab = sIdx === activeSheetIndex;
            return (
              <button
                key={sheet.id}
                onClick={() => setActiveSheetIndex(sIdx)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  isActiveTab 
                    ? 'bg-[#16A085] text-white shadow-xs' 
                    : 'text-slate-400 hover:text-[var(--text-main)] hover:bg-white/5'
                }`}
              >
                <SheetIcon className="w-3.5 h-3.5" />
                <span>{sheet.name}</span>
              </button>
            );
          })}

          <button
            onClick={handleAddSheetTab}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Add New Sheet Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selected Summary Metrics (Sum, Count) */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 font-mono shrink-0">
          <span>Cell: <strong className="text-[#16A085]">{activeCoord}</strong></span>
          <span>•</span>
          <span>Rows: {currentSheet.rowCount}</span>
          <span>•</span>
          <span>Cols: {currentSheet.colCount}</span>
        </div>
      </div>
    </div>
  );
};
