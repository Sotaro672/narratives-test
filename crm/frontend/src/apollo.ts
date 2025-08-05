import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// GraphQLサーバーのHTTPリンクを作成
const httpLink = createHttpLink({
  uri: 'https://narratives-crm-699392181476-hdgue3uuja-uc.a.run.app/graphql', // CRM専用のCloud RunのGraphQLエンドポイント
});

// 認証用のコンテキストリンク（将来的にFirebase認証トークンを追加可能）
const authLink = setContext((_, { headers }) => {
  // 将来的にここでFirebase認証トークンを設定
  // const token = localStorage.getItem('authToken');
  return {
    headers: {
      ...headers,
      // authorization: token ? `Bearer ${token}` : "",
      'Content-Type': 'application/json',
    }
  };
});

// Apollo Clientインスタンスを作成
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    // キャッシュの設定
    typePolicies: {
      Customer: {
        fields: {
          orders: {
            merge(_existing = [], incoming) {
              return incoming;
            },
          },
          interactions: {
            merge(_existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
      Query: {
        fields: {
          customers: {
            merge(_existing = { customers: [], pageInfo: {} }, incoming) {
              return incoming;
            },
          },
          orders: {
            merge(_existing = { orders: [], pageInfo: {} }, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  // 開発モード用の設定
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'ignore',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

export default apolloClient;
