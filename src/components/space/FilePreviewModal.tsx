import React, { useState, useEffect } from 'react';
import { useSpace } from '../../context/SpaceContext';
import { supabase } from '../../lib/supabase';
import { DocEditor } from './DocEditor';
import { 
  X, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  File, 
  Save, 
  Sparkles,
  Layers,
  Image as ImageIcon,
  Maximize2,
  Minimize2
} from 'lucide-react';

export const FilePreviewModal: React.FC = () => {
  const { previewFile, setPreviewFile, downloadFile, isEditMode, setIsEditMode, updateFileContent } = useSpace();
  const [content, setContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!previewFile) {
      setSignedUrl(null);
      setContent('');
      setFileName('');
      setIsEditing(false);
      return;
    }

    setContent(previewFile.content || '');
    setFileName(previewFile.name || '');
    setIsEditing(isEditMode);

    if (previewFile.r2StorageKey) {
      supabase.storage
        .from('omni-files')
        .createSignedUrl(previewFile.r2StorageKey, 3600)
        .then(({ data, error }) => {
          if (!error && data?.signedUrl) {
            setSignedUrl(data.signedUrl);
          }
        });
    } else {
      setSignedUrl(null);
    }
  }, [previewFile, isEditMode]);

  if (!previewFile) return null;

  const handleSave = () => {
    updateFileContent(previewFile.id, content, fileName);
    setIsEditing(false);
    setIsEditMode(false);
  };

  const handleDownload = () => {
    downloadFile(previewFile);
  };

  const getFileBadgeColor = () => {
    switch (previewFile.category) {
      case 'docs': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'sheets': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'slides': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-teal-500/10 text-[#16A085] border-teal-500/20';
    }
  };

  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(previewFile.extension.toLowerCase());
  const isPdf = previewFile.extension.toLowerCase() === 'pdf';
  const isDoc = previewFile.category === 'docs' || (!isImage && !isPdf && previewFile.category !== 'sheets' && previewFile.category !== 'slides');

  if (isDoc) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-6 animate-in fade-in duration-150">
        <div className={`w-full glass-panel rounded-3xl shadow-2xl flex flex-col border border-[var(--border-line)] bg-[var(--surface-bg)] text-[var(--text-main)] overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'fixed inset-0 h-screen max-w-none rounded-none' : 'max-w-5xl h-[90vh]'
        }`}>
          <DocEditor
            file={previewFile}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
            onClose={() => setPreviewFile(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150">
      <div className={`w-full glass-panel rounded-3xl shadow-2xl flex flex-col border border-[var(--border-line)] bg-[var(--surface-bg)] text-[var(--text-main)] overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'fixed inset-0 h-screen max-w-none rounded-none' : 'max-w-4xl h-[85vh]'
      }`}>
        {/* Modal Header */}
        <div className="h-14 border-b border-[var(--border-line)] px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
              {previewFile.category === 'docs' ? <FileText className="w-4 h-4 text-blue-400" /> :
               previewFile.category === 'sheets' ? <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> :
               previewFile.category === 'slides' ? <Presentation className="w-4 h-4 text-amber-400" /> :
               isImage ? <ImageIcon className="w-4 h-4 text-purple-400" /> :
               <File className="w-4 h-4 text-[#16A085]" />}
            </div>
            <div className="truncate">
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    className="font-bold text-sm bg-white/10 border border-[#16A085]/50 rounded-lg px-2 py-0.5 text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[#16A085]"
                  />
                  <span className="text-xs text-[var(--text-muted)] font-mono">.{previewFile.extension}</span>
                </div>
              ) : (
                <h3 className="font-bold text-sm text-[var(--text-main)] truncate">
                  {fileName || previewFile.name}.{previewFile.extension}
                </h3>
              )}
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                <span className={`px-1.5 py-0.2 rounded border font-semibold uppercase ${getFileBadgeColor()}`}>
                  {previewFile.category}
                </span>
                <span>•</span>
                <span>{((previewFile.sizeBytes) / 1024).toFixed(0)} KB</span>
                {previewFile.r2StorageKey && (
                  <>
                    <span>•</span>
                    <span className="text-[#16A085] font-semibold">Cloud Stored</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isImage && !isPdf && (
              isEditing ? (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#16A085] hover:bg-[#138d75] text-white text-xs font-bold transition shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-[var(--border-line)] text-xs font-semibold text-[var(--text-main)] transition"
                >
                  <span>Edit Notes</span>
                </button>
              )
            )}

            <button
              onClick={handleDownload}
              className="p-2 text-slate-400 hover:text-[var(--text-main)] rounded-xl hover:bg-white/5 transition"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-2 text-slate-400 hover:text-[var(--text-main)] rounded-xl hover:bg-white/5 transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setPreviewFile(null)}
              className="p-2 text-slate-400 hover:text-[var(--text-main)] rounded-xl hover:bg-white/5 transition"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Integration Notice Banner */}
        <div className="px-4 sm:px-6 py-2 bg-gradient-to-r from-teal-500/10 via-purple-500/10 to-transparent border-b border-[var(--border-line)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#16A085] font-semibold text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Secure Cloud Storage Vault Active</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Status: Encrypted & Private
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {isImage && signedUrl ? (
            /* Live Image Preview */
            <div className="flex-1 flex items-center justify-center p-4">
              <img 
                src={signedUrl} 
                alt={previewFile.name} 
                className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-2xl border border-[var(--border-line)]"
              />
            </div>
          ) : isPdf && signedUrl ? (
            /* Live PDF Iframe Preview */
            <div className="flex-1 w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-[var(--border-line)]">
              <iframe
                src={signedUrl}
                title={previewFile.name}
                className="w-full h-full min-h-[500px]"
              />
            </div>
          ) : previewFile.category === 'sheets' ? (
            /* Spreadsheet Preview Grid */
            <div className="space-y-4">
              <div className="border border-[var(--border-line)] rounded-xl overflow-hidden bg-white/[0.02]">
                <table className="w-full text-xs font-mono">
                  <tbody>
                    {(content || previewFile.content || 'Item,Cost,Qty\n1,100,2\n2,200,1').split('\n').map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx === 0 ? 'bg-white/[0.05] font-bold border-b border-[var(--border-line)]' : 'border-b border-[var(--border-line)]'}>
                        <td className="w-8 py-1.5 px-2 text-slate-500 text-center select-none bg-white/[0.02] border-r border-[var(--border-line)] text-[10px]">
                          {rIdx + 1}
                        </td>
                        {row.split(',').map((cell, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 border-r border-[var(--border-line)] text-[var(--text-main)]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isEditing && (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full h-40 p-3 rounded-xl bg-white/[0.03] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#16A085]/40"
                  placeholder="Comma-separated values (CSV / Table format)"
                />
              )}
            </div>
          ) : previewFile.category === 'slides' ? (
            /* Slides Preview Presentation Card */
            <div className="space-y-4 flex flex-col items-center">
              <div className="w-full max-w-2xl aspect-video rounded-2xl bg-gradient-to-tr from-[#171A2B] to-[#25283f] border border-[var(--border-line)] p-8 flex flex-col justify-between shadow-xl">
                <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  <span>OMNI Presentation Mode</span>
                  <span className="font-mono">Slide 1 of 3</span>
                </div>
                <div className="my-auto text-center space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">{previewFile.name}</h2>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    {content.split('\n')[0] || 'Executive Presentation Deck'}
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 text-center font-mono">
                  Prepared in OMNI Space
                </div>
              </div>
              {isEditing && (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full max-w-2xl h-32 p-3 rounded-xl bg-white/[0.03] border border-[var(--border-line)] text-xs font-mono text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#16A085]/40"
                  placeholder="Slide outlines..."
                />
              )}
            </div>
          ) : (
            /* Standard Document / Text Editor */
            <div className="h-full">
              {isEditing ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full h-full min-h-[400px] p-4 rounded-2xl bg-white/[0.03] border border-[var(--border-line)] text-xs sm:text-sm font-sans leading-relaxed text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[#16A085]/40"
                  placeholder="Type your notes or document markdown here..."
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-[var(--text-main)] whitespace-pre-wrap font-sans p-2">
                  {content || previewFile.content || 'Blank document. Click "Edit Notes" to begin typing.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
