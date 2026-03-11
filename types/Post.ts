// types/Post.ts
export interface Comment {
  user: { _id: string; name?: string; avatar?: string } | string;
  text: string;
  createdAt: string;
}

export interface Share {
  user: { _id: string; name?: string; avatar?: string } | string;
  createdAt: string;
}

export interface Reaction {
  user: { _id: string; name?: string; avatar?: string } | string;
  type: string;
  createdAt?: string;
}

export interface Post {
  _id: string;
  title?: string;
  content?: string;
  createdAt: string;
  updatedAt?: string;
  author: { _id: string; name?: string; avatar?: string } | string;
  comments?: Comment[];
  shares?: Share[];
  media?: string[];
  userReaction?: string;
  reactions?: Reaction[];
}