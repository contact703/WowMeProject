// Tema moderno preto/branco/vermelho
export const theme = {
  colors: {
    background: '#0a0a0a',
    surface: '#1a1a1a',
    surfaceHover: '#2a2a2a',
    border: '#2a2a2a',
    borderHover: '#ef4444',
    primary: '#ef4444',
    primaryHover: '#dc2626',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
  },
  
  // Classes Tailwind reutilizáveis
  classes: {
    // Containers
    page: 'min-h-screen bg-black text-white',
    container: 'container mx-auto px-4',
    
    // Header
    header: 'border-b border-gray-800 backdrop-blur-sm bg-black/95 sticky top-0 z-50',
    headerInner: 'container mx-auto px-4 py-3 flex items-center justify-between gap-2',
    
    // Logo
    logo: 'flex items-center gap-2 flex-shrink-0',
    logoIcon: 'w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/50',
    logoText: 'text-lg md:text-2xl font-bold hidden sm:block',
    
    // Buttons
    buttonPrimary: 'bg-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition shadow-lg shadow-red-600/30',
    buttonSecondary: 'bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg font-medium hover:border-red-600 hover:text-red-600 transition',
    buttonGhost: 'px-4 py-2 rounded-lg font-medium hover:bg-gray-900 transition',
    
    // Cards
    card: 'bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-red-600 transition-all duration-300',
    cardCompact: 'bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-red-600 transition',
    
    // Forms
    input: 'w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 transition',
    textarea: 'w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 transition resize-none',
    select: 'bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 hover:border-red-600 transition',
    checkbox: 'w-4 h-4 text-red-600 bg-gray-900 border-gray-700 rounded focus:ring-red-600',
    label: 'block text-sm font-medium text-gray-300 mb-2',
    
    // Tabs
    tabList: 'flex gap-2 border-b border-gray-800 mb-6',
    tabButton: 'px-4 py-2 font-medium transition',
    tabActive: 'border-b-2 border-red-600 text-red-600',
    tabInactive: 'text-gray-400 hover:text-white',
    
    // Badges
    badge: 'px-2 py-1 rounded-full text-xs font-medium',
    badgePrimary: 'bg-red-600 text-white',
    badgeSecondary: 'bg-gray-800 text-gray-300',
    badgeSuccess: 'bg-green-600 text-white',
    badgeWarning: 'bg-yellow-600 text-white',
    badgeDanger: 'bg-red-600 text-white',
    
    // Loading
    spinner: 'inline-block animate-spin rounded-full border-t-2 border-b-2 border-red-600',
    
    // Empty states
    empty: 'text-center py-12 bg-gray-900 rounded-lg border border-gray-800',
    emptyText: 'text-gray-400 text-lg',
  }
}

export default theme

