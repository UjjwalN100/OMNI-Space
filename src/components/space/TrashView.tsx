import React from 'react';
import { useSpace } from '../../context/SpaceContext';
import { Trash2, RotateCcw, AlertTriangle, Folder, FileText, FileSpreadsheet, Presentation, File } from 'lucide-react';
import { FileItem, FolderItem } from '../../types/space';

export const TrashView: React.FC = () => {
  const { files, folders, restoreItems, permanentDeleteItems } = useSpace();

  const trashedFiles = files.filter(f => f.isTrashed);
  const trashedFolders = folders.filter(f => f.isTrashed);
  const totalTrashed = trashedFiles.length + trashedFolders.length;

  const handleEmptyTrash = () => {
    if (window.confirm('Are you sure you want to permanently delete all items in Trash? This cannot be undone.')) {
      if (trashedFolders.length > 0) {
        permanentDeleteItems(trashedFolders.map(f => f.id), true);
      }
      if (trashedFiles.length > 0) {
        permanentDeleteItems(trashedFiles.map(f => f.id), false);
      }
    }
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'docs': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'sheets': return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
      case 'slides': return <Presentation className="w-4 h-4 text-amber-400" />;
      default: return <File className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-amber-300">Items in Trash will be automatically purged after 30 days</h3>
            <p className="text-[11px] text-amber-200/70">You can restore items to their original location or delete them permanently.</p>
          </div>
        </div>

        {totalTrashed > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {totalTrashed === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 text-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-500/10 text-slate-400 flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-main)]">Trash is empty</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">Deleted files and folders will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Deleted Items ({totalTrashed})
          </div>

          <div className="rounded-2xl border border-[var(--border-line)] bg-white/[0.02] divide-y divide-[var(--border-line)] overflow-hidden">
            {/* Trashed Folders */}
            {trashedFolders.map(folder => (
              <div key={folder.id} className="flex items-center justify-between p-3 hover:bg-white/[0.04] transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-[var(--text-main)] truncate">{folder.name} (Folder)</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => restoreItems([folder.id], true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#16A085]/20 text-[#16A085] hover:bg-[#16A085]/30 text-xs font-semibold transition"
                    title="Restore Folder"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Permanently delete folder "${folder.name}"?`)) {
                        permanentDeleteItems([folder.id], true);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/10 transition"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Trashed Files */}
            {trashedFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between p-3 hover:bg-white/[0.04] transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  {getFileIcon(file.category)}
                  <span className="text-xs font-semibold text-[var(--text-main)] truncate">{file.name}.{file.extension}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => restoreItems([file.id], false)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#16A085]/20 text-[#16A085] hover:bg-[#16A085]/30 text-xs font-semibold transition"
                    title="Restore File"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Permanently delete file "${file.name}.${file.extension}"?`)) {
                        permanentDeleteItems([file.id], false);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/10 transition"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
