import React, { useState } from 'react';
import { useSpace } from '../../context/SpaceContext';
import { 
  Search, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  ChevronRight, 
  Trash2, 
  CornerDownRight, 
  Download, 
  X,
  Filter
} from 'lucide-react';

export const SpaceTopBar: React.FC = () => {
  const { 
    currentSection, 
    setCurrentSection, 
    currentFolderId, 
    setCurrentFolderId, 
    breadcrumbs,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedIds,
    clearSelection,
    trashItems,
    files,
    folders
  } = useSpace();

  const [isSortOpen, setIsSortOpen] = useState(false);

  const getSectionTitle = () => {
    switch (currentSection) {
      case 'home': return 'Home';
      case 'docs': return 'Docs';
      case 'sheets': return 'Sheets';
      case 'slides': return 'Slides';
      case 'recent': return 'Recent Files';
      case 'trash': return 'Trash';
      case 'settings': return 'Space Settings';
      case 'my-files': return 'My Files';
      default: return 'OMNI Space';
    }
  };

  const handleBatchTrash = () => {
    if (window.confirm(`Move ${selectedIds.length} item(s) to Trash?`)) {
      trashItems(selectedIds, false);
    }
  };

  return (
    <div className="h-14 border-b border-[var(--border-line)] bg-[var(--surface-bg)] px-4 flex items-center justify-between gap-4 select-none transition-colors">
      {/* Left: Breadcrumbs or Section Title */}
      <div className="flex items-center gap-1.5 min-w-0">
        {currentSection === 'my-files' ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-[var(--text-main)] truncate">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id || 'root'}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  {isLast ? (
                    <span className="text-[var(--text-main)] font-bold truncate max-w-[160px]">{crumb.name}</span>
                  ) : (
                    <button
                      onClick={() => setCurrentFolderId(crumb.id)}
                      className="text-slate-400 hover:text-[var(--text-main)] hover:underline truncate max-w-[120px] transition"
                    >
                      {crumb.name}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <h2 className="text-sm font-bold text-[var(--text-main)] tracking-tight capitalize truncate">
            {getSectionTitle()}
          </h2>
        )}
      </div>

      {/* Center: Universal Search Input */}
      <div className="flex-1 max-w-md relative hidden sm:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search files, folders & contents..."
            className="w-full pl-9 pr-14 py-1.5 rounded-xl bg-white/[0.04] border border-[var(--border-line)] text-xs text-[var(--text-main)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16A085]/40 transition"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-[var(--text-main)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] bg-white/10 rounded font-mono text-slate-400">
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {/* Right: Batch Actions OR Sort & View Mode Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {selectedIds.length > 0 ? (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#16A085]/10 border border-[#16A085]/30 animate-in fade-in duration-100">
            <span className="text-[11px] font-bold text-[#16A085] px-2">
              {selectedIds.length} selected
            </span>
            <button
              onClick={handleBatchTrash}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-semibold transition"
              title="Move to Trash"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={clearSelection}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Sort Options Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-line)] text-xs text-slate-400 hover:text-[var(--text-main)] hover:bg-white/5 transition"
                title="Sort items"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden md:inline capitalize">{sortBy}</span>
              </button>

              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 glass-panel rounded-xl shadow-xl p-2 z-50 border border-[var(--border-line)] bg-[var(--surface-bg)] text-[var(--text-main)] text-xs">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Sort by
                    </div>
                    {(['name', 'updatedAt', 'size', 'type'] as const).map(option => (
                      <button
                        key={option}
                        onClick={() => {
                          if (sortBy === option) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy(option);
                            setSortOrder('asc');
                          }
                          setIsSortOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg capitalize hover:bg-white/5 ${
                          sortBy === option ? 'text-[#16A085] font-bold bg-[#16A085]/10' : 'text-slate-400'
                        }`}
                      >
                        <span>{option === 'updatedAt' ? 'Last Modified' : option}</span>
                        {sortBy === option && (
                          <span className="text-[10px] font-mono">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Grid vs List View Toggle */}
            <div className="flex items-center p-0.5 rounded-lg border border-[var(--border-line)] bg-white/[0.02]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-md transition ${
                  viewMode === 'grid' ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-400 hover:text-[var(--text-main)]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-md transition ${
                  viewMode === 'list' ? 'bg-[#16A085] text-white shadow-xs' : 'text-slate-400 hover:text-[var(--text-main)]'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
