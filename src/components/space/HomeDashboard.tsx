import React from 'react';
import { useSpace } from '../../context/SpaceContext';
import { useAuth } from '../../context/AuthContext';
import { FileActionMenu } from './FileActionMenu';
import { 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  FolderPlus, 
  Folder, 
  Clock, 
  HardDrive, 
  Pin, 
  ChevronRight, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  X,
  File,
  Activity
} from 'lucide-react';
import { FileItem, FolderItem } from '../../types/space';

export const HomeDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    createDocument, 
    createFolder, 
    files, 
    folders, 
    quickAccess, 
    unpinFromQuickAccess, 
    reorderQuickAccess, 
    setCurrentSection, 
    setCurrentFolderId,
    setPreviewFile,
    quota,
    activities
  } = useSpace();

  // Dynamic time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.email?.split('@')[0] || 'Friend';

  // Recent files (untrashed, sorted by last accessed / updated)
  const recentFiles = files
    .filter(f => !f.isTrashed)
    .sort((a, b) => new Date(b.lastAccessedAt || b.updatedAt).getTime() - new Date(a.lastAccessedAt || a.updatedAt).getTime())
    .slice(0, 6);

  // Quick Access items mapping
  const quickAccessList = quickAccess
    .map(qa => {
      if (qa.itemType === 'folder') {
        const folder = folders.find(f => f.id === qa.itemId && !f.isTrashed);
        return folder ? { ...qa, data: folder, type: 'folder' as const } : null;
      } else {
        const file = files.find(f => f.id === qa.itemId && !f.isTrashed);
        return file ? { ...qa, data: file, type: 'file' as const } : null;
      }
    })
    .filter(Boolean) as { id: string; itemType: 'file' | 'folder'; itemId: string; sortOrder: number; data: FolderItem | FileItem; type: 'file' | 'folder' }[];

  quickAccessList.sort((a, b) => a.sortOrder - b.sortOrder);

  const handleMoveQuickAccess = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= quickAccessList.length) return;
    const reordered = [...quickAccessList];
    const temp = reordered[index];
    reordered[index] = reordered[newIdx];
    reordered[newIdx] = temp;
    reorderQuickAccess(reordered.map(item => item.itemId));
  };

  const handleQuickAccessClick = (item: typeof quickAccessList[0]) => {
    if (item.type === 'folder') {
      setCurrentFolderId(item.data.id);
      setCurrentSection('my-files');
    } else {
      setPreviewFile(item.data as FileItem);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const usedPercentage = Math.min(100, Math.round((quota.usedBytes / quota.quotaBytes) * 100));

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'docs': return <FileText className="w-5 h-5 text-blue-400" />;
      case 'sheets': return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case 'slides': return <Presentation className="w-5 h-5 text-amber-400" />;
      default: return <File className="w-5 h-5 text-teal-400" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* 1. Welcome Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] tracking-tight">
          {getGreeting()}, <span className="text-[#16A085]">{userName}</span>!
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Welcome to OMNI Space — Your files, documents, and ideas all in one place.
        </p>
      </div>

      {/* 2. Welcome + Quick Actions (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => {
            const name = window.prompt('Document title:', 'Untitled Document');
            if (name) createDocument(name, 'docs');
          }}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-[var(--border-line)] hover:border-blue-500/40 text-left transition-all hover:scale-[1.01] group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="font-bold text-xs text-[var(--text-main)]">New Document</div>
            <div className="text-[10px] text-[var(--text-muted)]">Create a Doc (.docx)</div>
          </div>
        </button>

        <button
          onClick={() => {
            const name = window.prompt('Spreadsheet title:', 'Untitled Spreadsheet');
            if (name) createDocument(name, 'sheets');
          }}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-[var(--border-line)] hover:border-emerald-500/40 text-left transition-all hover:scale-[1.01] group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="font-bold text-xs text-[var(--text-main)]">New Spreadsheet</div>
            <div className="text-[10px] text-[var(--text-muted)]">Create a Sheet (.xlsx)</div>
          </div>
        </button>

        <button
          onClick={() => {
            const name = window.prompt('Presentation title:', 'Untitled Presentation');
            if (name) createDocument(name, 'slides');
          }}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-[var(--border-line)] hover:border-amber-500/40 text-left transition-all hover:scale-[1.01] group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Presentation className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="font-bold text-xs text-[var(--text-main)]">New Presentation</div>
            <div className="text-[10px] text-[var(--text-muted)]">Create Slides (.pptx)</div>
          </div>
        </button>

        <button
          onClick={() => {
            const name = window.prompt('Folder name:', 'New Folder');
            if (name) createFolder(name);
          }}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-[var(--border-line)] hover:border-[#16A085]/40 text-left transition-all hover:scale-[1.01] group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-[#16A085]/10 text-[#16A085] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="font-bold text-xs text-[var(--text-main)]">New Folder</div>
            <div className="text-[10px] text-[var(--text-muted)]">Organise files</div>
          </div>
        </button>
      </div>

      {/* 3. Main Workspace Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (65% / 8 cols): Recent Files */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#16A085]" />
              <h2 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Recent Files</h2>
            </div>
            <button
              onClick={() => setCurrentSection('recent')}
              className="text-xs text-[#16A085] hover:underline font-semibold flex items-center gap-1"
            >
              <span>See All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentFiles.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-[var(--border-line)] text-center text-slate-400 text-xs">
              No recent files yet. Click "+ New" above to create your first document.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentFiles.map(file => (
                <div
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-[var(--border-line)] hover:border-[#16A085]/40 cursor-pointer transition-colors group relative"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                    {getFileIcon(file.category)}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="text-xs font-bold text-[var(--text-main)] truncate group-hover:text-[#16A085] transition-colors">
                      {file.name}
                      <span className="text-[10px] text-[var(--text-muted)] font-mono ml-1">.{file.extension}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-0.5">
                      <span className="capitalize">{file.category}</span>
                      <span>•</span>
                      <span>Edited {formatTimeAgo(file.lastAccessedAt || file.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Three-dot Action Menu (Edit, Pin to Quick Access, Move to Trash) */}
                  <div className="absolute right-2 top-2.5 z-10">
                    <FileActionMenu item={file} isFolder={false} align="right" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (35% / 4 cols): Storage, Quick Access, Activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* Storage Overview Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-[var(--border-line)] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#16A085]" />
                <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Storage</h3>
              </div>
              <button 
                onClick={() => setCurrentSection('settings')}
                className="text-[11px] text-[#16A085] hover:underline font-semibold"
              >
                Manage
              </button>
            </div>

            <div className="flex items-baseline justify-between mb-1">
              <span className="text-lg font-bold text-[var(--text-main)]">
                {formatSize(quota.usedBytes)} <span className="text-xs font-normal text-[var(--text-muted)]">of {formatSize(quota.quotaBytes)} used</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#16A085]">{usedPercentage}%</span>
            </div>

            <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden my-2">
              <div
                className="h-full bg-[#16A085] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, usedPercentage)}%` }}
              />
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              {usedPercentage}% of your 2 GB free storage is used.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border-line)] text-[10px] text-[var(--text-muted)]">
              <div>Docs: <span className="font-semibold text-[var(--text-main)]">{formatSize(quota.docsBytes)}</span></div>
              <div>Sheets: <span className="font-semibold text-[var(--text-main)]">{formatSize(quota.sheetsBytes)}</span></div>
              <div>Slides: <span className="font-semibold text-[var(--text-main)]">{formatSize(quota.slidesBytes)}</span></div>
              <div>Other: <span className="font-semibold text-[var(--text-main)]">{formatSize(quota.otherBytes)}</span></div>
            </div>
          </div>

          {/* Updated Quick Access (Pinned Files & Folders with Reorder) */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-[var(--border-line)] shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-[#16A085]" />
                <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Quick Access</h3>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">
                {quickAccessList.length} pinned
              </span>
            </div>

            {quickAccessList.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-3">
                No pinned items yet. Pin files and folders from the 3-dot menu.
              </p>
            ) : (
              <div className="space-y-1.5">
                {quickAccessList.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-transparent hover:border-[var(--border-line)] transition group"
                  >
                    <div 
                      onClick={() => handleQuickAccessClick(item)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                    >
                      {item.type === 'folder' ? (
                        <Folder className="w-4 h-4 text-[#16A085] shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-[var(--text-main)] truncate group-hover:text-[#16A085] transition-colors">
                        {item.data.name}
                      </span>
                    </div>

                    {/* Reorder and Action buttons */}
                    <div className="flex items-center gap-0.5">
                      {idx > 0 && (
                        <button
                          onClick={() => handleMoveQuickAccess(idx, 'up')}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                      )}
                      {idx < quickAccessList.length - 1 && (
                        <button
                          onClick={() => handleMoveQuickAccess(idx, 'down')}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      )}
                      <FileActionMenu 
                        item={item.data} 
                        isFolder={item.type === 'folder'} 
                        align="right" 
                        triggerClassName="p-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Stream */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-[var(--border-line)] shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-[#16A085]" />
              <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Recent Activity</h3>
            </div>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activities.slice(0, 4).map(act => (
                  <div key={act.id} className="text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[var(--text-main)] truncate max-w-[170px]">
                        {act.targetName}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {formatTimeAgo(act.timestamp)}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] capitalize">
                      {act.action} • {act.targetType}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
