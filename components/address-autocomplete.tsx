"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HERE_API_KEY = process.env.NEXT_PUBLIC_HERE_API_KEY ?? "";

interface Suggestion {
  title: string;
  id: string;
  address: {
    label: string;
  };
}

interface Props {
  id?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AddressAutocomplete({
  id,
  placeholder,
  value,
  onChange,
  disabled,
}: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep internal query in sync when a parent resets the value (e.g. modal close)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  async function fetchSuggestions(q: string) {
    if (!q || q.length < 3 || !HERE_API_KEY) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    try {
      const url =
        `https://autosuggest.search.hereapi.com/v1/autosuggest` +
        `?q=${encodeURIComponent(q)}` +
        `&in=countryCode:ITA` +
        `&resultTypes=address` +
        `&limit=6` +
        `&apiKey=${encodeURIComponent(HERE_API_KEY)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      const items: Suggestion[] = (json.items ?? []).filter(
        (item: Suggestion) => item.address?.label,
      );
      setSuggestions(items);
      setOpen(items.length > 0);
      setActiveIndex(-1);
    } catch {
      /* ignore network errors */
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onChange(q); // keep form in sync while typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300);
  }

  function handleSelect(suggestion: Suggestion) {
    const label = suggestion.address.label;
    setQuery(label);
    onChange(label);
    setSuggestions([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        disabled={disabled}
        className={cn(
          "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />

      {open && suggestions.length > 0 && (
        <ul className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-md">
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click
                handleSelect(s);
              }}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                i === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {s.address.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
