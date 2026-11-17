import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileItem, 
  FolderItem, 
  QuickAccessItem, 
  StorageQuota, 
  ActivityItem, 
  SpaceSection, 
  FileCategory 
} from '../types/space';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface SpaceContextType {
  currentSection: SpaceSection;
  setCurrentSection: (section: SpaceSection) => void;
  currentFolderId: string | null;
  setCurrentFolderId: (folderId: string | null) => void;
  breadcrumbs: BreadcrumbItem[];
  
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  sortBy: 'name' | 'updatedAt' | 'size' | 'type';
  setSortBy: (sort: 'name' | 'updatedAt' | 'size' | 'type') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleSelectId: (id: string) => void;
  clearSelection: () => void;

  files: FileItem[];
  folders: FolderItem[];
  quickAccess: QuickAccessItem[];
  quota: StorageQuota;
  activities: ActivityItem[];
  
  previewFile: FileItem | null;
  setPreviewFile: (file: FileItem | null) => void;
  isEditMode: boolean;
  setIsEditMode: (editing: boolean) => void;
  openFileInEditMode: (file: FileItem) => void;
  updateFileContent: (fileId: string, content: string, newName?: string) => void;
  
  // Handlers
  createFolder: (name: string, parentId?: string | null) => void;
  createDocument: (name: string, category: 'docs' | 'sheets' | 'slides') => FileItem;
  uploadFiles: (uploadedFiles: FileList | File[], targetFolderId?: string | null) => void;
  downloadFile: (file: FileItem) => Promise<void>;
  renameItem: (id: string, newName: string, isFolder: boolean) => void;
  moveItem: (id: string, targetFolderId: string | null, isFolder: boolean) => void;
  makeCopy: (fileId: string) => void;
  trashItems: (ids: string[], isFolder: boolean) => void;
  restoreItems: (ids: string[], isFolder: boolean) => void;
  permanentDeleteItems: (ids: string[], isFolder: boolean) => void;
  pinToQuickAccess: (itemId: string, type: 'file' | 'folder') => void;
  unpinFromQuickAccess: (itemId: string) => void;
  reorderQuickAccess: (orderedItemIds: string[]) => void;
  isItemPinned: (itemId: string) => boolean;
  
  // Filtered queries
  displayedFiles: FileItem[];
  displayedFolders: FolderItem[];
}

const SpaceContext = createContext<SpaceContextType | undefined>(undefined);

