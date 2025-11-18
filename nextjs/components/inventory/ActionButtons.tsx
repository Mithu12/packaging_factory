'use client';

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
}

export default function ActionButtons({
  onView,
  onEdit,
  onDelete,
  showView = true,
  showEdit = true,
  showDelete = true,
}: ActionButtonsProps) {
  return (
    <div className="flex space-x-3">
      {showView && onView && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
        >
          View
        </button>
      )}
      {showEdit && onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="text-green-600 hover:text-green-900 text-sm font-medium"
        >
          Edit
        </button>
      )}
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-600 hover:text-red-900 text-sm font-medium"
        >
          Delete
        </button>
      )}
    </div>
  );
}
