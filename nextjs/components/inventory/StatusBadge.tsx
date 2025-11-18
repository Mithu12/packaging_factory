'use client';

interface StatusBadgeProps {
  status: string;
  type?: 'default' | 'product';
}

export default function StatusBadge({ status, type = 'default' }: StatusBadgeProps) {
  const getStatusColor = () => {
    if (type === 'product') {
      switch (status) {
        case 'active':
          return 'bg-green-100 text-green-800';
        case 'inactive':
          return 'bg-gray-100 text-gray-800';
        case 'out_of_stock':
          return 'bg-red-100 text-red-800';
        case 'discontinued':
          return 'bg-yellow-100 text-yellow-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }

    // Default type (for suppliers, etc.)
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor()}`}
    >
      {status}
    </span>
  );
}
