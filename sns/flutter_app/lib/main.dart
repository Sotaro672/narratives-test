// C:\Users\caota\narratives-test\flutter_app\lib\main.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'screens/main_screen.dart';
import 'firebase_options.dart';
import 'screens/auth_screen.dart';
import 'screens/email_verification_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await initHiveForFlutter(); // キャッシュ用
  runApp(const ProviderScope(child: MyApp()));
}

// 🔐 Firebase 認証状態プロバイダ
final authStateProvider = StreamProvider<User?>((ref) async* {
  final auth = FirebaseAuth.instance;
  await for (final user in auth.authStateChanges()) {
    try {
      if (user != null) {
        await user.reload(); // メール認証状態を更新
        yield auth.currentUser;
      } else {
        yield null;
      }
    } catch (e) {
      await auth.signOut(); // トークン切れなど
      yield null;
    }
  }
});

// 🌐 GraphQL クライアントプロバイダ（Cloud Run 接続）
final graphQLClientProvider = Provider<GraphQLClient>((ref) {
  const graphqlUrl = 'https://narratives-api-765852113927.asia-northeast1.run.app/query';
  
  debugPrint('🔧 GraphQL Client initializing with URL: $graphqlUrl');

  final httpLink = HttpLink(
    graphqlUrl,
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
  );

  return GraphQLClient(
    cache: GraphQLCache(store: HiveStore()),
    link: httpLink,
  );
});

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return MaterialApp(
      title: 'Firebase Auth App',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
      ),
      home: authState.when(
        data: (user) {
          if (user == null) return const AuthScreen();
          if (!user.emailVerified) return const EmailVerificationScreen();
          return const MainScreen();
        },
        loading: () => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
        error: (err, stack) => Scaffold(
          body: Center(child: Text('認証エラー: $err')),
        ),
      ),
    );
  }
}
