import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// グローバル変数からエンドポイントを取得するか、ローカルURLを使用
const getGraphQLEndpoint = () => {
  // @ts-ignore
  return window.GRAPHQL_ENDPOINT || 'https://narratives-crm-699392181476-221090465383.us-central1.run.app/graphql';
};

// GraphQLサーバーのHTTPリンクを作成
const httpLink = createHttpLink({
  uri: getGraphQLEndpoint()
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
      User: {
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
          users: {
            merge(_existing = { users: [], pageInfo: {} }, incoming) {
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
