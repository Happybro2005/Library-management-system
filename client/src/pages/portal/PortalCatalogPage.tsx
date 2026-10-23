import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  CheckCircle2,
  XCircle,
  FileText,
  MapPin,
  X,
  Layers,
  ArrowLeft,
  Sparkles,
  Info,
  Ban,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { usePatronAuth } from '../../context/PatronAuthContext';

export const PortalCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { patron } = usePatronAuth();
  const isBlocked = patron?.status === 'BLOCKED';

  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.get('/patron/catalog', {
        params: {
          search: search.trim() || undefined,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          limit: 30,
        },
      });
      if (res.data?.success) {
        setBooks(res.data.data.books || []);
        if (res.data.data.categories && res.data.data.categories.length > 0) {
          setCategories(res.data.data.categories);
        }
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/portal')}
            className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">Library Book Catalog</h1>
          <p className="text-xs text-slate-400">
            Browse our collection, check real-time shelf availability, and locate physical & digital books
          </p>
        </div>
      </div>

      {/* Account Blocked Alert Banner */}
      {isBlocked && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <Ban className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Book Checkout Suspended</div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Your account is currently blocked by the library administrator. New physical or digital checkouts are disabled until the administrative hold is resolved.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/portal')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-md shadow-rose-600/30"
          >
            View Admin Contact Details
          </button>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by book title, author, ISBN..."
              className="w-full pl-11 pr-4 py-3 text-xs bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading library collection...</p>
          </div>
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {books.map((book) => {
            const hasAvailable = book.availableCopies > 0;
            return (
              <div
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className="bg-slate-900 rounded-3xl border border-slate-800 hover:border-indigo-500/50 p-5 shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3.5">
                  {/* Book Cover / Icon & Format Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-14 h-20 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-800 border border-indigo-700/40 flex items-center justify-center text-indigo-300 shadow-md overflow-hidden shrink-0">
                      {book.coverImageUrl ? (
                        <img
                          src={book.coverImageUrl}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <BookOpen className="w-7 h-7" />
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {book.category}
                      </span>
                      {book.hasEbook && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                          <FileText className="w-2.5 h-2.5" />
                          <span>E-Book</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {book.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">by {book.author}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">ISBN: {book.isbn}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5">
                    {hasAvailable ? (
                      <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{book.availableCopies} on shelf</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-rose-400 font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>All checked out</span>
                      </span>
                    )}
                  </div>

                  <span className="text-slate-400 group-hover:text-white font-medium">Details &rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h2 className="text-sm font-bold text-white">No Books Found</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search terms or selecting another category.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Book Details Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-800 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Catalog Details</h3>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedBook.category}
                </span>
                <h2 className="text-lg font-black text-white mt-2">{selectedBook.title}</h2>
                <p className="text-slate-300 mt-0.5">by {selectedBook.author}</p>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">ISBN: {selectedBook.isbn}</p>
              </div>

              {selectedBook.description && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-slate-300 leading-relaxed text-[11px]">
                  {selectedBook.description}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-500 uppercase font-semibold text-[10px]">Publisher & Year</div>
                  <div className="text-white font-medium mt-0.5">
                    {selectedBook.publisher || 'Central Press'} ({selectedBook.publicationYear || 'N/A'})
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-500 uppercase font-semibold text-[10px]">Physical Copies</div>
                  <div className="font-medium mt-0.5">
                    <span className="text-emerald-400 font-bold">{selectedBook.availableCopies} available</span>{' '}
                    <span className="text-slate-400">of {selectedBook.totalCopies} total</span>
                  </div>
                </div>
              </div>

              {/* Shelf Locations */}
              <div>
                <div className="text-slate-400 font-semibold mb-1 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Physical Shelf Locations</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBook.shelfLocations && selectedBook.shelfLocations.length > 0 ? (
                    selectedBook.shelfLocations.map((loc: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px]"
                      >
                        {loc}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-[11px] italic">Inquire at front desk</span>
                  )}
                </div>
              </div>

              {/* How to borrow / Blocked notice */}
              {isBlocked ? (
                <div className="p-3 bg-rose-950/50 rounded-xl border border-rose-500/40 text-rose-200 flex items-start space-x-2">
                  <Ban className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">
                    <strong className="text-white">Borrowing Disabled:</strong> Your account is currently blocked by administration. Please contact the library administrator to reinstate borrowing privileges.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-500/20 text-indigo-200 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">
                    To borrow this title, locate it on the indicated shelf and present your Digital Library Card ID at the circulation desk.
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedBook(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
