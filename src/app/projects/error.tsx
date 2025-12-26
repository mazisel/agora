'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Projects Page Error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-lg w-full text-center">
                <h2 className="text-2xl font-bold text-red-400 mb-4">Bir Hata Oluştu (Projeler)</h2>
                <p className="text-slate-300 mb-6">
                    Sayfa yüklenirken beklenmedik bir hata oluştu.
                </p>

                <div className="bg-slate-950 p-4 rounded-lg text-left mb-6 overflow-auto max-h-64 border border-slate-800">
                    <p className="text-red-300 font-mono text-sm break-all">
                        {error.message || 'Bilinmeyen hata'}
                    </p>
                    {error.stack && (
                        <pre className="text-slate-500 text-xs mt-2 whitespace-pre-wrap">
                            {error.stack}
                        </pre>
                    )}
                </div>

                <button
                    onClick={() => reset()}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium"
                >
                    Tekrar Dene
                </button>
            </div>
        </div>
    );
}
