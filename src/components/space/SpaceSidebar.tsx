import React from 'react';
import { useSpace } from '../../context/SpaceContext';
import { NewItemDropdown } from './NewItemDropdown';
import { 
  Home, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Folder, 
  Clock, 
  Trash2, 
  Settings, 
  PanelLeftClose, 
  PanelLeftOpen, 
  HardDrive,
  Layers,
  Sparkles,
  Pin
} from 'lucide-react';
import { SpaceSection, FolderItem, FileItem } from '../../types/space';

export const SpaceSidebar: React.FC = () => {
  const { 
    currentSection, 
    setCurrentSection, 
    isSidebarCollapsed, 
    setIsSidebarCollapsed,
    quota,
    files,
    folders,
    quickAccess,
    setCurrentFolderId,
    setPreviewFile
  } = useSpace();

  // Map Quick Access pinned items
  const pinnedList = quickAccess
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

  const navItems: { id: SpaceSection; label: string; icon: any; color?: string; count?: number }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'docs', label: 'Docs', icon: FileText, color: '#38bdf8', count: files.filter(f => !f.isTrashed && f.category === 'docs').length },
    { id: 'sheets', label: 'Sheets', icon: FileSpreadsheet, color: '#10b981', count: files.filter(f => !f.isTrashed && f.category === 'sheets').length },
    { id: 'slides', label: 'Slides', icon: Presentation, color: '#f59e0b', count: files.filter(f => !f.isTrashed && f.category === 'slides').length },
    { id: 'my-files', label: 'My Files', icon: Folder, color: '#16A085' },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'trash', label: 'Trash', icon: Trash2, count: files.filter(f => f.isTrashed).length },
  ];

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const usedPercentage = Math.min(100, Math.round((quota.usedBytes / quota.quotaBytes) * 100));

  return (
    <aside 
      className={`border-r border-[var(--border-line)] bg-[var(--surface-bg)] flex flex-col h-[calc(100vh-3.5rem)] select-none shrink-0 transition-all duration-200 ${
        isSidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Branding / Collapse header */}
      <div className={`p-3 border-b border-[var(--border-line)] flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#16A085]/15 text-[#16A085] flex items-center justify-center font-bold text-xs shadow-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider text-[var(--text-main)] uppercase">OMNI Space</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">Cloud & Office</span>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsSidebarCollapsed(prev => !prev)}
          className="p-1.5 text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10 dark:hover:bg-white/5 rounded-lg transition"
          title={isSidebarCollapsed ? "Expand Sidebar ( [ )" : "Collapse Sidebar ( [ )"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Action Button (+ New) */}
      <div className="p-3">
        <NewItemDropdown collapsed={isSidebarCollapsed} />
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-2.5 py-1 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive 
                  ? 'bg-[#16A085]/15 text-[#16A085] font-bold shadow-xs' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'
              } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <Icon 
                className="w-4 h-4 shrink-0 transition-colors" 
                style={item.color && !isActive ? { color: item.color } : undefined}
              />
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-md bg-white/5 text-[var(--text-muted)] font-mono">
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}

        {/* Quick Access Pinned Section */}
        {!isSidebarCollapsed && pinnedList.length > 0 && (
          <div className="pt-3 pb-1 border-t border-[var(--border-line)] mt-2">
            <div className="flex items-center justify-between px-3 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Pin className="w-3 h-3 text-[#16A085]" />
                <span>Quick Access</span>
              </div>
              <span className="text-[9px] font-mono">{pinnedList.length}</span>
            </div>
            <div className="space-y-0.5 max-h-36 overflow-y-auto">
              {pinnedList.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'folder') {
                      setCurrentFolderId(item.data.id);
                      setCurrentSection('my-files');
                    } else {
                      setPreviewFile(item.data as FileItem);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition text-left truncate group"
                  title={item.data.name}
                >
                  {item.type === 'folder' ? (
                    <Folder className="w-3.5 h-3.5 text-[#16A085] shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                  <span className="truncate group-hover:text-[#16A085] transition-colors">{item.data.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Storage Gauge & Bottom Settings */}
      <div className="p-3 border-t border-[var(--border-line)] bg-black/[0.02] dark:bg-black/10">
        {!isSidebarCollapsed ? (
          <div className="mb-2 p-2.5 rounded-xl bg-white/[0.03] border border-[var(--border-line)]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-main)] mb-1">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[#16A085]" />
                <span>Storage</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">{usedPercentage}%</span>
            </div>
            
            <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-1.5">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  usedPercentage > 90 ? 'bg-rose-500' : usedPercentage > 75 ? 'bg-amber-500' : 'bg-[#16A085]'
                }`}
                style={{ width: `${Math.max(4, usedPercentage)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>{formatSize(quota.usedBytes)} of {formatSize(quota.quotaBytes)}</span>
              <button 
                onClick={() => setCurrentSection('settings')}
                className="text-[#16A085] hover:underline font-semibold"
              >
                Upgrade
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2" title={`${formatSize(quota.usedBytes)} of ${formatSize(quota.quotaBytes)} (${usedPercentage}%)`}>
            <HardDrive className="w-4 h-4 text-[#16A085] mb-1" />
            <span className="text-[9px] font-mono text-[var(--text-muted)]">{usedPercentage}%</span>
          </div>
        )}

        <button
          onClick={() => setCurrentSection('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition ${
            currentSection === 'settings' ? 'text-[#16A085] font-bold bg-[#16A085]/10' : ''
          } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          title="Settings"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isSidebarCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
};
