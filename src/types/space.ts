export type FileCategory = 'docs' | 'sheets' | 'slides' | 'other';

export type SpaceSection = 'home' | 'docs' | 'sheets' | 'slides' | 'my-files' | 'recent' | 'trash' | 'settings';

export interface FileItem {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  category: FileCategory;
  sizeBytes: number;
  folderId: string | null;
  isTrashed: boolean;
  trashedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  content?: string;
  r2StorageKey?: string;
  isQuickAccess?: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  color?: string;
  isTrashed: boolean;
  trashedAt?: string;
  createdAt: string;
  updatedAt: string;
  isQuickAccess?: boolean;
}

export interface QuickAccessItem {
  id: string;
  itemType: 'file' | 'folder';
  itemId: string;
  sortOrder: number;
  pinnedAt: string;
}

export interface StorageQuota {
  planTier: 'free' | 'plus' | 'pro' | 'max';
  quotaBytes: number;
  usedBytes: number;
  docsBytes: number;
  sheetsBytes: number;
  slidesBytes: number;
  otherBytes: number;
}

export type ActivityAction = 'uploaded' | 'created' | 'renamed' | 'moved' | 'copied' | 'trashed' | 'restored' | 'deleted' | 'edited';

export interface ActivityItem {
  id: string;
  action: ActivityAction;
  targetName: string;
  targetType: 'file' | 'folder';
  details?: string;
  timestamp: string;
}
