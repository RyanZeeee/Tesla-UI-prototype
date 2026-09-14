import type { CSSProperties } from 'react'

export type NavigationIconName = 'search' | 'close' | 'back' | 'home' | 'work' | 'park' | 'shopping' | 'culture' | 'coffee' | 'charging' | 'pin' | 'arrow' | 'locate' | 'check' | 'left' | 'right' | 'straight' | 'arrival' | 'pause' | 'play'

export function NavigationIcon({ name, size = 28, style }: { name: NavigationIconName; size?: number; style?: CSSProperties }) {
  const paths: Record<NavigationIconName, React.ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    back: <path d="m14 5-7 7 7 7M7 12h14" />,
    home: <><path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-8h6v8" /></>,
    work: <><rect x="4" y="7" width="16" height="14" rx="2" /><path d="M8 7V3h8v4M4 12h16M10 12v3h4v-3" /></>,
    park: <><path d="m12 2-6 7h3l-5 7h7v6h2v-6h7l-5-7h3Z" /></>,
    shopping: <><path d="M5 8h14l2 13H3ZM8 9V6a4 4 0 0 1 8 0v3" /></>,
    culture: <><path d="m3 8 9-5 9 5ZM3 21h18M5 18v-7m7 7v-7m7 7v-7" /></>,
    coffee: <><path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 9h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3" /></>,
    charging: <path d="m14 2-9 12h6l-1 8 9-12h-6Z" />,
    pin: <><path d="M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    arrow: <path d="m5 13 7-10 7 10-7-3ZM12 10v12" />,
    locate: <><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><path d="M12 1v4m0 14v4M1 12h4m14 0h4" /></>,
    check: <path d="m5 12 5 5L20 6" />,
    left: <path d="M15 21V9a3 3 0 0 0-3-3H3m5-5L3 6l5 5" />,
    right: <path d="M9 21V9a3 3 0 0 1 3-3h9m-5-5 5 5-5 5" />,
    straight: <path d="M12 22V2M5 9l7-7 7 7" />,
    arrival: <><path d="M5 22V3c5-5 9 5 14 0v10c-5 5-9-5-14 0" /></>,
    pause: <><path d="M8 5v14M16 5v14" strokeWidth="4" /></>,
    play: <path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>
}
