import { collection, addDoc } from 'firebase/firestore';
import { crmDb } from '../config/firebase';

/**
 * Firebase Extensions "Trigger Email from Firestore" のテスト用メール送信
 */
export async function testEmailSending(toEmail: string = 'caotailangaogang@gmail.com') {
  try {
    console.log('Testing email sending with Firebase Extensions...');
    
    // Firebase Extensions 用のメールドキュメントを作成
    const testMailData = {
      to: [toEmail],
      message: {
        subject: 'Firebase Extensions テストメール',
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #4CAF50;">Firebase Extensions テストメール</h2>
  
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>テストメッセージ</h3>
    <p>これはFirebase Extensions "Trigger Email from Firestore" の動作確認用のテストメールです。</p>
    <p>送信時刻: ${new Date().toLocaleString('ja-JP')}</p>
  </div>

  <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>設定確認項目</h3>
    <ul>
      <li>SMTP接続: smtps://caotailangaogang@gmail.com:••••@smtp.gmail.com:465</li>
      <li>コレクション名: mails</li>
      <li>デフォルト送信者: caotailangaogang@gmail.com</li>
    </ul>
  </div>

  <p style="color: #666; font-size: 14px;">このメールが届いている場合、Firebase Extensions が正常に動作しています。</p>
</div>
        `,
        text: `
Firebase Extensions テストメール

これはFirebase Extensions "Trigger Email from Firestore" の動作確認用のテストメールです。
送信時刻: ${new Date().toLocaleString('ja-JP')}

設定確認項目:
- SMTP接続: smtps://caotailangaogang@gmail.com:••••@smtp.gmail.com:465
- コレクション名: mails  
- デフォルト送信者: caotailangaogang@gmail.com

このメールが届いている場合、Firebase Extensions が正常に動作しています。
        `
      },
      // Firebase Extensions で処理されるメタデータ
      createdAt: new Date(),
      testType: 'firebase_extensions_test'
    };

    // mailsコレクションにドキュメントを追加
    const mailRef = await addDoc(collection(crmDb, 'mails'), testMailData);
    
    console.log('テストメールをキューに追加しました:', mailRef.id);
    console.log('Firebase Extensions がメールを処理するまで数分かかる場合があります');
    
    return {
      success: true,
      documentId: mailRef.id,
      message: 'テストメールがキューに追加されました'
    };
    
  } catch (error) {
    console.error('テストメール送信エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * 認証用のカスタムメールテスト
 */
export async function testAuthenticationEmail(toEmail: string = 'caotailangaogang@gmail.com') {
  try {
    console.log('Testing authentication email with custom templates...');
    
    const authMailData = {
      to: [toEmail],
      message: {
        subject: 'テスト: Narrativesへようこそ！',
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">お疲れ様です。Narratives CRMシステムへの招待が完了しました。</h2>
  
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【ログイン情報】</h3>
    <p>・メールアドレス: <strong>${toEmail}</strong></p>
    <p>・一時パスワード: <strong>TestPassword123</strong></p>
  </div>

  <div style="background-color: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【初回ログインの手順】</h3>
    <ol>
      <li>システムログインページにアクセス</li>
      <li>上記のメールアドレスとパスワードでログイン</li>
      <li>初回ログイン後、パスワードの変更をお願いします</li>
    </ol>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://narratives-crm-site.web.app/login" 
       style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
      Narratives CRMにログイン
    </a>
  </div>

  <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>【注意事項】</h3>
    <ul>
      <li>このパスワードは一時的なものです</li>
      <li>セキュリティのため、初回ログイン後に変更してください</li>
      <li>このメールは機密情報を含むため、適切に管理してください</li>
    </ul>
  </div>

  <p>何かご質問がございましたら、管理者までお問い合わせください。</p>
  
  <hr style="margin: 30px 0;">
  <p style="color: #666; font-size: 14px;">Narratives CRM システム</p>
  <p style="color: #666; font-size: 12px;">テスト送信: ${new Date().toLocaleString('ja-JP')}</p>
</div>
        `
      },
      createdAt: new Date(),
      testType: 'authentication_email_test'
    };

    const mailRef = await addDoc(collection(crmDb, 'mails'), authMailData);
    
    console.log('認証テストメールをキューに追加しました:', mailRef.id);
    
    return {
      success: true,
      documentId: mailRef.id,
      message: '認証テストメールがキューに追加されました'
    };
    
  } catch (error) {
    console.error('認証テストメール送信エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}
