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
        console.error('Tasks Error:', error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-900 text-white">
            <div className="w-full max-w-2xl p-6 bg-red-900/20 border border-red-500/50 rounded-lg">
                <h2 className="text-2xl font-bold mb-4 text-red-400">Bir Hata Oluştu (Tasks)</h2>
                <div className="mb-4 p-4 bg-black/50 rounded overflow-auto max-h-96 font-mono text-sm">
                    <p className="font-bold text-red-300">{error.name}: {error.message}</p>
                    {error.digest && <p className="text-gray-400 mt-2">Digest: {error.digest}</p>}
                    {error.stack && (
                        <pre className="mt-2 text-gray-400 whitespace-pre-wrap">{error.stack}</pre>
                    )}
                </div>
                <button
                    onClick={() => reset()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                    Tekrar Dene
                </button>
            </div>
        </div>
    );
}
