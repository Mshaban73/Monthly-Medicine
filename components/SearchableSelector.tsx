import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CloseIcon } from './icons';

interface SearchableSelectorProps<T> {
  items: T[];
  selectedItem: T | null;
  onSelect: (item: T) => void;
  onClear?: () => void;
  itemToString: (item: T | null) => string;
  itemToKey: (item: T) => string;
  filterFn: (item: T, query: string) => boolean;
  placeholder: string;
  clearOnSelect?: boolean;
}

export function SearchableSelector<T>({
  items,
  selectedItem,
  onSelect,
  onClear,
  itemToString,
  itemToKey,
  filterFn,
  placeholder,
  clearOnSelect = false,
}: SearchableSelectorProps<T>) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(itemToString(selectedItem));
  }, [selectedItem, itemToString]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(itemToString(selectedItem)); 
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedItem, itemToString]);

  const filteredItems = useMemo(() => {
    if (!query || (itemToString(selectedItem) === query && !clearOnSelect)) {
      return [];
    }
    return items.filter(item => filterFn(item, query));
  }, [query, items, filterFn, selectedItem, itemToString, clearOnSelect]);

  const handleSelect = (item: T) => {
    onSelect(item);
    if (clearOnSelect) {
        setQuery('');
    } else {
        setQuery(itemToString(item));
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    setQuery('');
    setIsOpen(false);
  };
  
  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="block w-full p-2 pl-8 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        {query && onClear && (
            <button
                onClick={handleClear}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear selection"
            >
                <CloseIcon />
            </button>
        )}
      </div>

      {isOpen && filteredItems.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredItems.map(item => (
            <li
              key={itemToKey(item)}
              onClick={() => handleSelect(item)}
              className="p-2 cursor-pointer hover:bg-blue-50 text-right"
            >
              {itemToString(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
