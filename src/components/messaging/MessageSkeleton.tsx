'use client';

interface MessageSkeletonProps {
  showAvatar?: boolean;
}

export default function MessageSkeleton({ showAvatar = true }: MessageSkeletonProps) {
  return (
    <div className="flex gap-3 py-2 px-2 animate-pulse">
      {/* Avatar Skeleton */}
      <div className="flex-shrink-0">
        {showAvatar ? (
          <div className="w-10 h-10 bg-slate-600 rounded-full"></div>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center">
            <div className="w-8 h-3 bg-slate-600 rounded"></div>
          </div>
        )}
      </div>

      {/* Message Content Skeleton */}
      <div className="flex-1 min-w-0">
        {/* Header - only show when avatar is shown */}
        {showAvatar && (
          <div className="flex items-center gap-2 mb-1">
            <div className="h-4 bg-slate-600 rounded w-20"></div>
            <div className="h-3 bg-slate-700 rounded w-12"></div>
          </div>
        )}

        {/* Message Bubble Skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-slate-600 rounded w-3/4"></div>
          {Math.random() > 0.5 && (
            <div className="h-4 bg-slate-600 rounded w-1/2"></div>
          )}
        </div>
      </div>
    </div>
  );
}

// Multiple skeleton messages component
interface MessageSkeletonListProps {
  count?: number;
}

export function MessageSkeletonList({ count = 5 }: MessageSkeletonListProps) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }, (_, index) => {
        // Randomly decide if this message should show avatar (simulating message grouping)
        const showAvatar = index === 0 || Math.random() > 0.6;
        
        return (
          <MessageSkeleton 
            key={index} 
            showAvatar={showAvatar}
          />
        );
      })}
    </div>
  );
}