// Initial starter folders to provide an immediate clean experience
const DEFAULT_FOLDERS: FolderItem[] = [
  { id: 'folder-college', name: 'College', parentId: null, color: '#38bdf8', isTrashed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'folder-projects', name: 'Projects', parentId: null, color: '#16A085', isTrashed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'folder-personal', name: 'Personal', parentId: null, color: '#f59e0b', isTrashed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'folder-work', name: 'Work', parentId: null, color: '#8b5cf6', isTrashed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'folder-math', name: 'Mathematics', parentId: 'folder-college', color: '#38bdf8', isTrashed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const DEFAULT_FILES: FileItem[] = [
  {
    id: 'file-math-notes',
    name: 'Mathematics Notes',
    extension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    category: 'docs',
    sizeBytes: 1024 * 45, // 45 KB
    folderId: 'folder-math',
    isTrashed: false,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 60000 * 10).toISOString(),
    lastAccessedAt: new Date(Date.now() - 60000 * 10).toISOString(),
    content: '# Calculus & Linear Algebra\n\n- Differential Equations\n- Eigenvectors & Matrix transformations\n- Prepared for upcoming exams'
  },
  {
    id: 'file-monthly-budget',
    name: 'Monthly Budget & Expenses',
    extension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    category: 'sheets',
    sizeBytes: 1024 * 18, // 18 KB
    folderId: 'folder-personal',
    isTrashed: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    lastAccessedAt: new Date(Date.now() - 86400000).toISOString(),
    content: 'Category,Budget,Actual,Remaining\nHousing,1200,1200,0\nFood,400,340,60\nTech & Cloud,50,42,8'
  },
  {
    id: 'file-business-plan',
    name: 'Business Strategy Deck',
    extension: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    category: 'slides',
    sizeBytes: 1024 * 380, // 380 KB
    folderId: 'folder-projects',
    isTrashed: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastAccessedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    content: 'Slide 1: OMNI Workspace Overview\nSlide 2: Market Analysis & Unit Economics\nSlide 3: Growth Roadmap 2027'
  },
  {
    id: 'file-syllabus-pdf',
    name: 'Semester Syllabus',
    extension: 'pdf',
    mimeType: 'application/pdf',
    category: 'other',
    sizeBytes: 1024 * 1024 * 2.4, // 2.4 MB
    folderId: 'folder-college',
    isTrashed: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    lastAccessedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

const DEFAULT_QUICK_ACCESS: QuickAccessItem[] = [
  { id: 'qa-1', itemType: 'folder', itemId: 'folder-college', sortOrder: 0, pinnedAt: new Date().toISOString() },
  { id: 'qa-2', itemType: 'folder', itemId: 'folder-projects', sortOrder: 1, pinnedAt: new Date().toISOString() },
  { id: 'qa-3', itemType: 'file', itemId: 'file-math-notes', sortOrder: 2, pinnedAt: new Date().toISOString() },
  { id: 'qa-4', itemType: 'file', itemId: 'file-monthly-budget', sortOrder: 3, pinnedAt: new Date().toISOString() }
];

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  { id: 'act-1', action: 'created', targetName: 'Mathematics Notes.docx', targetType: 'file', details: 'Created in College / Mathematics', timestamp: new Date(Date.now() - 60000 * 10).toISOString() },
  { id: 'act-2', action: 'uploaded', targetName: 'Semester Syllabus.pdf', targetType: 'file', details: 'Uploaded to College', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'act-3', action: 'created', targetName: 'Projects', targetType: 'folder', details: 'New directory created', timestamp: new Date(Date.now() - 86400000).toISOString() },
];

export const SpaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const [currentSection, setCurrentSectionState] = useState<SpaceSection>(() => {
    return (localStorage.getItem('omni_space_section') as SpaceSection) || 'home';
  });

  const setCurrentSection = useCallback((section: SpaceSection) => {
    setCurrentSectionState(section);
    localStorage.setItem('omni_space_section', section);
    // When switching top-level section, reset folder navigation if not my-files
    if (section !== 'my-files') {
      setCurrentFolderIdState(null);
    }
  }, []);

  const [currentFolderId, setCurrentFolderIdState] = useState<string | null>(null);
  const setCurrentFolderId = useCallback((folderId: string | null) => {
    setCurrentFolderIdState(folderId);
  }, []);

  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('omni_space_view_mode') as 'grid' | 'list') || 'grid';
  });

  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    setViewModeState(mode);
    localStorage.setItem('omni_space_view_mode', mode);
  }, []);

  const [sortBy, setSortBy] = useState<'name' | 'updatedAt' | 'size' | 'type'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const openFileInEditMode = useCallback((file: FileItem) => {
    setPreviewFile(file);
    setIsEditMode(true);
  }, []);

  // Persistence for files and folders
  const [folders, setFolders] = useState<FolderItem[]>(() => {
    const saved = localStorage.getItem('omni_space_folders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_FOLDERS;
  });

  const [files, setFiles] = useState<FileItem[]>(() => {
    const saved = localStorage.getItem('omni_space_files');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_FILES;
  });

  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>(() => {
    const saved = localStorage.getItem('omni_space_quick_access');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_QUICK_ACCESS;
  });

  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    const saved = localStorage.getItem('omni_space_activities');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_ACTIVITIES;
  });

  // Sync from Supabase when user logs in
  useEffect(() => {
    if (!user) return;

    const fetchSupabaseSpaceData = async () => {
      try {
        // Fetch folders
        const { data: dbFolders, error: foldersErr } = await supabase
          .from('folders')
          .select('*')
          .eq('user_id', user.id);

        if (!foldersErr && dbFolders && dbFolders.length > 0) {
          const mappedFolders: FolderItem[] = dbFolders.map(f => ({
            id: f.id,
            name: f.name,
            parentId: f.parent_id,
            color: f.color,
            isTrashed: f.is_trashed,
            trashedAt: f.trashed_at,
            createdAt: f.created_at,
            updatedAt: f.updated_at
          }));
          setFolders(mappedFolders);
        }

        // Fetch files
        const { data: dbFiles, error: filesErr } = await supabase
          .from('files')
          .select('*')
          .eq('user_id', user.id);

        if (!filesErr && dbFiles && dbFiles.length > 0) {
          const mappedFiles: FileItem[] = dbFiles.map(f => ({
            id: f.id,
            name: f.name,
            extension: f.extension,
            mimeType: f.mime_type,
            category: f.category,
            sizeBytes: Number(f.size_bytes) || 0,
            folderId: f.folder_id,
            isTrashed: f.is_trashed,
            trashedAt: f.trashed_at,
            createdAt: f.created_at,
            updatedAt: f.updated_at,
            lastAccessedAt: f.last_accessed_at,
            content: f.content || '',
            r2StorageKey: f.r2_storage_key
          }));
          setFiles(mappedFiles);
        }

        // Fetch Quick Access
        const { data: dbQA, error: qaErr } = await supabase
          .from('quick_access_items')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true });

        if (!qaErr && dbQA && dbQA.length > 0) {
          const mappedQA: QuickAccessItem[] = dbQA.map(q => ({
            id: q.id,
            itemType: q.item_type,
            itemId: q.item_id,
            sortOrder: q.sort_order,
            pinnedAt: q.pinned_at
          }));
          setQuickAccess(mappedQA);
        }
      } catch (err) {
        console.error('Error fetching Supabase space data:', err);
      }
    };

    fetchSupabaseSpaceData();
  }, [user]);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('omni_space_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('omni_space_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('omni_space_quick_access', JSON.stringify(quickAccess));
  }, [quickAccess]);

  useEffect(() => {
    localStorage.setItem('omni_space_activities', JSON.stringify(activities));
  }, [activities]);

  const addActivity = useCallback((action: ActivityItem['action'], targetName: string, targetType: 'file' | 'folder', details?: string) => {
    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      action,
      targetName,
      targetType,
      details,
      timestamp: new Date().toISOString()
    };
    setActivities(prev => [newAct, ...prev.slice(0, 49)]); // keep latest 50
  }, []);

  // Multi-select helpers
  const toggleSelectId = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Compute storage quota dynamically
  const quota = useMemo<StorageQuota>(() => {
    const totalBytes = 2 * 1024 * 1024 * 1024; // 2 GB Free quota
    let docsBytes = 0;
    let sheetsBytes = 0;
    let slidesBytes = 0;
    let otherBytes = 0;

    files.filter(f => !f.isTrashed).forEach(file => {
      if (file.category === 'docs') docsBytes += file.sizeBytes;
      else if (file.category === 'sheets') sheetsBytes += file.sizeBytes;
      else if (file.category === 'slides') slidesBytes += file.sizeBytes;
      else otherBytes += file.sizeBytes;
    });

    const usedBytes = docsBytes + sheetsBytes + slidesBytes + otherBytes;

    return {
      planTier: 'free',
      quotaBytes: totalBytes,
      usedBytes,
      docsBytes,
      sheetsBytes,
      slidesBytes,
      otherBytes
    };
  }, [files]);

  // Breadcrumbs calculation
  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const crumbs: BreadcrumbItem[] = [{ id: null, name: 'My Files' }];
    if (!currentFolderId) return crumbs;

    const path: FolderItem[] = [];
    let curr = folders.find(f => f.id === currentFolderId);
    while (curr) {
      path.unshift(curr);
      curr = folders.find(f => f.id === curr?.parentId);
    }

    path.forEach(f => crumbs.push({ id: f.id, name: f.name }));
    return crumbs;
  }, [currentFolderId, folders]);

  // Handlers for File & Folder Operations
  const createFolder = useCallback((name: string, parentId?: string | null) => {
    const targetParent = parentId !== undefined ? parentId : currentFolderId;
    const newFolder: FolderItem = {
      id: `folder-${Date.now()}`,
      name: name.trim() || 'Untitled Folder',
      parentId: targetParent,
      color: '#16A085',
      isTrashed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setFolders(prev => [newFolder, ...prev]);
    addActivity('created', newFolder.name, 'folder', `Created in ${targetParent ? 'folder' : 'root'}`);

    if (user) {
      supabase.from('folders').insert({
        id: newFolder.id,
        user_id: user.id,
        parent_id: targetParent,
        name: newFolder.name,
        color: newFolder.color,
        is_trashed: false
      }).then(({ error }) => {
        if (error) console.error('Error saving folder to Supabase:', error);
      });
    }
  }, [currentFolderId, user, addActivity]);

  const createDocument = useCallback((name: string, category: 'docs' | 'sheets' | 'slides') => {
    const ext = category === 'docs' ? 'docx' : category === 'sheets' ? 'xlsx' : 'pptx';
    const mime = category === 'docs' 
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : category === 'sheets'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    const newFile: FileItem = {
      id: `file-${Date.now()}`,
      name: name.trim() || (category === 'docs' ? 'Untitled Document' : category === 'sheets' ? 'Untitled Spreadsheet' : 'Untitled Presentation'),
      extension: ext,
      mimeType: mime,
      category,
      sizeBytes: 1024 * 24, // 24 KB base
      folderId: currentFolderId,
      isTrashed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      content: `# ${name}\n\nStart typing your content here...`
    };

    setFiles(prev => [newFile, ...prev]);
    addActivity('created', `${newFile.name}.${newFile.extension}`, 'file', `Created in ${category}`);

    if (user) {
      supabase.from('files').insert({
        id: newFile.id,
        user_id: user.id,
        folder_id: currentFolderId,
        name: newFile.name,
        extension: newFile.extension,
        mime_type: newFile.mimeType,
        category: newFile.category,
        size_bytes: newFile.sizeBytes,
        content: newFile.content,
        is_trashed: false
      }).then(({ error }) => {
        if (error) console.error('Error saving file to Supabase:', error);
      });
    }

    return newFile;
  }, [currentFolderId, user, addActivity]);

  const uploadFiles = useCallback(async (uploadedFiles: FileList | File[], targetFolderId?: string | null) => {
    const folder = targetFolderId !== undefined ? targetFolderId : currentFolderId;
    const newFiles: FileItem[] = [];

    const fileListArray = Array.from(uploadedFiles);

    for (let idx = 0; idx < fileListArray.length; idx++) {
      const f = fileListArray[idx];
      const ext = f.name.split('.').pop()?.toLowerCase() || 'bin';
      let category: FileCategory = 'other';
      if (['docx', 'doc'].includes(ext)) category = 'docs';
      else if (['xlsx', 'xls', 'csv'].includes(ext)) category = 'sheets';
      else if (['pptx', 'ppt'].includes(ext)) category = 'slides';

      let storageKey: string | undefined = undefined;

      // Upload directly to Supabase private storage if user is signed in
      if (user) {
        const cleanName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${user.id}/${Date.now()}_${cleanName}`;
        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('omni-files')
            .upload(path, f, {
              cacheControl: '3600',
              upsert: false
            });

          if (!uploadErr && uploadData) {
            storageKey = uploadData.path;
          } else if (uploadErr) {
            console.error('Error uploading binary to Supabase Storage:', uploadErr);
          }
        } catch (e) {
          console.error('Storage upload exception:', e);
        }
      }

      const fileItem: FileItem = {
        id: `file-up-${Date.now()}-${idx}`,
        name: f.name.replace(/\.[^/.]+$/, ''),
        extension: ext,
        mimeType: f.type || 'application/octet-stream',
        category,
        sizeBytes: f.size || 1024 * 15,
        folderId: folder,
        isTrashed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        content: `Uploaded file preview for ${f.name}`,
        r2StorageKey: storageKey
      };
      newFiles.push(fileItem);
      addActivity('uploaded', f.name, 'file', `Uploaded to ${folder ? 'folder' : 'My Files'}`);
    }

    setFiles(prev => [...newFiles, ...prev]);

    if (user && newFiles.length > 0) {
      supabase.from('files').insert(newFiles.map(nf => ({
        id: nf.id,
        user_id: user.id,
        folder_id: folder,
        name: nf.name,
        extension: nf.extension,
        mime_type: nf.mimeType,
        category: nf.category,
        size_bytes: nf.sizeBytes,
        r2_storage_key: nf.r2StorageKey,
        content: nf.content,
        is_trashed: false
      }))).then(({ error }) => {
        if (error) console.error('Error saving uploaded files to Supabase:', error);
      });
    }
  }, [currentFolderId, user, addActivity]);

  const downloadFile = useCallback(async (file: FileItem) => {
    try {
      if (file.r2StorageKey) {
        // Download real binary from Supabase Storage private bucket
        const { data, error } = await supabase.storage
          .from('omni-files')
          .download(file.r2StorageKey);

        if (!error && data) {
          const url = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${file.name}.${file.extension}`;
          a.click();
          URL.revokeObjectURL(url);
          return;
        }
      }

      // Fallback for text / notes / local drafts
      const blob = new Blob([file.content || `Content of ${file.name}`], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name}.${file.extension}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  }, []);

  const renameItem = useCallback((id: string, newName: string, isFolder: boolean) => {
    if (!newName.trim()) return;
    const now = new Date().toISOString();
    if (isFolder) {
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim(), updatedAt: now } : f));
      addActivity('renamed', newName, 'folder');
      if (user) {
        supabase.from('folders').update({ name: newName.trim(), updated_at: now }).eq('id', id).eq('user_id', user.id).then();
      }
    } else {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim(), updatedAt: now } : f));
      addActivity('renamed', newName, 'file');
      if (user) {
        supabase.from('files').update({ name: newName.trim(), updated_at: now }).eq('id', id).eq('user_id', user.id).then();
      }
    }
  }, [user, addActivity]);

  const moveItem = useCallback((id: string, targetFolderId: string | null, isFolder: boolean) => {
    const now = new Date().toISOString();
    if (isFolder) {
      if (id === targetFolderId) return;
      setFolders(prev => prev.map(f => f.id === id ? { ...f, parentId: targetFolderId, updatedAt: now } : f));
      addActivity('moved', 'Folder', 'folder', `Moved to new destination`);
      if (user) {
        supabase.from('folders').update({ parent_id: targetFolderId, updated_at: now }).eq('id', id).eq('user_id', user.id).then();
      }
    } else {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, folderId: targetFolderId, updatedAt: now } : f));
      addActivity('moved', 'File', 'file', `Moved to new destination`);
      if (user) {
        supabase.from('files').update({ folder_id: targetFolderId, updated_at: now }).eq('id', id).eq('user_id', user.id).then();
      }
    }
  }, [user, addActivity]);

  const updateFileContent = useCallback((fileId: string, content: string, newName?: string) => {
    const now = new Date().toISOString();
    setFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        return {
          ...f,
          content,
          name: newName ? newName.trim() : f.name,
          updatedAt: now,
          lastAccessedAt: now
        };
      }
      return f;
    }));

    if (previewFile && previewFile.id === fileId) {
      setPreviewFile(prev => prev ? {
        ...prev,
        content,
        name: newName ? newName.trim() : prev.name,
        updatedAt: now
      } : null);
    }

    addActivity('edited', newName || 'Document', 'file', 'File content saved');

    if (user) {
      const updatePayload: Record<string, any> = {
        content,
        updated_at: now
      };
      if (newName && newName.trim()) {
        updatePayload.name = newName.trim();
      }
      supabase.from('files')
        .update(updatePayload)
        .eq('id', fileId)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Error saving file update:', error);
        });
    }
  }, [user, previewFile, addActivity]);

  const makeCopy = useCallback((fileId: string) => {
    const original = files.find(f => f.id === fileId);
    if (!original) return;
    const now = new Date().toISOString();
    const copy: FileItem = {
      ...original,
      id: `file-copy-${Date.now()}`,
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now
    };
    setFiles(prev => [copy, ...prev]);
    addActivity('copied', copy.name, 'file');

    if (user) {
      supabase.from('files').insert({
        id: copy.id,
        user_id: user.id,
        folder_id: copy.folderId,
        name: copy.name,
        extension: copy.extension,
        mime_type: copy.mimeType,
        category: copy.category,
        size_bytes: copy.sizeBytes,
        content: copy.content,
        is_trashed: false
      }).then();
    }
  }, [files, user, addActivity]);

  const trashItems = useCallback((ids: string[], isFolder: boolean) => {
    const now = new Date().toISOString();
    if (isFolder) {
      setFolders(prev => prev.map(f => ids.includes(f.id) ? { ...f, isTrashed: true, trashedAt: now } : f));
      if (user) {
        supabase.from('folders').update({ is_trashed: true, trashed_at: now }).in('id', ids).eq('user_id', user.id).then();
      }
    } else {
      setFiles(prev => prev.map(f => ids.includes(f.id) ? { ...f, isTrashed: true, trashedAt: now } : f));
      if (user) {
        supabase.from('files').update({ is_trashed: true, trashed_at: now }).in('id', ids).eq('user_id', user.id).then();
      }
    }
    setQuickAccess(prev => prev.filter(q => !ids.includes(q.itemId)));
    clearSelection();
    addActivity('trashed', `${ids.length} item(s)`, isFolder ? 'folder' : 'file', 'Moved to Trash (30 days retention)');

    if (user) {
      supabase.from('quick_access_items').delete().in('item_id', ids).eq('user_id', user.id).then();
    }
  }, [user, clearSelection, addActivity]);

  const restoreItems = useCallback((ids: string[], isFolder: boolean) => {
    if (isFolder) {
      setFolders(prev => prev.map(f => {
        if (ids.includes(f.id)) {
          const parentExists = f.parentId && prev.some(p => p.id === f.parentId && !p.isTrashed);
          return { ...f, isTrashed: false, trashedAt: undefined, parentId: parentExists ? f.parentId : null };
        }
        return f;
      }));
      if (user) {
        supabase.from('folders').update({ is_trashed: false, trashed_at: null }).in('id', ids).eq('user_id', user.id).then();
      }
    } else {
      setFiles(prev => prev.map(f => {
        if (ids.includes(f.id)) {
          const parentExists = f.folderId && folders.some(folder => folder.id === f.folderId && !folder.isTrashed);
          return { ...f, isTrashed: false, trashedAt: undefined, folderId: parentExists ? f.folderId : null };
        }
        return f;
      }));
      if (user) {
        supabase.from('files').update({ is_trashed: false, trashed_at: null }).in('id', ids).eq('user_id', user.id).then();
      }
    }
    clearSelection();
    addActivity('restored', `${ids.length} item(s)`, isFolder ? 'folder' : 'file', 'Restored to original location');
  }, [folders, user, clearSelection, addActivity]);

  const permanentDeleteItems = useCallback((ids: string[], isFolder: boolean) => {
    if (isFolder) {
      setFolders(prev => prev.filter(f => !ids.includes(f.id)));
      if (user) {
        supabase.from('folders').delete().in('id', ids).eq('user_id', user.id).then();
      }
    } else {
      setFiles(prev => prev.filter(f => !ids.includes(f.id)));
      if (user) {
        supabase.from('files').delete().in('id', ids).eq('user_id', user.id).then();
      }
    }
    setQuickAccess(prev => prev.filter(q => !ids.includes(q.itemId)));
    clearSelection();
    addActivity('deleted', `${ids.length} item(s)`, isFolder ? 'folder' : 'file', 'Permanently deleted');

    if (user) {
      supabase.from('quick_access_items').delete().in('item_id', ids).eq('user_id', user.id).then();
    }
  }, [user, clearSelection, addActivity]);

  // Quick Access management
  const pinToQuickAccess = useCallback((itemId: string, type: 'file' | 'folder') => {
    setQuickAccess(prev => {
      if (prev.some(q => q.itemId === itemId)) return prev;
      const newItem: QuickAccessItem = {
        id: `qa-${Date.now()}`,
        itemType: type,
        itemId,
        sortOrder: prev.length,
        pinnedAt: new Date().toISOString()
      };

      if (user) {
        supabase.from('quick_access_items').insert({
          id: newItem.id,
          user_id: user.id,
          item_type: type,
          item_id: itemId,
          sort_order: newItem.sortOrder
        }).then();
      }

      return [...prev, newItem];
    });
  }, [user]);

  const unpinFromQuickAccess = useCallback((itemId: string) => {
    setQuickAccess(prev => prev.filter(q => q.itemId !== itemId));
    if (user) {
      supabase.from('quick_access_items').delete().eq('item_id', itemId).eq('user_id', user.id).then();
    }
  }, [user]);

  const reorderQuickAccess = useCallback((orderedItemIds: string[]) => {
    setQuickAccess(prev => {
      const map = new Map(prev.map(i => [i.itemId, i]));
      const updated = orderedItemIds.map((id, index) => {
        const item = map.get(id);
        return item ? { ...item, sortOrder: index } : null;
      }).filter(Boolean) as QuickAccessItem[];

      if (user) {
        updated.forEach(item => {
          supabase.from('quick_access_items').update({ sort_order: item.sortOrder }).eq('id', item.id).eq('user_id', user.id).then();
        });
      }

      return updated;
    });
  }, [user]);

  const isItemPinned = useCallback((itemId: string) => {
    return quickAccess.some(q => q.itemId === itemId);
  }, [quickAccess]);

  // Filter and sort items for the active view
  const displayedFolders = useMemo(() => {
    if (currentSection === 'trash') {
      return folders.filter(f => f.isTrashed);
    }
    if (currentSection !== 'my-files') {
      return []; // Docs, Sheets, Slides, Recent, Home show files primarily
    }
    // In My Files: show untrashed folders matching the current folder level
    let filtered = folders.filter(f => !f.isTrashed && f.parentId === currentFolderId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = folders.filter(f => !f.isTrashed && f.name.toLowerCase().includes(q));
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [folders, currentSection, currentFolderId, searchQuery]);

  const displayedFiles = useMemo(() => {
    let result: FileItem[] = [];

    if (currentSection === 'trash') {
      result = files.filter(f => f.isTrashed);
    } else {
      // Untrashed files
      const activeFiles = files.filter(f => !f.isTrashed);

      if (currentSection === 'docs') {
        result = activeFiles.filter(f => f.category === 'docs');
      } else if (currentSection === 'sheets') {
        result = activeFiles.filter(f => f.category === 'sheets');
      } else if (currentSection === 'slides') {
        result = activeFiles.filter(f => f.category === 'slides');
      } else if (currentSection === 'recent') {
        result = [...activeFiles].sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()).slice(0, 30);
      } else if (currentSection === 'my-files') {
        if (searchQuery.trim()) {
          // Search matches across all folders
          const q = searchQuery.toLowerCase();
          result = activeFiles.filter(f => f.name.toLowerCase().includes(q) || f.extension.toLowerCase().includes(q));
        } else {
          result = activeFiles.filter(f => f.folderId === currentFolderId);
        }
      } else if (currentSection === 'home') {
        result = activeFiles;
      }
    }

    if (searchQuery.trim() && currentSection !== 'my-files') {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q) || f.extension.toLowerCase().includes(q));
    }

    // Apply sorting
    return result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'updatedAt') cmp = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      else if (sortBy === 'size') cmp = b.sizeBytes - a.sizeBytes;
      else if (sortBy === 'type') cmp = a.extension.localeCompare(b.extension);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [files, currentSection, currentFolderId, searchQuery, sortBy, sortOrder]);

  return (
    <SpaceContext.Provider
      value={{
        currentSection,
        setCurrentSection,
        currentFolderId,
        setCurrentFolderId,
        breadcrumbs,
        viewMode,
        setViewMode,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        searchQuery,
        setSearchQuery,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        selectedIds,
        setSelectedIds,
        toggleSelectId,
        clearSelection,
        files,
        folders,
        quickAccess,
        quota,
        activities,
        previewFile,
        setPreviewFile,
        isEditMode,
        setIsEditMode,
        openFileInEditMode,
        updateFileContent,
        createFolder,
        createDocument,
        uploadFiles,
        downloadFile,
        renameItem,
        moveItem,
        makeCopy,
        trashItems,
        restoreItems,
        permanentDeleteItems,
        pinToQuickAccess,
        unpinFromQuickAccess,
        reorderQuickAccess,
        isItemPinned,
        displayedFiles,
        displayedFolders
      }}
    >
      {children}
    </SpaceContext.Provider>
  );
};

export const useSpace = () => {
  const context = useContext(SpaceContext);
  if (!context) throw new Error('useSpace must be used within a SpaceProvider');
  return context;
};
