export type BrandId = 'exodo' | 'agape' | 'personal';

export type KanbanStatus =
  | 'estrategia'
  | 'produccion'
  | 'copywriting'
  | 'programado'
  | 'publicado';

export type ContentType =
  | 'Reel'
  | 'Carrusel'
  | 'Historia'
  | 'Lanzamiento de Producto'
  | 'Tanda';

export type Platform = 'Instagram' | 'TikTok' | 'Web/Lanzamientos';

export type Assignee = 'Andrés' | 'Valeria' | 'Isaac' | 'Diseño Éxodo';

export type ActiveView = 'kanban' | 'calendar' | 'grid';

export interface BrandHighlight {
  id: string;
  label: string;
  tint: string;
  imageUrl?: string;
}

export interface Brand {
  id: BrandId;
  name: string;
  badge: string;
  accent: string;
  accentLight: string;
  description: string;
  handle: string;
  category: string;
  website: string;
  avatarUrl?: string;
  verified?: boolean;
  igPostsOverride?: string;
  igFollowers: string;
  igFollowing: string;
  showStoryRing?: boolean;
  ttFollowing: string;
  ttFollowers: string;
  ttLikes: string;
  ttShowPinned?: boolean;
  highlights: BrandHighlight[];
}

export interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  shortTitle: string;
  owner: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface CommentItem {
  id: string;
  author: Assignee;
  text: string;
  time: string;
}

export interface ContentPost {
  id: string;
  brandId: BrandId;
  title: string;
  status: KanbanStatus;
  platform: Platform;
  contentType: ContentType;
  date: string;
  time: string;
  assignee: Assignee;
  coverUrl: string;
  mediaType: 'image' | 'video';
  mediaItems: MediaItem[];
  caption: string;
  hashtags: string;
  cta: string;
  internalNotes: string;
  checklist: ChecklistItem[];
  comments: CommentItem[];
  feedOrder: number;
}
