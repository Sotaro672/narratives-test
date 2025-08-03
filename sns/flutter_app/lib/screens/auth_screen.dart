import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'email_verification_screen.dart';
import 'shipping_address_screen.dart';

import 'password_reset_screen.dart';
import 'package:flutter/services.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _auth = FirebaseAuth.instance;
  bool isLogin = true;
  bool isAgreed = false;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _firstNameKanaController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _lastNameKanaController = TextEditingController();

  bool _obscurePassword = true;
  String _policyText = '';

  final _scrollController = ScrollController(); // 追加

  bool _isKatakana(String input) {
    final katakanaRegex = RegExp(r'^[\u30A0-\u30FFー\s]+$');
    return katakanaRegex.hasMatch(input);
  }

  Future<void> _loadPolicyText() async {
    final text = await rootBundle.loadString('lib/assets/policy.txt');
    setState(() {
      _policyText = text;
    });
  }

  Future<void> submit(BuildContext context) async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    // BuildContextを保存しておく
    final navigator = Navigator.of(context);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    try {
      if (!isLogin) {
        if (!isAgreed) {
          scaffoldMessenger.showSnackBar(
            const SnackBar(content: Text('利用規約に同意する必要があります')),
          );
          return;
        }

        if (!_isKatakana(_firstNameKanaController.text) ||
            !_isKatakana(_lastNameKanaController.text)) {
          scaffoldMessenger.showSnackBar(
            const SnackBar(content: Text('名前（カナ）は全てカタカナで入力してください')),
          );
          return;
        }

        if (password != confirmPassword) {
          scaffoldMessenger.showSnackBar(
            const SnackBar(content: Text('パスワードが一致しません')),
          );
          return;
        }

        final userCredential = await _auth.createUserWithEmailAndPassword(
          email: email,
          password: password,
        );

        await FirebaseFirestore.instance
            .collection('users')
            .doc(userCredential.user!.uid)
            .set({
          'user_id': userCredential.user!.uid,
          'first_name': _firstNameController.text,
          'first_name_katakana': _firstNameKanaController.text,
          'last_name': _lastNameController.text,
          'last_name_katakana': _lastNameKanaController.text,
          'email_address': email,
          'role': 'user',
          'created_at': FieldValue.serverTimestamp(),
          'updated_at': FieldValue.serverTimestamp(),
        });

        if (!userCredential.user!.emailVerified) {
          await userCredential.user!.sendEmailVerification();
          if (mounted) {
            navigator.pushReplacement(
              MaterialPageRoute(builder: (_) => const EmailVerificationScreen()),
            );
          }
        }
      } else {
        final userCredential = await _auth.signInWithEmailAndPassword(
          email: email,
          password: password,
        );

        await userCredential.user!.reload();
        final refreshedUser = _auth.currentUser;

        if (refreshedUser == null || !refreshedUser.emailVerified) {
          await _auth.signOut();
          if (mounted) {
            scaffoldMessenger.showSnackBar(
              const SnackBar(content: Text('メールアドレスが確認されていません。メールをご確認ください')),
            );
          }
          return;
        }

        if (mounted) {
          navigator.pushReplacement(
            MaterialPageRoute(builder: (_) => const ShippingAddressScreen()),
          );
        }
      }
    } on FirebaseAuthException catch (e) {
      String message = '不明なエラーが発生しました';
      if (e.code == 'email-already-in-use') {
        message = 'このメールアドレスは既に使われています';
      } else if (e.code == 'invalid-email') {
        message = 'メールアドレスの形式が正しくありません';
      } else if (e.code == 'weak-password') {
        message = 'パスワードは6文字以上にしてください';
      } else if (e.code == 'user-not-found' || e.code == 'wrong-password') {
        message = 'メールアドレスまたはパスワードが正しくありません';
      }

      if (mounted) {
        scaffoldMessenger.showSnackBar(SnackBar(content: Text(message)));
      }
    } catch (e) {
      if (mounted) {
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text('エラーが発生しました: $e')),
        );
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _loadPolicyText();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isLogin ? 'Log in' : 'Sign Up'),
        leading: !isLogin
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  setState(() {
                    isLogin = true;
                    isAgreed = false;
                  });
                },
              )
            : null,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Column(
            children: [
              if (!isLogin) ...[
                TextField(
                  controller: _lastNameController,
                  decoration: const InputDecoration(labelText: '苗字'),
                ),
                TextField(
                  controller: _lastNameKanaController,
                  decoration: const InputDecoration(labelText: '苗字（カナ）'),
                ),
                TextField(
                  controller: _firstNameController,
                  decoration: const InputDecoration(labelText: '名前'),
                ),
                TextField(
                  controller: _firstNameKanaController,
                  decoration: const InputDecoration(labelText: '名前（カナ）'),
                ),
              ],
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: 'メールアドレス'),
                keyboardType: TextInputType.emailAddress,
              ),
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: 'パスワード',
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off : Icons.visibility,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscurePassword = !_obscurePassword;
                      });
                    },
                  ),
                ),
              ),
              if (!isLogin)
                TextField(
                  controller: _confirmPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'パスワード（確認）'),
                ),
              if (!isLogin) ...[
                const SizedBox(height: 10),
                Container(
                  alignment: Alignment.centerLeft,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '利用規約',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        height: 180,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Scrollbar(
                          controller: _scrollController, // 追加
                          thumbVisibility: true,
                          child: SingleChildScrollView(
                            controller: _scrollController, // 追加
                            padding: const EdgeInsets.all(8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _policyText.isNotEmpty
                                    ? Text(
                                        _policyText,
                                        style: const TextStyle(fontSize: 13),
                                      )
                                    : const Center(child: CircularProgressIndicator()),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Checkbox(
                                      value: isAgreed,
                                      onChanged: (value) {
                                        setState(() {
                                          isAgreed = value ?? false;
                                        });
                                      },
                                    ),
                                    const Text('利用規約に同意します'),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: isLogin || isAgreed ? () => submit(context) : null,
                child: Text(isLogin ? 'ログイン' : '新規登録'),
              ),
              TextButton(
                onPressed: () {
                  setState(() {
                    isLogin = !isLogin;
                    isAgreed = false;
                  });
                },
                child: Text(isLogin ? 'アカウントを作成する' : 'すでにアカウントをお持ちの方'),
              ),
              if (isLogin)
                TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const PasswordResetScreen()),
                    );
                  },
                  child: const Text('パスワードを忘れた方はこちら'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
