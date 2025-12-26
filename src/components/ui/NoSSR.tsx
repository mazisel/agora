'use client';

import { useEffect, useState } from 'react';
import LoadingScreen from './LoadingScreen';

export default function NoSSR({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div suppressHydrationWarning={true}>
            {mounted ? children : null}
        </div>
    );
}
