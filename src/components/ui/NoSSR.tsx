'use client';

import { useEffect, useState } from 'react';
import '@/lib/runtimeGuards';

export default function NoSSR({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            {mounted ? children : null}
        </>
    );
}
