import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';

Future<void> registerUserProfile(UserModel user) async {
  final currentUser = FirebaseAuth.instance.currentUser;
  if (currentUser == null) return;

  await FirebaseFirestore.instance
      .collection('users')
      .doc(currentUser.uid)
      .set(user.toMap());
}
