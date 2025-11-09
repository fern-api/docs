import React from 'react';

export interface FilesProps {
  children: React.ReactNode;
  className?: string;
}

export const Files: React.FC<FilesProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      {children}
    </div>
  );
};
