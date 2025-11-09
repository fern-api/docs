import React from 'react';

export interface FileProps {
  name: string;
  href?: string;
  highlighted?: boolean;
  comment?: string;
  className?: string;
}

export const File: React.FC<FileProps> = ({ 
  name, 
  href, 
  highlighted = false, 
  comment, 
  className = '' 
}) => {
  const baseClasses = "grid items-center gap-2 py-1 px-2 rounded transition-colors";
  const gridClasses = "grid-cols-[24px_24px_1fr_auto]";
  const combinedClasses = `${baseClasses} ${gridClasses} ${className}`.trim();

  const highlightStyle = highlighted ? { backgroundColor: 'rgba(255, 235, 59, 0.15)' } : {};
  const formattedComment = comment ? (comment.startsWith('#') ? comment : `# ${comment}`) : null;

  const content = (
    <>
      {/* Empty spacer for chevron column */}
      <div className="w-6" />
      
      {/* File icon */}
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file flex-shrink-0 text-(color::--grayscale-a11)">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
        <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      </svg>
      
      {/* File name */}
      <span className="text-default text-sm font-mono">{name}</span>
      
      {/* Comment */}
      {formattedComment && (
        <span 
          className="text-xs font-mono whitespace-nowrap overflow-hidden text-ellipsis" 
          style={{ color: '#6b7280', opacity: 0.8 }}
          title={formattedComment}
        >
          {formattedComment}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a 
        href={href} 
        className={`${combinedClasses} hover:underline cursor-pointer no-underline`}
        style={highlightStyle}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={combinedClasses} style={highlightStyle}>
      {content}
    </div>
  );
};
