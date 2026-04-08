"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

interface SearchResult {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  skills: string[];
  city: string | null;
  state: string | null;
  country: string | null;
  rank: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.candidates);
    setTotal(data.total);
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Search Candidates</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Full-text search across names, skills, location, and email
      </p>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., React developer India, Java senior, Node.js..."
              className="w-full pl-11 pr-4 py-3 text-base border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {loading && <p className="text-muted-foreground">Searching...</p>}

      {searched && !loading && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">{total} results found</p>

          <div className="space-y-3">
            {results.length === 0 ? (
              <p className="text-muted-foreground">No candidates match your search.</p>
            ) : (
              results.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`}
                  className="block bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-primary">{c.firstName} {c.lastName}</p>
                      <p className="text-sm text-muted-foreground">{c.email}</p>
                      {(c.city || c.country) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {[c.city, c.state, c.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Relevance: {c.rank.toFixed(2)}</span>
                  </div>
                  {c.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.skills.slice(0, 8).map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>
                      ))}
                      {c.skills.length > 8 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">+{c.skills.length - 8}</span>
                      )}
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
