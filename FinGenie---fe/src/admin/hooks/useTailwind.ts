import { useEffect, useState } from 'react';

const CDN_TIMEOUT_MS = 8_000;

/**
 * Injects Tailwind CSS CDN + custom animations into the document head.
 * Returns true when Tailwind is ready.
 *
 * Includes:
 * - Timeout fallback (marks ready after 8 s even if CDN fails)
 * - Error handling for network failures
 * - Custom Inter font, animations, and admin utilities
 */
export function useTailwind(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Already loaded
    if (document.getElementById('tw-cdn') && (window as any).tailwind) {
      setReady(true);
      injectExtras();
      return;
    }

    // Safety timeout — don't leave users on a blank screen forever
    const timer = setTimeout(() => {
      console.warn('[useTailwind] CDN load timed out after', CDN_TIMEOUT_MS, 'ms');
      setReady(true);
    }, CDN_TIMEOUT_MS);

    const script = document.createElement('script');
    script.id = 'tw-cdn';
    script.src = 'https://cdn.tailwindcss.com';

    script.onload = () => {
      clearTimeout(timer);
      configureTailwind();
      setReady(true);
    };

    script.onerror = () => {
      clearTimeout(timer);
      console.error('[useTailwind] Failed to load Tailwind CDN');
      setReady(true);                       // render anyway — basic inline styles still work
    };

    document.head.appendChild(script);
    injectExtras();

    return () => clearTimeout(timer);
  }, []);

  return ready;
}

/* ── Private helpers ─────────────────────────────────────── */

function configureTailwind() {
  if (!(window as any).tailwind) return;

  (window as any).tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          navy: {
            950: '#070b14',
            900: '#0a0f1e',
            800: '#0f1629',
            700: '#1a2332',
            600: '#1e293b',
            500: '#334155',
          },
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        },
        animation: {
          'fade-in':    'fadeIn 0.4s ease-out both',
          'slide-up':   'slideUp 0.5s ease-out both',
          'scale-in':   'scaleIn 0.3s ease-out both',
          'slide-down': 'slideDown 0.3s ease-out both',
          'glow-pulse': 'glowPulse 2s ease-in-out infinite',
          'shimmer':    'shimmer 2s ease-in-out infinite',
        },
        keyframes: {
          fadeIn:    { '0%': { opacity: '0' },                                  '100%': { opacity: '1' } },
          slideUp:   { '0%': { opacity: '0', transform: 'translateY(16px)' },   '100%': { opacity: '1', transform: 'translateY(0)' } },
          scaleIn:   { '0%': { opacity: '0', transform: 'scale(0.95)' },        '100%': { opacity: '1', transform: 'scale(1)' } },
          slideDown: { '0%': { opacity: '0', transform: 'translateY(-8px)' },   '100%': { opacity: '1', transform: 'translateY(0)' } },
          glowPulse: { '0%, 100%': { boxShadow: '0 0 12px rgba(16,185,129,0.15)' }, '50%': { boxShadow: '0 0 24px rgba(16,185,129,0.25)' } },
          shimmer:   { '0%': { backgroundPosition: '-200% 0' },                '100%': { backgroundPosition: '200% 0' } },
        },
        backdropBlur: { xs: '2px' },
        transitionDuration: { '400': '400ms' },
      },
    },
  };
}

function injectExtras() {
  // Inter font
  if (!document.getElementById('inter-font')) {
    const link = document.createElement('link');
    link.id  = 'inter-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  // Custom CSS utilities
  if (!document.getElementById('admin-custom-css')) {
    const style = document.createElement('style');
    style.id = 'admin-custom-css';
    style.textContent = `
      /* ── Stagger animation delays for grid children ── */
      .stagger-grid > *:nth-child(1) { animation-delay: 0ms; }
      .stagger-grid > *:nth-child(2) { animation-delay: 60ms; }
      .stagger-grid > *:nth-child(3) { animation-delay: 120ms; }
      .stagger-grid > *:nth-child(4) { animation-delay: 180ms; }
      .stagger-grid > *:nth-child(5) { animation-delay: 240ms; }
      .stagger-grid > *:nth-child(6) { animation-delay: 300ms; }
      .stagger-grid > *:nth-child(7) { animation-delay: 360ms; }
      .stagger-grid > *:nth-child(8) { animation-delay: 420ms; }

      /* ── Custom scrollbar ── */
      .admin-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .admin-scroll::-webkit-scrollbar-track { background: transparent; }
      .admin-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
      .admin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }

      /* ── Glass morphism ── */
      .glass { background: rgba(255,255,255,0.025); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }

      /* ── Smooth transitions on interactive elements ── */
      button, a, input, select, textarea {
        transition-property: all;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 200ms;
      }

      /* ── Table row hover ── */
      .table-row-hover { transition: background-color 200ms ease, transform 100ms ease; }
      .table-row-hover:hover { background: rgba(255,255,255,0.03); }

      /* ── Focus ring ── */
      .focus-ring:focus { outline: none; box-shadow: 0 0 0 2px rgba(16,185,129,0.3); }

      /* ── Chart container animation ── */
      .chart-enter { animation: fadeIn 0.6s ease-out 0.2s both; }

      /* ── Skeleton loading ── */
      .skeleton {
        background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
        background-size: 200% 100%;
        animation: shimmer 2s ease-in-out infinite;
      }

      /* ── Page transition ── */
      .page-enter { animation: slideUp 0.4s ease-out both; }

      /* ── Dark-mode select / option styling ── */
      select, select option {
        background-color: #0f1629;
        color: #cbd5e1;
      }
      select option:checked {
        background: linear-gradient(0deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.2) 100%);
        color: #ffffff;
      }
      select:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(16,185,129,0.3);
      }

      /* ── Prevent text selection on buttons ── */
      button { user-select: none; -webkit-user-select: none; }

      /* ── Smooth scroll for main area ── */
      html { scroll-behavior: smooth; }

      /* ── Global scrollbar for dark admin ── */
      html::-webkit-scrollbar, body::-webkit-scrollbar { width: 6px; height: 6px; }
      html::-webkit-scrollbar-track, body::-webkit-scrollbar-track { background: transparent; }
      html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
      html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
    `;
    document.head.appendChild(style);
  }
}
