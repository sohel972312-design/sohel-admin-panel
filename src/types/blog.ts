export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  catcolor: string | null;
  metatitle: string | null;
  metadescription: string | null;
  date: string | null;
  readtime: string | null;
  bannerimage: string | null;
  thumbbg: string | null;
  author: string | null;
  authoravatar: string | null;
  tags: string[] | null;
  content: string | null;
  catBg: string | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export type BlogPostInput = Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>;