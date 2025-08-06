import { gql } from '@apollo/client';


export interface Order {
  id: string;
  userID: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  orderDate: string;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  userID: string;
  type: InteractionType;
  subject: string;
  content: string;
  channel: InteractionChannel;
  status: InteractionStatus;
  assignedTo?: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadUrl {
  url: string;
  signedUrl: string;
  publicUrl: string;
  downloadUrl: string;
  fileName: string;
  contentType: string;
}

// 型定義（union typeを使用）
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'HOT' | 'COLD' | 'PENDING';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export type InteractionType = 'EMAIL' | 'PHONE_CALL' | 'MEETING' | 'NOTE' | 'TASK' | 'FOLLOW_UP';

export type InteractionChannel = 'EMAIL' | 'PHONE' | 'IN_PERSON' | 'VIDEO_CALL' | 'CHAT' | 'SOCIAL_MEDIA';

export type InteractionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// 定数オブジェクト
export const UserStatusValues = {
  ACTIVE: 'ACTIVE' as const,
  INACTIVE: 'INACTIVE' as const,
  HOT: 'HOT' as const,
  COLD: 'COLD' as const,
  PENDING: 'PENDING' as const,
} as const;

export const OrderStatusValues = {
  PENDING: 'PENDING' as const,
  CONFIRMED: 'CONFIRMED' as const,
  PROCESSING: 'PROCESSING' as const,
  SHIPPED: 'SHIPPED' as const,
  DELIVERED: 'DELIVERED' as const,
  CANCELLED: 'CANCELLED' as const,
  REFUNDED: 'REFUNDED' as const,
} as const;

export const InteractionTypeValues = {
  EMAIL: 'EMAIL' as const,
  PHONE_CALL: 'PHONE_CALL' as const,
  MEETING: 'MEETING' as const,
  NOTE: 'NOTE' as const,
  TASK: 'TASK' as const,
  FOLLOW_UP: 'FOLLOW_UP' as const,
} as const;

export const InteractionChannelValues = {
  EMAIL: 'EMAIL' as const,
  PHONE: 'PHONE' as const,
  IN_PERSON: 'IN_PERSON' as const,
  VIDEO_CALL: 'VIDEO_CALL' as const,
  CHAT: 'CHAT' as const,
  SOCIAL_MEDIA: 'SOCIAL_MEDIA' as const,
} as const;

export const InteractionStatusValues = {
  PENDING: 'PENDING' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
} as const;

// GraphQLクエリ
export const GET_HEALTH = gql`
  query GetHealth {
    health
  }
`;

export const GET_AVATAR_UPLOAD_URL = gql`
  mutation GetAvatarUploadUrl($filename: String!, $contentType: String!, $folder: String) {
    getAvatarUploadUrl(filename: $filename, contentType: $contentType, folder: $folder) {
      url
      signedUrl
      publicUrl
      downloadUrl
      fileName
      contentType
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers($pagination: PaginationInput, $search: String, $status: UserStatus) {
    users(pagination: $pagination, search: $search, status: $status) {
      users {
        user_id
        first_name
        last_name
        first_name_katakana
        last_name_katakana
        email_address
        role
        balance
        status
        created_at
        updated_at
      }
      pageInfo {
        page
        limit
        total
        pages
        hasNext
        hasPrev
      }
    }
  }
`;

export const GET_USER = gql`
  query GetUser($user_id: ID!) {
    user(user_id: $user_id) {
      user_id
      first_name
      last_name
      first_name_katakana
      last_name_katakana
      email_address
      role
      balance
      status
      created_at
      updated_at
      wallets {
        wallet_address
        balance
        currency
        status
        created_at
        updated_at
      }
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($input: UserInput!) {
    createUser(input: $input) {
      user_id
      first_name
      last_name
      first_name_katakana
      last_name_katakana
      email_address
      role
      balance
      status
      created_at
      updated_at
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($user_id: ID!, $input: UserUpdateInput!) {
    updateUser(user_id: $user_id, input: $input) {
      user_id
      first_name
      last_name
      first_name_katakana
      last_name_katakana
      email_address
      role
      balance
      status
      created_at
      updated_at
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($user_id: ID!) {
    deleteUser(user_id: $user_id)
  }
`;
