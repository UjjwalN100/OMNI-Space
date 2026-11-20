import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSpace } from '../../context/SpaceContext';
import { MoreVertical, Edit3, Pin, Trash2, Download } from 'lucide-react';
import { FileItem, FolderItem } from '../../types/space';

interface FileActionMenuProps {
  item: FileItem | FolderItem;
  isFolder: boolean;
  align?: 'left' | 'right';
  className?: string;
  triggerClassName?: string;
}

export const FileActionMenu: React.FC<FileActionMenuProps> = ({
  item,
  isFolder,
  align = 'right',
  className = '',
  triggerClassName = ''
}) => {
  const {
    pinToQuickAccess,
    unpinFromQuickAccess,
    isItemPinned,
    trashItems,
    openFileInEditMode,
    renameItem,
    downloadFile
  } = useSpace();

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isPinned = isItemPinned(item.id);

  // Calculate and update menu fixed position
  const updatePosition = useCallback(() => {
    if (!triggerButtonRef.current) return;
    const rect = triggerButtonRef.current.getBoundingClientRect();
    const menuWidth = 192; // 12rem = 192px
    const margin = 4;

    // Position vertically
    let top = rect.bottom + margin;
    const estimatedHeight = isFolder ? 130 : 175;
    if (top + estimatedHeight > window.innerHeight && rect.top > estimatedHeight) {
      top = rect.top - estimatedHeight - margin;
    }

    // Position horizontally
    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    setPosition({ top, left });
  }, [align, isFolder]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close menu when clicking outside or scrolling
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        triggerButtonRef.current && !triggerButtonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (isFolder) {
      const newName = window.prompt('Rename folder:', item.name);
      if (newName && newName.trim()) {
        renameItem(item.id, newName.trim(), true);
      }
    } else {
      openFileInEditMode(item as FileItem);
    }
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (isPinned) {
      unpinFromQuickAccess(item.id);
    } else {
      pinToQuickAccess(item.id, isFolder ? 'folder' : 'file');
    }
  };

  const handleMoveToTrash = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    trashItems([item.id], isFolder);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (!isFolder) {
      downloadFile(item as FileItem);
    }
  };

  return (
    <div className={`relative ${className}`} onClick={e => e.stopPropagation()}>
      <button
        ref={triggerButtonRef}
        onClick={toggleMenu}
        className={`p-1.5 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10 transition-colors ${triggerClassName}`}
        title="More actions"
        aria-label="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: '192px',
            zIndex: 99999
          }}
          className="rounded-2xl shadow-2xl p-1.5 border border-slate-700/60 dark:border-white/15 bg-white dark:bg-[#131927] text-[var(--text-main)] text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          {/* Option 1: Edit */}
          <button
            onClick={handleEdit}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium transition-colors"
          >
            <Edit3 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Edit</span>
          </button>

          {/* Option 2: Pin to Quick Access */}
          <button
            onClick={handleTogglePin}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium transition-colors"
          >
            <Pin className={`w-4 h-4 shrink-0 ${isPinned ? 'text-amber-400 fill-amber-400' : 'text-[#16A085]'}`} />
            <span className={isPinned ? 'text-amber-400 font-semibold' : ''}>
              {isPinned ? 'Unpin from Quick Access' : 'Pin to Quick Access'}
            </span>
          </button>

          {/* Option 3: Move to Trash */}
          <button
            onClick={handleMoveToTrash}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-400 text-left font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Move to Trash</span>
          </button>

          {/* Secondary Action: Download (only for files) */}
          {!isFolder && (
            <>
              <div className="my-1 border-t border-slate-200 dark:border-white/10" />
              <button
                onClick={handleDownload}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-[var(--text-main)] text-left text-[11px] transition-colors"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Download</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
