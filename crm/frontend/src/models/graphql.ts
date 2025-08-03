import { gql } from '@apollo/client';


export interface Order {
  id: string;
  customerID: string;
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
  customerID: string;
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
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT' | 'ARCHIVED';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export type InteractionType = 'EMAIL' | 'PHONE_CALL' | 'MEETING' | 'NOTE' | 'TASK' | 'FOLLOW_UP';

export type InteractionChannel = 'EMAIL' | 'PHONE' | 'IN_PERSON' | 'VIDEO_CALL' | 'CHAT' | 'SOCIAL_MEDIA';

export type InteractionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// 定数オブジェクト
export const CustomerStatusValues = {
  ACTIVE: 'ACTIVE' as const,
  INACTIVE: 'INACTIVE' as const,
  PROSPECT: 'PROSPECT' as const,
  ARCHIVED: 'ARCHIVED' as const,
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

export const GET_CUSTOMERS = gql`
  query GetCustomers($pagination: PaginationInput, $search: String, $status: CustomerStatus) {
    customers(pagination: $pagination, search: $search, status: $status) {
      customers {
        id
        name
        email
        phone
        company
        address
        status
        createdAt
        updatedAt
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

export const GET_CUSTOMER = gql`
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      id
      name
      email
      phone
      company
      address
      status
      createdAt
      updatedAt
      orders {
        id
        orderNumber
        status
        totalAmount
        currency
        orderDate
      }
      interactions {
        id
        type
        subject
        content
        status
        createdAt
      }
    }
  }
`;

export const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CustomerInput!) {
    createCustomer(input: $input) {
      id
      name
      email
      phone
      company
      address
      status
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($id: ID!, $input: CustomerUpdateInput!) {
    updateCustomer(id: $id, input: $input) {
      id
      name
      email
      phone
      company
      address
      status
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id)
  }
`;
