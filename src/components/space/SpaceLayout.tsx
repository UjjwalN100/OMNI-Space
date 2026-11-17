import React from 'react';
import { useSpace } from '../../context/SpaceContext';
import { SpaceSidebar } from './SpaceSidebar';
import { SpaceTopBar } from './SpaceTopBar';
import { HomeDashboard } from './HomeDashboard';
import { FileExplorerView } from './FileExplorerView';
import { TrashView } from './TrashView';
import { SpaceSettingsView } from './SpaceSettingsView';
import { FilePreviewModal } from './FilePreviewModal';

export const SpaceLayout: React.FC = () => {
  const { currentSection } = useSpace();

  return (
    <div className="flex-1 flex overflow-hidden relative bg-[var(--canvas-bg)] text-[var(--text-main)] transition-colors">
      {/* Space Sidebar (Collapsible: Expanded vs Icon Rail) */}
      <SpaceSidebar />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
        <SpaceTopBar />
        
        {currentSection === 'home' && <HomeDashboard />}
        {currentSection === 'trash' && <TrashView />}
        {currentSection === 'settings' && <SpaceSettingsView />}
        {['docs', 'sheets', 'slides', 'my-files', 'recent'].includes(currentSection) && <FileExplorerView />}
      </div>

      {/* Preview & Editor Modal */}
      <FilePreviewModal />
    </div>
  );
};
