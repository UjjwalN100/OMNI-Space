import React, { useState, useRef, useEffect } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);

  const isPinned = isItemPinned(item.id);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
    <div className={`relative ${className}`} ref={menuRef} onClick={e => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        className={`p-1.5 rounded-lg text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10 transition-colors ${triggerClassName}`}
        title="More actions"
        aria-label="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div 
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 w-48 glass-panel rounded-2xl shadow-2xl p-1.5 z-50 border border-[var(--border-line)] bg-[var(--surface-bg)] text-[var(--text-main)] text-xs animate-in fade-in duration-100`}
        >
          {/* Option 1: Edit */}
          <button
            onClick={handleEdit}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left font-medium transition-colors"
          >
            <Edit3 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Edit</span>
          </button>

          {/* Option 2: Pin to Quick Access */}
          <button
            onClick={handleTogglePin}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left font-medium transition-colors"
          >
            <Pin className={`w-4 h-4 shrink-0 ${isPinned ? 'text-amber-400 fill-amber-400' : 'text-[#16A085]'}`} />
            <span className={isPinned ? 'text-amber-300' : ''}>
              {isPinned ? 'Unpin from Quick Access' : 'Pin to Quick Access'}
            </span>
          </button>

          {/* Option 3: Move to Trash */}
          <button
            onClick={handleMoveToTrash}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 text-left font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Move to Trash</span>
          </button>

          {/* Secondary Action: Download (only for files) */}
          {!isFolder && (
            <>
              <div className="my-1 border-t border-[var(--border-line)]" />
              <button
                onClick={handleDownload}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-[var(--text-main)] text-left text-[11px] transition-colors"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Download</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
