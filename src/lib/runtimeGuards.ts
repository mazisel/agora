const ensureReturnNaN = () => {
  const globalWithReturnNaN = globalThis as typeof globalThis & {
    returnNaN?: number;
  };

  if (typeof globalWithReturnNaN.returnNaN === 'undefined') {
    Object.defineProperty(globalWithReturnNaN, 'returnNaN', {
      value: Number.NaN,
      writable: false,
      configurable: true,
      enumerable: false
    });
  }
};

const ensureTimezone = () => {
  if (typeof process === 'undefined' || !process.env) return;

  const tz = (process.env.TZ || '').trim();
  const isInvalidTz = tz === '' || tz === 'lrt' || tz === '/dev/lrt' || tz === ':/dev/lrt';

  if (isInvalidTz) {
    process.env.TZ = 'Europe/Istanbul';
  }
};

ensureReturnNaN();
ensureTimezone();
