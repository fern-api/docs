import React, { useState } from 'react';

export interface FolderProps {
  name: string;
  defaultOpen?: boolean;
  href?: string;
  highlighted?: boolean;
  comment?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Folder: React.FC<FolderProps> = ({ 
  name, 
  defaultOpen = false, 
  href, 
  highlighted = false, 
  comment, 
  children, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const baseClasses = "grid items-center gap-2 py-1 px-2 rounded transition-colors";
  const highlightedClasses = highlighted ? "files-row-highlighted" : "";
  const gridClasses = "grid-cols-[24px_24px_1fr_auto]";
  const combinedClasses = `${baseClasses} ${gridClasses} ${highlightedClasses}`.trim();

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const formattedComment = comment ? (comment.startsWith('#') ? comment : `# ${comment}`) : null;

  const folderIcon = isOpen ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder-open flex-shrink-0 text-(color::--grayscale-a11)">
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder flex-shrink-0 text-(color::--grayscale-a11)">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
    </svg>
  );

  const caretIcon = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={`lucide lucide-chevron-right flex-shrink-0 text-(color::--grayscale-a11) transition-transform ${isOpen ? 'rotate-90' : ''}`}
      style={{ transition: 'transform 0.2s' }}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );

  const content = (
    <>
      {caretIcon}
      {folderIcon}
      <span className="text-default text-sm font-mono">{name}</span>
      {formattedComment && (
        <span 
          className="files-row-comment text-xs font-mono whitespace-nowrap overflow-hidden text-ellipsis" 
          title={formattedComment}
        >
          {formattedComment}
        </span>
      )}
    </>
  );

  const header = href ? (
    <a 
      href={href} 
      className={`${combinedClasses} hover:underline cursor-pointer no-underline`}
    >
      {content}
    </a>
  ) : (
    <button
      onClick={handleToggle}
      className={`${combinedClasses} w-full text-left cursor-pointer border-0 bg-transparent`}
      aria-expanded={isOpen}
      type="button"
    >
      {content}
    </button>
  );

  return (
    <div className={className}>
      {header}
      {isOpen && children && (
        <div className="pl-6 space-y-0.5 mt-0.5">
          {children}
        </div>
      )}
    </div>
  );
};
