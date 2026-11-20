import React, { useState, useRef } from 'react';
import { useSpace } from '../../context/SpaceContext';
import { 
  Plus, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  FolderPlus, 
  Upload, 
  FolderUp, 
  ChevronDown,
  X
} from 'lucide-react';

interface NewItemDropdownProps {
  collapsed?: boolean;
}

export const NewItemDropdown: React.FC<NewItemDropdownProps> = ({ collapsed = false }) => {
  const { createFolder, createDocument, uploadFiles, setPreviewFile } = useSpace();
  const [isOpen, setIsOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleCreateDoc = (type: 'docs' | 'sheets' | 'slides') => {
    setIsOpen(false);
    const defaultName = type === 'docs' ? 'Untitled Document' : type === 'sheets' ? 'Untitled Spreadsheet' : 'Untitled Presentation';
    const name = window.prompt(`Enter title for new ${type === 'docs' ? 'Document' : type === 'sheets' ? 'Spreadsheet' : 'Presentation'}:`, defaultName);
    if (name) {
      const newFile = createDocument(name, type);
      if (newFile) {
        setPreviewFile(newFile);
      }
    }
  };

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      createFolder(folderName.trim());
      setFolderName('');
      setIsFolderModalOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
      setIsOpen(false);
    }
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={`flex items-center justify-center gap-2 rounded-xl bg-[#16A085] hover:bg-[#138d75] text-white font-semibold shadow-md shadow-[#16A085]/20 transition-all hover:scale-[1.01] active:scale-[0.99] ${
            collapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full py-2.5 px-3.5 text-xs'
          }`}
          title="Create or Upload"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="truncate">New</span>
              <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 top-full mt-2 w-64 glass-panel rounded-2xl shadow-2xl p-2 z-50 border border-[var(--border-line)] animate-in fade-in zoom-in-95 duration-100 bg-[var(--surface-bg)] text-[var(--text-main)]">
              {/* Creation Options */}
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Create New
              </div>
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsFolderModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 dark:hover:bg-white/5 transition text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-teal-500/10 text-[#16A085] flex items-center justify-center">
                  <FolderPlus className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-main)]">New Folder</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Organise your workspace</div>
                </div>
              </button>

              <button
                onClick={() => handleCreateDoc('docs')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 dark:hover:bg-white/5 transition text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-main)]">New Document</div>
                  <div className="text-[10px] text-[var(--text-muted)]">ONLYOFFICE .docx</div>
                </div>
              </button>

              <button
                onClick={() => handleCreateDoc('sheets')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 dark:hover:bg-white/5 transition text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-main)]">New Spreadsheet</div>
                  <div className="text-[10px] text-[var(--text-muted)]">ONLYOFFICE .xlsx</div>
                </div>
              </button>

              <button
                onClick={() => handleCreateDoc('slides')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 dark:hover:bg-white/5 transition text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Presentation className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-main)]">New Presentation</div>
                  <div className="text-[10px] text-[var(--text-muted)]">ONLYOFFICE .pptx</div>
                </div>
              </button>

              {/* Upload Options */}
              <div className="my-1.5 border-t border-[var(--border-line)]" />
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Upload
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 dark:hover:bg-white/5 transition text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-500/10 text-slate-400 flex items-center justify-center">
                  <Upload className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-main)]">File Upload</div>
                  <div className="text-[10px] text-[var(--text-muted)]">From your device</div>
                </div>
              </button>

              <button
                onClick={() => folderInputRef.current?.click()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 dark:hover:bg-white/5 transition text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-500/10 text-slate-400 flex items-center justify-center">
                  <FolderUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-main)]">Folder Upload</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Preserves folder structure</div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
      {/* Folder Upload Input with webkitdirectory */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={handleFolderUpload}
      />

      {/* New Folder Inline Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl p-5 border border-[var(--border-line)] bg-[var(--surface-bg)] text-[var(--text-main)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#16A085]/15 text-[#16A085] flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm">New Folder</h3>
              </div>
              <button 
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFolderSubmit}>
              <input
                type="text"
                autoFocus
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                placeholder="Folder name (e.g. Mathematics, Projects)"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-[var(--border-line)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#16A085]/40 mb-4"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-[var(--text-main)] hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!folderName.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#16A085] hover:bg-[#138d75] text-white transition disabled:opacity-50"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
