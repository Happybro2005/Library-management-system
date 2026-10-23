import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Barcode,
  Eye,
  Download,
  Maximize2,
  Minimize2,
  ExternalLink,
  X,
  Layers,
  Sparkles,
  Info,
  Ban,
  ChevronLeft,
} from 'lucide-react';

export interface BookViewerModalProps {
  book: any | null; // Can be Book or Loan object
  loan?: any | null;
  onClose: () => void;
  isBlocked?: boolean;
}

export const BookViewerModal: React.FC<BookViewerModalProps> = ({
  book: rawData,
  loan: passedLoan,
  onClose,
  isBlocked = false,
}) => {
  if (!rawData) return null;

  // Normalize: Did we receive a loan object or a book object?
  const isLoanObject = Boolean(rawData.book && rawData.dueDate);
  const book = isLoanObject ? rawData.book : rawData;
  const loan = passedLoan || (isLoanObject ? rawData : null);
  const copy = isLoanObject ? rawData.copy : null;

  // Determine if digital e-book is available
  const hasDigitalFormat = Boolean(
    book.hasEbook ||
    book.ebookFileName ||
    book.ebookFileUrl ||
    book.bookType === 'EBOOK' ||
    book.bookType === 'HYBRID'
  );

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'READER'>('OVERVIEW');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Loan status details
  const daysRemaining = loan?.daysRemaining;
  const isOverdue = loan?.isOverdue || (daysRemaining !== undefined && daysRemaining < 0);
  const isDueSoon = daysRemaining !== undefined && daysRemaining >= 0 && daysRemaining <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className={`bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen || activeTab === 'READER'
            ? 'w-full max-w-5xl h-[92vh]'
            : 'w-full max-w-2xl max-h-[90vh]'
        }`}
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            {activeTab === 'READER' && (
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-1 text-xs shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </button>
            )}

            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              {activeTab === 'READER' ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{book.title}</h3>
              <p className="text-[11px] text-slate-400 truncate">by {book.author}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {activeTab === 'READER' && hasDigitalFormat && (
              <>
                <a
                  href={`/api/patron/ebooks/${book.id}/stream`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                  title="Open Reader in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href={`/api/patron/ebooks/${book.id}/stream`}
                  download={book.ebookFileName || `${book.title}.pdf`}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                  title="Download digital PDF"
                >
                  <Download className="w-4 h-4" />
                </a>

                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'OVERVIEW' ? (
          <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
            {/* Top Overview: Cover + Quick Metadata */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Cover Card */}
              <div className="w-28 h-40 sm:w-32 sm:h-44 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 border border-indigo-700/40 flex items-center justify-center text-indigo-300 shadow-xl overflow-hidden shrink-0 self-center sm:self-start">
                {book.coverImageUrl ? (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center space-y-2">
                    <BookOpen className="w-10 h-10 text-indigo-400" />
                    <span className="text-[10px] font-semibold text-slate-400 line-clamp-2">{book.category}</span>
                  </div>
                )}
              </div>

              {/* Book Info */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {book.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 uppercase font-mono">
                    {book.bookType || 'PHYSICAL'}
                  </span>
                  {hasDigitalFormat && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                      <FileText className="w-2.5 h-2.5" />
                      <span>E-Book Available</span>
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-black text-white tracking-tight">{book.title}</h2>
                <p className="text-sm text-slate-300 font-medium">by {book.author}</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-[11px]">
                  <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-semibold">ISBN</div>
                    <div className="font-mono text-slate-200 mt-0.5 truncate">{book.isbn}</div>
                  </div>

                  <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-semibold">Publisher</div>
                    <div className="text-slate-200 mt-0.5 truncate">{book.publisher || 'Central Library Press'}</div>
                  </div>

                  <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                    <div className="text-slate-500 text-[10px] uppercase font-semibold">Year & Language</div>
                    <div className="text-slate-200 mt-0.5">
                      {book.publicationYear || 2024} &bull; {book.language || 'English'}
                    </div>
                  </div>
                </div>

                {/* Reader Action Buttons */}
                {hasDigitalFormat && (
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveTab('READER')}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer text-xs"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Read E-Book Online</span>
                    </button>

                    <a
                      href={`/api/patron/ebooks/${book.id}/stream`}
                      download={book.ebookFileName || `${book.title}.pdf`}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold flex items-center space-x-1.5 transition-colors text-xs cursor-pointer border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Download PDF</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Active Loan Details Card (If borrowed by the patron) */}
            {loan && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-950 border border-indigo-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      Your Active Borrowing Status
                    </span>
                  </div>

                  {isOverdue ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{Math.abs(daysRemaining)} days overdue!</span>
                    </span>
                  ) : isDueSoon ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Due in {daysRemaining} days
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {daysRemaining} days remaining
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-semibold">Due Return Date</div>
                    <div className="font-bold text-indigo-300 mt-0.5">
                      {new Date(loan.dueDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-semibold">Copy Barcode</div>
                    <div className="font-mono font-bold text-slate-200 mt-0.5">
                      {copy?.barcode || loan.copy?.barcode || 'N/A'}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-semibold">Return Location</div>
                    <div className="font-medium text-slate-200 mt-0.5">
                      {copy?.shelfLocation || loan.copy?.shelfLocation || 'Circulation Desk'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Synopsis / Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Synopsis & Summary</h4>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-300 leading-relaxed text-[11px]">
                {book.description || (
                  <span className="text-slate-500 italic">
                    A comprehensive title in {book.category} curated for readers and research scholars at the library. Physical copies are cataloged and preserved in the main collection stacks.
                  </span>
                )}
              </div>
            </div>

            {/* Physical Inventory & Shelf Locations */}
            {(book.totalCopies !== undefined || book.shelfLocations) && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span>Physical Stacks & Shelf Locations</span>
                  </span>

                  {book.availableCopies !== undefined && (
                    <span className="text-emerald-400 font-semibold text-[11px]">
                      {book.availableCopies} available of {book.totalCopies} copies
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {book.shelfLocations && book.shelfLocations.length > 0 ? (
                    book.shelfLocations.map((loc: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px]"
                      >
                        {loc}
                      </span>
                    ))
                  ) : copy?.shelfLocation ? (
                    <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px]">
                      {copy.shelfLocation}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[11px] italic">Inquire at circulation front desk</span>
                  )}
                </div>
              </div>
            )}

            {/* Account Status / Borrowing Info */}
            {isBlocked ? (
              <div className="p-3.5 bg-rose-950/40 rounded-2xl border border-rose-500/50 text-rose-200 flex items-start space-x-2.5">
                <Ban className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-white">Account Hold:</strong> Your membership borrowing privileges are currently blocked by administration. Please visit or contact the administrator to resolve the hold.
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-indigo-950/30 rounded-2xl border border-indigo-500/20 text-indigo-200 flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  To check out physical copies, visit the stacks indicated above and present your <strong>Digital Library Card</strong> barcode at the circulation desk.
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Built-in Interactive Reader Frame */
          <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden relative">
            <iframe
              src={`/api/patron/ebooks/${book.id}/stream#toolbar=1`}
              title={book.title}
              className="w-full h-full border-0 bg-slate-950"
            />
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            {activeTab === 'READER' ? 'Digital Reader Mode' : `Book ID: ${book.id?.slice(0, 8)}...`}
          </div>

          <div className="flex items-center space-x-2">
            {activeTab === 'READER' ? (
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Back to Book Info
              </button>
            ) : hasDigitalFormat ? (
              <button
                onClick={() => setActiveTab('READER')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Reader</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
