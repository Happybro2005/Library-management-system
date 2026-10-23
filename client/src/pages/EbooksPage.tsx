import React, { useState, useEffect } from 'react';
import { FileText, Upload, Download, Eye, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { api } from '../api/client';

export const EbooksPage: React.FC = () => {
  const [ebooks, setEbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingBookId, setUploadingBookId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEbooks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ebooks');
      if (res.data?.success) {
        const list = res.data.data?.ebooks || (Array.isArray(res.data.data) ? res.data.data : []);
        setEbooks(list);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEbooks();
  }, []);

  const handleUpload = async (bookId: string) => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post(`/ebooks/${bookId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        setFeedback({ type: 'success', text: 'E-book file uploaded successfully!' });
        setUploadingBookId(null);
        setSelectedFile(null);
        fetchEbooks();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Upload failed.' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900">E-Books Digital Repository</h1>
        <p className="text-xs text-slate-500 mt-0.5">Stream, preview, and upload digital PDF/EPUB copies</p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Title & Author</th>
              <th className="py-3 px-4">ISBN</th>
              <th className="py-3 px-4">Digital File</th>
              <th className="py-3 px-4">File Size</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ebooks.length > 0 ? (
              ebooks.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{b.title}</div>
                    <div className="text-[11px] text-slate-400">{b.author}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{b.isbn}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {b.ebookFileName || <span className="text-slate-400 italic">No file uploaded</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {b.ebookFileSize ? `${(b.ebookFileSize / (1024 * 1024)).toFixed(1)} MB` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {b.ebookFileUrl && (
                      <button
                        onClick={() => setPreviewUrl(`/api/ebooks/${b.id}/stream`)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium cursor-pointer inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Read</span>
                      </button>
                    )}
                    <button
                      onClick={() => setUploadingBookId(b.id)}
                      className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium cursor-pointer inline-flex items-center space-x-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  {loading ? 'Loading e-books repository...' : 'No e-books or hybrid catalog items found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {uploadingBookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Upload E-Book File</h3>
              <button onClick={() => setUploadingBookId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <input
                type="file"
                accept=".pdf,.epub"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-slate-600 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setUploadingBookId(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpload(uploadingBookId)}
                  disabled={!selectedFile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  Confirm Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>E-Book Reader Stream</span>
              </h3>
              <button onClick={() => setPreviewUrl(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full border-none" title="E-Book Reader" />
          </div>
        </div>
      )}
    </div>
  );
};
