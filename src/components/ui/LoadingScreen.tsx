import React from 'react';

export default function LoadingScreen({ message = 'Yükleniyor...' }: { message?: string }) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">{message}</p>
            </div>
        </div>
    );
}
