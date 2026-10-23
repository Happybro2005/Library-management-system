import React, { useState, useEffect } from 'react';
import {
  FileText,
  BookOpen,
  Download,
  Eye,
  ArrowLeft,
  X,
  Sparkles,
  Maximize2,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export const PortalEbooksPage: React.FC = () => {
  const navigate = useNavigate();
  const [ebooks, setEbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingBook, setReadingBook] = useState<any | null>(null);

  useEffect(() => {
    const fetchEbooks = async () => {
      setLoading(true);
      try {
        const res = await api.get('/patron/ebooks');
        if (res.data?.success) {
          setEbooks(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load ebooks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEbooks();
  }, []);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
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
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Digital E-Book Library</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Online Reader
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Read digital books instantly in your browser or download to your devices
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading digital library...</p>
          </div>
        </div>
      ) : ebooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ebooks.map((book) => (
            <div
              key={book.id}
              className="bg-slate-900 rounded-3xl border border-slate-800 hover:border-purple-500/40 p-5 shadow-xl transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-14 h-20 rounded-xl bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 border border-purple-700/40 flex items-center justify-center text-purple-300 shadow-md shrink-0">
                    <FileText className="w-7 h-7" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {book.category}
                  </span>
                </div>

                <div>
                  <h2 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {book.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">by {book.author}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">ISBN: {book.isbn}</p>
                </div>

                {book.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {book.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-500">{formatFileSize(book.ebookFileSize)}</span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setReadingBook(book)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Read Online</span>
                  </button>
                  <a
                    href={`/api/patron/ebooks/${book.id}/stream`}
                    download={book.ebookFileName || `${book.title}.pdf`}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="Download E-Book"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h2 className="text-sm font-bold text-white">No Digital E-Books Available</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            The digital collection is currently being updated. Check back soon for new electronic editions.
          </p>
        </div>
      )}

      {/* In-Browser E-Book Reader Modal */}
      {readingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Reader Header */}
            <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-1">{readingBook.title}</h3>
                  <p className="text-[11px] text-slate-400">by {readingBook.author}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={`/api/patron/ebooks/${readingBook.id}/stream`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors"
                  title="Open in new window"
                >
                  <Maximize2 className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setReadingBook(null)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reader Frame */}
            <div className="flex-1 bg-slate-950 overflow-hidden relative">
              <iframe
                src={`/api/patron/ebooks/${readingBook.id}/stream#toolbar=1`}
                title={readingBook.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
