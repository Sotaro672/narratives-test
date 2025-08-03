import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../widgets/my_home_header.dart';
import '../widgets/news_field_header.dart';
import '../widgets/common_footer.dart';
import '../widgets/main_body.dart';
import '../widgets/news_field_body.dart';
import '../widgets/my_home_body.dart';
import '../widgets/setting_body.dart';
import '../widgets/avatar_edit_body.dart';
import '../widgets/inquiry_body.dart';
import '../widgets/email_update_body.dart';
import '../widgets/password_update_body.dart';
import '../widgets/profile_edit_body.dart';
import '../widgets/policy_body.dart';
import '../widgets/account_delete.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  String _avatarName = 'マイページ';
  Widget _currentBody = const NewsFieldBody();
  PreferredSizeWidget _currentAppBar = const NewsFieldHeader(title: 'ニュース');

  @override
  void initState() {
    super.initState();
    _loadAvatarName();
  }

  void _showNewsPage() {
    _switchBodyAndHeader(
      body: const NewsFieldBody(),
      appBar: const NewsFieldHeader(title: 'ニュース'),
    );
  }

  void _showMyHomePage() {
    _switchBodyAndHeader(
      body: MyHomePageBody(onEditPressed: _showAvatarEditPage),
      appBar: MyHomeHeader(
        title: _avatarName,
        onSettingsPressed: _showSettingPage,
      ),
    );
  }

  void _showAccountDeletePage() {
    _switchBodyAndHeader(
      body: const AccountDeleteBody(),
      appBar: AppBar(
        title: const Text('アカウント削除'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _showSettingPage,
        ),
      ),
    );
  }

  void _showSettingPage() {
    _switchBodyAndHeader(
      body: SettingBody(
        onBackPressed: _showMyHomePage,
        onInquiryPressed: _showInquiryPage,
        onEmailUpdatePressed: _showEmailUpdatePage,
        onPasswordUpdatePressed: _showPasswordUpdatePage,
        onProfileEditPressed: _showProfileEditPage,
        onPolicyPressed: _showPolicyPage,
        onAccountDeletePressed: _showAccountDeletePage,
      ),
      appBar: AppBar(
        title: const Text('設定とアクティビティ'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _showMyHomePage,
        ),
      ),
    );
  }

  void _showAvatarEditPage() {
    _switchBodyAndHeader(
      body: const AvatarEditBody(),
      appBar: AppBar(
        title: const Text('アバター編集'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _showMyHomePage,
        ),
      ),
    );
  }

  void _showInquiryPage() {
    _switchBodyAndHeader(
      body: const InquiryBody(),
      appBar: AppBar(
        title: const Text('お問い合わせ'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _showSettingPage,
        ),
      ),
    );
  }

  void _showEmailUpdatePage() {
    _switchBodyAndHeader(
      body: const EmailUpdateBody(),
      appBar: AppBar(
        title: const Text('メールアドレス変更'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _showSettingPage,
        ),
      ),
    );
  }

  void _showPasswordUpdatePage() {
    _switchBodyAndHeader(
      body: const PasswordUpdateBody(),
      appBar: AppBar(
        title: const Text('パスワード変更'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _showSettingPage,
        ),
      ),
    );
  }

  void _showProfileEditPage() {
    _switchBodyAndHeader(
      body: const ProfileEditBody(),
      appBar: AppBar(
        title: const Text('プロフィール編集'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _showSettingPage,
        ),
      ),
    );
  }

    void _showPolicyPage() {
    _switchBodyAndHeader(
      body: const PolicyBody(),
      appBar: AppBar(
        title: const Text('利用規約'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _showSettingPage,
        ),
      ),
    );
  }

  Future<void> _loadAvatarName() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final query = await FirebaseFirestore.instance
        .collection('avatars')
        .where('user_id', isEqualTo: user.uid)
        .limit(1)
        .get();

    if (query.docs.isNotEmpty) {
      final name = query.docs.first.data()['avatar_name'] ?? 'マイページ';
      setState(() {
        _avatarName = name;
      });
    }
  }

  void _switchBodyAndHeader({
    required Widget body,
    required PreferredSizeWidget appBar,
  }) {
    setState(() {
      _currentBody = body;
      _currentAppBar = appBar;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _currentAppBar,
      body: MainBody(child: _currentBody),
      bottomNavigationBar: CommonFooter(
        onHomePressed: _showNewsPage,
        onAvatarPressed: _showMyHomePage,
      ),
    );
  }
}
