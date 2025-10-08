export const translations = {
  en: {
    hero: {
      title: 'The Anonymous Social Network for Human Connection',
      subtitle: 'Share your deepest feelings, secrets, and experiences anonymously. Connect with billions through AI-powered voice transformation and translation.',
      shareButton: 'Share Your Story',
      exploreButton: 'Explore Stories',
    },
    feed: {
      title: 'Recent Reflections',
      loading: 'Loading stories...',
      empty: 'No stories yet. Be the first to share!',
    },
    auth: {
      signIn: 'Sign In',
      signOut: 'Sign Out',
    },
    footer: {
      disclaimer: 'All stories are anonymized and rewritten by AI. Original content is never exposed. This platform is for emotional support and connection, not professional therapy.',
      copyright: '© 2025 WowMe. A safe space for human connection.',
    },
  },
  'pt-BR': {
    hero: {
      title: 'A Rede Social Anônima para Conexão Humana',
      subtitle: 'Compartilhe seus sentimentos mais profundos, segredos e experiências anonimamente. Conecte-se com bilhões através de transformação de voz e tradução com IA.',
      shareButton: 'Compartilhe Sua História',
      exploreButton: 'Explorar Histórias',
    },
    feed: {
      title: 'Reflexões Recentes',
      loading: 'Carregando histórias...',
      empty: 'Ainda não há histórias. Seja o primeiro a compartilhar!',
    },
    auth: {
      signIn: 'Entrar',
      signOut: 'Sair',
    },
    footer: {
      disclaimer: 'Todas as histórias são anonimizadas e reescritas por IA. O conteúdo original nunca é exposto. Esta plataforma é para suporte emocional e conexão, não terapia profissional.',
      copyright: '© 2025 WowMe. Um espaço seguro para conexão humana.',
    },
  },
  es: {
    hero: {
      title: 'La Red Social Anónima para Conexión Humana',
      subtitle: 'Comparte tus sentimientos más profundos, secretos y experiencias de forma anónima. Conéctate con miles de millones a través de transformación de voz y traducción con IA.',
      shareButton: 'Comparte Tu Historia',
      exploreButton: 'Explorar Historias',
    },
    feed: {
      title: 'Reflexiones Recientes',
      loading: 'Cargando historias...',
      empty: '¡Aún no hay historias. Sé el primero en compartir!',
    },
    auth: {
      signIn: 'Iniciar Sesión',
      signOut: 'Cerrar Sesión',
    },
    footer: {
      disclaimer: 'Todas las historias son anonimizadas y reescritas por IA. El contenido original nunca se expone. Esta plataforma es para apoyo emocional y conexión, no terapia profesional.',
      copyright: '© 2025 WowMe. Un espacio seguro para la conexión humana.',
    },
  },
  zh: {
    hero: {
      title: '匿名社交网络，连接人类情感',
      subtitle: '匿名分享您最深的感受、秘密和经历。通过AI语音转换和翻译与数十亿人建立联系。',
      shareButton: '分享您的故事',
      exploreButton: '探索故事',
    },
    feed: {
      title: '最新反思',
      loading: '加载故事中...',
      empty: '还没有故事。成为第一个分享的人！',
    },
    auth: {
      signIn: '登录',
      signOut: '退出',
    },
    footer: {
      disclaimer: '所有故事都经过AI匿名化和重写。原始内容永远不会暴露。此平台用于情感支持和连接，而非专业治疗。',
      copyright: '© 2025 WowMe. 人类连接的安全空间。',
    },
  },
}

export function getTranslation(lang: string, key: string): string {
  const keys = key.split('.')
  let value: any = translations[lang as keyof typeof translations] || translations.en
  
  for (const k of keys) {
    value = value?.[k]
  }
  
  return value || key
}
