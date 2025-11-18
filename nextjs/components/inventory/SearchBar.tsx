'use client';

import { FormEvent } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  placeholder?: string;
  filters?: React.ReactNode;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  filters,
}: SearchBarProps) {
  return (
    <form onSubmit={onSubmit} className="mb-6">
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Search
        </button>
      </div>
      {filters && <div className="flex items-center gap-4">{filters}</div>}
    </form>
  );
}
