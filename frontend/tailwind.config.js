export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                sentix: {
                    bg: '#0a0a0a',
                    surface: '#14161a',
                    surfaceAlt: '#1a1d22',
                    border: '#2a2d33',
                    text: '#e2e8f0',
                    muted: '#64748b',
                    accent: '#00ff88'
                }
            },
            boxShadow: {
                glow: '0 0 0 1px rgba(0,255,136,0.15), 0 0 24px rgba(0,255,136,0.12)'
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
            }
        }
    },
    plugins: []
};
