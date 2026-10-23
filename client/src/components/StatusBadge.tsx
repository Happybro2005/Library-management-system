import React from 'react';

interface StatusBadgeProps {
  status: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED' | 'COMPATIBLE' | 'INCOMPATIBLE' | 'EMPTY' | 'UNKNOWN' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  let bgColor = 'bg-zinc-900 text-zinc-300 border-zinc-800';
  let dotColor = 'bg-zinc-400';
  let label = status;

  switch (status) {
    case 'CONNECTED':
      bgColor = 'bg-zinc-900 text-white border-zinc-700 shadow-xs';
      dotColor = 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]';
      label = 'Connected';
      break;
    case 'DISCONNECTED':
      bgColor = 'bg-black text-zinc-400 border-zinc-800';
      dotColor = 'bg-zinc-600';
      label = 'Disconnected';
      break;
    case 'NOT_CONFIGURED':
      bgColor = 'bg-zinc-900 text-zinc-300 border-zinc-750';
      dotColor = 'bg-zinc-400';
      label = 'Not Configured';
      break;
    case 'COMPATIBLE':
      bgColor = 'bg-zinc-900 text-zinc-200 border-zinc-700';
      dotColor = 'bg-zinc-300';
      label = 'LMS Compatible';
      break;
    case 'EMPTY':
      bgColor = 'bg-zinc-950 text-zinc-400 border-zinc-800';
      dotColor = 'bg-zinc-500';
      label = 'Empty Database';
      break;
    case 'INCOMPATIBLE':
      bgColor = 'bg-black text-zinc-300 border-zinc-800';
      dotColor = 'bg-zinc-500';
      label = 'Incompatible Schema';
      break;
    case 'ACTIVE':
      bgColor = 'bg-zinc-900 text-white border-zinc-700 shadow-xs';
      dotColor = 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]';
      label = 'Active';
      break;
    case 'INACTIVE':
      bgColor = 'bg-zinc-950 text-zinc-500 border-zinc-800';
      dotColor = 'bg-zinc-600';
      label = 'Inactive';
      break;
    case 'BLOCKED':
      bgColor = 'bg-black text-zinc-400 border-zinc-800';
      dotColor = 'bg-zinc-600';
      label = 'Blocked';
      break;
    default:
      bgColor = 'bg-zinc-900 text-zinc-300 border-zinc-800';
      dotColor = 'bg-zinc-400';
  }

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 space-x-1.5',
    md: 'text-xs px-3 py-1 space-x-2',
    lg: 'text-sm px-4 py-1.5 space-x-2.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full ${bgColor} ${sizeClasses[size]}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0 animate-pulse`} />
      )}
      <span>{label}</span>
    </span>
  );
};
