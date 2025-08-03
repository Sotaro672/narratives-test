import 'package:uuid/uuid.dart';

enum WalletStatus { hot, cold, deleted }

class Wallet {
  final String walletAddress; // UUID
  final String userId; // 外部キー
  final WalletStatus status;
  final int balance;
  final DateTime createdAt;

  Wallet({
    required this.walletAddress,
    required this.userId,
    required this.status,
    required this.balance,
    required this.createdAt,
  }) {
    if (balance < 0) {
      throw ArgumentError('ウォレット残高は0以上である必要があります。');
    }
  }

  factory Wallet.newWallet({
    required String userId,
    WalletStatus status = WalletStatus.hot,
    int initialBalance = 0,
  }) {
    return Wallet(
      walletAddress: const Uuid().v4(),
      userId: userId,
      status: status,
      balance: initialBalance,
      createdAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'wallet_address': walletAddress,
        'user_id': userId,
        'status': status.name,
        'balance': balance,
        'created_at': createdAt.toIso8601String(),
      };

  factory Wallet.fromJson(Map<String, dynamic> json) => Wallet(
        walletAddress: json['wallet_address'],
        userId: json['user_id'],
        status: WalletStatus.values.firstWhere(
          (e) => e.name == json['status'],
          orElse: () => WalletStatus.hot,
        ),
        balance: json['balance'],
        createdAt: DateTime.parse(json['created_at']),
      );
}
