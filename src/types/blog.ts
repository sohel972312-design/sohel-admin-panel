export interface Category {
  id: number;
  name: string;
  catcolor: string;
  catBg: string;
  created_at: string;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  category_id: number | null;
  category: string | null;
  catcolor: string | null;
  catBg: string | null;
  metatitle: string | null;
  metadescription: string | null;
  date: string | null;
  readtime: string | null;
  bannerimage: string | null;
  thumbbg: string | null;
  author: string | null;
  authoravatar: string | null;
  tags: string[] | string | null;
  content: string | null;
  status: 'draft' | 'published';
  images: ImageItem[] | string | null;
  created_at: string;
  updated_at: string;
}

export interface ImageItem {
  id: string;
  url: string;
  filename: string;
  placeholder: string;
}

export type BlogPostInput = Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>;
