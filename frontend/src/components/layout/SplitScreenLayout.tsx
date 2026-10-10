import React, { type ReactNode } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface SplitScreenLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export const SplitScreenLayout: React.FC<SplitScreenLayoutProps> = ({ left, right }) => {
  return (
    <div className="flex flex-col tablet:flex-row h-full">
      {/* Left: Chat — its own boundary so a chat crash can't take down the feed pane */}
      <div className="w-full tablet:w-1/2 border-r border-border flex flex-col">
        <ErrorBoundary>{left}</ErrorBoundary>
      </div>

      {/* Right: role content — its own boundary so a feed crash can't take down chat.
          overflow-y-auto because feeds/forms here don't manage their own scroll
          (unlike ChatContainer on the left, which does). */}
      <div className="w-full tablet:w-1/2 flex flex-col overflow-y-auto">
        <ErrorBoundary>{right}</ErrorBoundary>
      </div>
    </div>
  );
};
