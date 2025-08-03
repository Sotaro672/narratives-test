// flutter_app/lib/services/gcs_service.dart

import 'package:http/http.dart' as http;

class GcsService {
  static const String projectId = 'narratives-test-64976';
  static const String bucketName = 'narratives-test';
  
  /// Google Cloud Storageの公開URLを生成
  static String getPublicUrl(String objectName) {
    return 'https://storage.googleapis.com/$bucketName/$objectName';
  }
  
  /// ユーザーのアバターアイコンの公開URLを取得
  static String? getAvatarIconUrl(String userId) {
    final objectName = 'avatar_icons/$userId/icon.png';
    return getPublicUrl(objectName);
  }
  
  /// オブジェクトが存在するかチェック
  static Future<bool> objectExists(String objectName) async {
    try {
      final url = getPublicUrl(objectName);
      final response = await http.head(Uri.parse(url));
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
  
  /// Firebase Authenticationトークンを使用してアップロード用のサインドURLを取得
  /// (これは実際にはバックエンドで実装する必要がありますが、ここでは簡単化のため直接公開URLを返します)
  static Future<String?> getUploadUrl(String objectName) async {
    // 実際の実装では、バックエンドAPIを呼び出してサインドURLを取得する必要があります
    // ここでは簡単化のため、公開URLを返します（アップロードには別の方法が必要）
    return getPublicUrl(objectName);
  }
}
