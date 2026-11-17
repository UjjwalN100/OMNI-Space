import React, { useState } from 'react';
import { useSpace } from '../../context/SpaceContext';
import { FileActionMenu } from './FileActionMenu';
import { 
  Folder, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  File, 
  MoreVertical, 
  Pin, 
  Download, 
  Edit3, 
  Copy, 
  Trash2, 
  Eye, 
  CornerDownRight, 
  Plus,
  CheckCircle2,
  FolderPlus
} from 'lucide-react';
import { FileItem, FolderItem } from '../../types/space';

export const FileExplorerView: React.FC = () => {
  const { 
    currentSection, 
    displayedFiles, 
    displayedFolders, 
    currentFolderId, 
    setCurrentFolderId, 
    viewMode,
    selectedIds,
    toggleSelectId,
    setPreviewFile,
    pinToQuickAccess,
    unpinFromQuickAccess,
    isItemPinned,
    trashItems,
    renameItem,
    makeCopy,
    createFolder,
    createDocument,
    uploadFiles,
    downloadFile
  } = useSpace();

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'docs': return <FileText className="w-5 h-5 text-blue-400" />;
      case 'sheets': return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case 'slides': return <Presentation className="w-5 h-5 text-amber-400" />;
      default: return <File className="w-5 h-5 text-teal-400" />;
    }
  };

  const handleDownload = (file: FileItem) => {
    downloadFile(file);
    setActiveMenuId(null);
  };

  const handleRename = (id: string, currentName: string, isFolder: boolean) => {
    setActiveMenuId(null);
    const newName = window.prompt(`Rename ${isFolder ? 'folder' : 'file'}:`, currentName);
    if (newName && newName.trim()) {
      renameItem(id, newName.trim(), isFolder);
    }
  };

  // Drag and drop upload support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const isEmpty = displayedFolders.length === 0 && displayedFiles.length === 0;

  return (
    <div 
      className={`flex-1 overflow-y-auto p-4 sm:p-6 select-none relative ${
        isDragOver ? 'ring-4 ring-[#16A085] ring-inset bg-[#16A085]/5' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Over Overlay notice */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
          <div className="p-6 rounded-2xl bg-[var(--surface-bg)] border-2 border-dashed border-[#16A085] text-center shadow-2xl">
            <FolderPlus className="w-10 h-10 text-[#16A085] mx-auto mb-2 animate-bounce" />
            <h3 className="font-bold text-sm text-[var(--text-main)]">Drop files here to upload</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">Files will be placed in current directory</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#16A085]/10 text-[#16A085] flex items-center justify-center mb-4 shadow-sm">
            {currentSection === 'docs' ? <FileText className="w-8 h-8 text-blue-400" /> :
             currentSection === 'sheets' ? <FileSpreadsheet className="w-8 h-8 text-emerald-400" /> :
             currentSection === 'slides' ? <Presentation className="w-8 h-8 text-amber-400" /> :
             <Folder className="w-8 h-8 text-[#16A085]" />}
          </div>
          <h3 className="text-base font-bold text-[var(--text-main)]">
            No {currentSection === 'docs' ? 'documents' : currentSection === 'sheets' ? 'spreadsheets' : currentSection === 'slides' ? 'presentations' : 'files'} found
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1 mb-5">
            Create a new file or drag and drop items from your desktop directly into this window.
          </p>
          <div className="flex items-center gap-2">
            {currentSection === 'my-files' && (
              <button
                onClick={() => {
                  const name = window.prompt('Folder name:', 'New Folder');
                  if (name) createFolder(name);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-line)] text-xs font-semibold text-[var(--text-main)] hover:bg-white/5 transition"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#16A085]" />
                <span>New Folder</span>
              </button>
            )}
            <button
              onClick={() => {
                const cat = currentSection === 'sheets' ? 'sheets' : currentSection === 'slides' ? 'slides' : 'docs';
                createDocument(`New ${cat}`, cat);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A085] hover:bg-[#138d75] text-white text-xs font-bold shadow-md shadow-[#16A085]/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Item</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Folders Section (Only in My Files view) */}
          {displayedFolders.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                Folders
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {displayedFolders.map(folder => {
                  const isPinned = isItemPinned(folder.id);
                  const isSelected = selectedIds.includes(folder.id);
                  return (
                    <div
                      key={folder.id}
                      className={`relative group p-3 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'bg-[#16A085]/10 border-[#16A085] shadow-sm' 
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-[var(--border-line)] hover:border-[#16A085]/40'
                      }`}
                    >
                      <div 
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Folder className="w-6 h-6 text-[#16A085] fill-[#16A085]/20" />
                          {isPinned && <Pin className="w-3 h-3 text-[#16A085] fill-[#16A085]" />}
                        </div>
                        <div className="font-semibold text-xs text-[var(--text-main)] truncate group-hover:text-[#16A085] transition-colors">
                          {folder.name}
                        </div>
                      </div>

                      {/* Folder 3-dot action menu */}
                      <div className="absolute top-2 right-2 z-10">
                        <FileActionMenu item={folder} isFolder={true} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files Section */}
          {displayedFiles.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                Files ({displayedFiles.length})
              </div>

              {viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {displayedFiles.map(file => {
                    const isPinned = isItemPinned(file.id);
                    const isSelected = selectedIds.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        className={`relative group p-4 rounded-2xl border transition-all ${
                          isSelected 
                            ? 'bg-[#16A085]/10 border-[#16A085] shadow-sm' 
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-[var(--border-line)] hover:border-[#16A085]/40'
                        }`}
                      >
                        {/* Checkbox selector */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectId(file.id);
                          }}
                          className={`absolute top-3 left-3 p-0.5 rounded transition ${
                            isSelected 
                              ? 'text-[#16A085] opacity-100' 
                              : 'text-slate-400 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'fill-[#16A085]/20' : ''}`} />
                        </button>

                        {/* Top Card Icon & Pin */}
                        <div 
                          onClick={() => setPreviewFile(file)}
                          className="cursor-pointer flex items-center justify-between mb-3 pl-6"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                            {getFileIcon(file.category)}
                          </div>
                          {isPinned && <Pin className="w-3.5 h-3.5 text-[#16A085] fill-[#16A085]" />}
                        </div>

                        {/* Title & Metadata */}
                        <div 
                          onClick={() => setPreviewFile(file)}
                          className="cursor-pointer"
                        >
                          <h4 className="font-bold text-xs text-[var(--text-main)] truncate group-hover:text-[#16A085] transition-colors">
                            {file.name}
                            <span className="text-[10px] text-[var(--text-muted)] font-mono ml-1">.{file.extension}</span>
                          </h4>
                          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-1.5">
                            <span>{formatSize(file.sizeBytes)}</span>
                            <span>{formatDate(file.updatedAt)}</span>
                          </div>
                        </div>

                        {/* File 3-dot action menu */}
                        <div className="absolute top-3 right-3 z-10">
                          <FileActionMenu item={file} isFolder={false} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View */
                <div className="rounded-2xl border border-[var(--border-line)] bg-white/[0.02] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-line)] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-10"></th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3 hidden sm:table-cell">Type</th>
                        <th className="py-2.5 px-3 hidden md:table-cell">Size</th>
                        <th className="py-2.5 px-3 hidden lg:table-cell">Last Modified</th>
                        <th className="py-2.5 px-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-line)]">
                      {displayedFiles.map(file => {
                        const isPinned = isItemPinned(file.id);
                        const isSelected = selectedIds.includes(file.id);
                        return (
                          <tr 
                            key={file.id} 
                            className={`hover:bg-white/[0.04] transition group ${isSelected ? 'bg-[#16A085]/10' : ''}`}
                          >
                            <td className="py-2.5 px-3">
                              <button
                                onClick={() => toggleSelectId(file.id)}
                                className={`p-0.5 rounded transition ${
                                  isSelected ? 'text-[#16A085]' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </td>
                            <td 
                              onClick={() => setPreviewFile(file)}
                              className="py-2.5 px-3 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="shrink-0">{getFileIcon(file.category)}</div>
                                <span className="font-semibold text-[var(--text-main)] group-hover:text-[#16A085] transition-colors truncate max-w-[280px]">
                                  {file.name}.{file.extension}
                                </span>
                                {isPinned && <Pin className="w-3 h-3 text-[#16A085] fill-[#16A085] shrink-0" />}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-[var(--text-muted)] capitalize hidden sm:table-cell">
                              {file.category}
                            </td>
                            <td className="py-2.5 px-3 text-[var(--text-muted)] font-mono hidden md:table-cell">
                              {formatSize(file.sizeBytes)}
                            </td>
                            <td className="py-2.5 px-3 text-[var(--text-muted)] hidden lg:table-cell">
                              {formatDate(file.updatedAt)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <FileActionMenu item={file} isFolder={false} align="right" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
