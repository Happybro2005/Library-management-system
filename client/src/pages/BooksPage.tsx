import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Filter,
  Copy,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

export const BooksPage: React.FC = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  // Modals
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [selectedBookForCopies, setSelectedBookForCopies] = useState<any | null>(null);
  const [isAddCopyOpen, setIsAddCopyOpen] = useState(false);

  // New Book Form
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newCategory, setNewCategory] = useState('Computer Science');
  const [newPublisher, setNewPublisher] = useState('');
  const [newYear, setNewYear] = useState(2024);
  const [newType, setNewType] = useState('PHYSICAL');
  const [newDescription, setNewDescription] = useState('');
  const [newCopies, setNewCopies] = useState(1);
  const [newShelf, setNewShelf] = useState('Main Stack-A1');

  // New Copy Form
  const [copyBarcode, setCopyBarcode] = useState('');
  const [copyAccession, setCopyAccession] = useState('');
  const [copyShelf, setCopyShelf] = useState('A-101');
  const [copyCondition, setCopyCondition] = useState('GOOD');

  // Delete Book State
  const [bookToDelete, setBookToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConfirmDelete = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/books/${bookToDelete.id}`);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          text: res.data.message || `Book "${bookToDelete.title}" deleted successfully.`,
        });
        setBooks((prev) => prev.filter((b) => b.id !== bookToDelete.id));
        setBookToDelete(null);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to delete book.',
      });
      setBookToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/books', {
        params: {
          search: search || undefined,
          category: category || undefined,
          limit: 100,
        },
      });
      if (res.data?.success) {
        const bookList = res.data.data?.books || (Array.isArray(res.data.data) ? res.data.data : []);
        setBooks(bookList);
      }
    } catch (err: any) {
      console.error('Fetch books failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBooks();
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await api.post('/books', {
        title: newTitle.trim(),
        author: newAuthor.trim(),
        isbn: newIsbn.trim(),
        category: newCategory.trim(),
        publisher: newPublisher.trim() || undefined,
        publicationYear: Number(newYear) || undefined,
        bookType: newType,
        description: newDescription.trim() || undefined,
        initialCopies: newType === 'EBOOK' ? 0 : Number(newCopies) || 1,
        defaultShelfLocation: newType === 'EBOOK' ? undefined : newShelf.trim() || 'Main Stack-A1',
      });

      if (res.data?.success) {
        setIsAddBookOpen(false);
        // Reset form
        setNewTitle('');
        setNewAuthor('');
        setNewIsbn('');
        setNewDescription('');
        setNewPublisher('');
        setNewCopies(1);
        setFeedback({ type: 'success', text: `Book "${res.data.data.title}" added to catalog successfully!` });
        fetchBooks();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to add book.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookForCopies) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await api.post(`/books/${selectedBookForCopies.id}/copies`, {
        barcode: copyBarcode.trim(),
        accessionNo: copyAccession.trim(),
        shelfLocation: copyShelf.trim(),
        condition: copyCondition,
      });

      if (res.data?.success) {
        setIsAddCopyOpen(false);
        setCopyBarcode('');
        setCopyAccession('');
        setFeedback({ type: 'success', text: 'Physical copy registered successfully!' });
        fetchBooks();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to add copy.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Books Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage bibliographic titles, accession barcodes, and shelf copies</p>
        </div>

        <button
          onClick={() => setIsAddBookOpen(true)}
          className="px-4 py-2.5 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Book</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-zinc-100 text-zinc-900 border border-zinc-300'
              : 'bg-zinc-900 text-white border border-zinc-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-zinc-800 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author, or ISBN..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-800 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800 w-full sm:w-auto"
          >
            <option value="">All Categories</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Software Engineering">Software Engineering</option>
            <option value="Fiction">Fiction</option>
            <option value="Science">Science</option>
            <option value="History">History</option>
          </select>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Title & Author</th>
                <th className="py-3 px-4">ISBN</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Copies (Avail/Total)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {books.length > 0 ? (
                books.map((b) => {
                  const totalCopies = b.copies?.length || 0;
                  const availCopies = b.copies?.filter((c: any) => c.status === 'AVAILABLE').length || 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{b.title}</div>
                        <div className="text-[11px] text-slate-400">{b.author}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{b.isbn}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                          {b.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
                          {b.bookType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {availCopies} / {totalCopies}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedBookForCopies(b);
                            setIsAddCopyOpen(true);
                          }}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium cursor-pointer"
                          title="Add copy"
                        >
                          + Copy
                        </button>
                        <button
                          onClick={() => setBookToDelete(b)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-medium cursor-pointer inline-flex items-center space-x-1 transition-colors"
                          title="Delete book"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {loading ? 'Loading catalog books...' : 'No books found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Book */}
      {isAddBookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Add Book Title</span>
              </h3>
              <button onClick={() => setIsAddBookOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Clean Architecture"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Author *</label>
                  <input
                    type="text"
                    required
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="Robert C. Martin"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">ISBN *</label>
                  <input
                    type="text"
                    required
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                    placeholder="978-0134494166"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Format *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="PHYSICAL">Physical Book</option>
                    <option value="EBOOK">E-Book</option>
                    <option value="HYBRID">Hybrid (Both)</option>
                  </select>
                </div>
              </div>

              {newType !== 'EBOOK' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Initial Physical Copies</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={newCopies}
                      onChange={(e) => setNewCopies(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                    <span className="text-[10px] text-slate-500">Auto-generates barcodes</span>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Shelf Location</label>
                    <input
                      type="text"
                      value={newShelf}
                      onChange={(e) => setNewShelf(e.target.value)}
                      placeholder="e.g. Main Stack-A1"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-500">Physical shelf section</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddBookOpen(false)}
                  className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  {saving ? 'Adding...' : 'Save Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Copy */}
      {isAddCopyOpen && selectedBookForCopies && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center space-x-2">
                <Copy className="w-4 h-4 text-zinc-800" />
                <span>Add Copy: {selectedBookForCopies.title}</span>
              </h3>
              <button onClick={() => setIsAddCopyOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCopy} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Barcode *</label>
                <input
                  type="text"
                  required
                  value={copyBarcode}
                  onChange={(e) => setCopyBarcode(e.target.value)}
                  placeholder="BAR-97814-1"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Accession Number *</label>
                <input
                  type="text"
                  required
                  value={copyAccession}
                  onChange={(e) => setCopyAccession(e.target.value)}
                  placeholder="ACC-97814-1"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Shelf Location *</label>
                  <input
                    type="text"
                    required
                    value={copyShelf}
                    onChange={(e) => setCopyShelf(e.target.value)}
                    placeholder="CS-A1"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Condition *</label>
                  <select
                    value={copyCondition}
                    onChange={(e) => setCopyCondition(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddCopyOpen(false)}
                  className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  {saving ? 'Registering...' : 'Register Copy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Book Confirmation */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Book from Catalog</h3>
                <p className="text-[11px] text-slate-500">Remove title and inventory records</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="font-bold text-slate-900">{bookToDelete.title}</div>
              <div className="text-slate-500">by {bookToDelete.author}</div>
              <div className="text-[11px] font-mono text-slate-400">ISBN: {bookToDelete.isbn}</div>
              <div className="text-[11px] text-slate-500 pt-1">
                Physical Copies: <span className="font-semibold text-slate-700">{bookToDelete.copies?.length || 0}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete this book? If any physical copies are currently borrowed by members, deletion will be blocked until returned.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center space-x-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
