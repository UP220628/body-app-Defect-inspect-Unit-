import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableHeaderProps {
  children: React.ReactNode;
}

interface TableBodyProps {
  children: React.ReactNode;
}

interface TableRowProps {
  children: React.ReactNode;
  onClick?: () => void;
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => (
  <div className={`overflow-x-auto rounded-lg border border-gray-200 ${className}`}>
    <table className="w-full">
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<TableHeaderProps> = ({ children }) => (
  <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>
);

export const TableBody: React.FC<TableBodyProps> = ({ children }) => (
  <tbody className="divide-y divide-gray-200">{children}</tbody>
);

export const TableRow: React.FC<TableRowProps> = ({ children, onClick }) => (
  <tr
    onClick={onClick}
    className={`${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
  >
    {children}
  </tr>
);

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className = '',
  align = 'left',
}) => {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return (
    <td className={`px-6 py-4 text-sm text-gray-900 ${alignClass} ${className}`}>{children}</td>
  );
};

export const TableHeadCell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <th className={`px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${className}`}>
    {children}
  </th>
);
