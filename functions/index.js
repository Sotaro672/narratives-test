const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Firebase Admin を初期化
admin.initializeApp();

// Gmail SMTP設定（詳細設定）
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'caotailangaogang@gmail.com',
    pass: 'volwwbdcfwpyzvodで' // Gmail App Password - Updated
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true, // デバッグモードを有効化
  logger: true // ログを有効化
});

// Firestoreのmailsコレクションに新しいドキュメントが作成された時にメール送信
exports.sendEmail = onDocumentCreated({
  document: 'mails/{mailId}',
  region: 'us-central1',
  databaseId: '(default)'
}, async (event) => {
  const mailData = event.data.data();
  const mailId = event.params.mailId;
  
  logger.info(`Processing email document: ${mailId}`, mailData);
  
  try {
    // 送信先アドレスの取得
    const toAddresses = Array.isArray(mailData.to) ? mailData.to : [mailData.to];
    
    // メール設定
    const mailOptions = {
      from: mailData.from || 'caotailangaogang@gmail.com',
      to: toAddresses.join(', '),
      subject: mailData.message?.subject || 'No Subject',
      text: mailData.message?.text || '',
      html: mailData.message?.html || ''
    };
    
    // CC、BCCがある場合は追加
    if (mailData.cc) {
      const ccAddresses = Array.isArray(mailData.cc) ? mailData.cc : [mailData.cc];
      mailOptions.cc = ccAddresses.join(', ');
    }
    
    if (mailData.bcc) {
      const bccAddresses = Array.isArray(mailData.bcc) ? mailData.bcc : [mailData.bcc];
      mailOptions.bcc = bccAddresses.join(', ');
    }
    
    // Reply-toが指定されている場合は追加
    if (mailData.replyTo) {
      mailOptions.replyTo = mailData.replyTo;
    }
    
    logger.info('Sending email with options:', mailOptions);
    
    // メール送信
    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully:', info);
    
    // 送信結果をFirestoreに記録
    await admin.firestore().collection('mails').doc(mailId).update({
      delivery: {
        state: 'SUCCESS',
        time: admin.firestore.Timestamp.now(),
        messageId: info.messageId,
        response: info.response
      }
    });
    
    return null;
    
  } catch (error) {
    logger.error('Error sending email:', error);
    
    // エラー情報をFirestoreに記録
    await admin.firestore().collection('mails').doc(mailId).update({
      delivery: {
        state: 'ERROR',
        time: admin.firestore.Timestamp.now(),
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR'
        }
      }
    });
    
    throw error;
  }
});

// 認証メール送信専用の関数
exports.sendAuthenticationEmail = onDocumentCreated({
  document: 'auth_mails/{mailId}',
  region: 'us-central1',
  databaseId: '(default)'
}, async (event) => {
  const mailData = event.data.data();
  const mailId = event.params.mailId;
  
  logger.info(`Processing authentication email: ${mailId}`, mailData);
  
  try {
    // 認証メール用のテンプレート
    const subject = mailData.type === 'verification' 
      ? 'メールアドレスの確認'
      : mailData.type === 'password_reset'
      ? 'パスワードリセット'
      : mailData.message?.subject || 'Narratives - 認証メール';
    
    let htmlContent = '';
    let textContent = '';
    
    if (mailData.type === 'verification' && mailData.verificationUrl) {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>メールアドレスの確認</h2>
          <p>Narrativesへのご登録ありがとうございます。</p>
          <p>以下のボタンをクリックして、メールアドレスを確認してください：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${mailData.verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              メールアドレスを確認
            </a>
          </div>
          <p><small>または、以下のURLをブラウザにコピー＆ペーストしてください：<br>
          ${mailData.verificationUrl}</small></p>
          ${mailData.credentials ? `
            <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3>ログイン情報</h3>
              <p><strong>メールアドレス:</strong> ${mailData.credentials.email}</p>
              <p><strong>仮パスワード:</strong> ${mailData.credentials.password}</p>
              <p><small>※セキュリティのため、ログイン後にパスワードを変更することをお勧めします。</small></p>
            </div>
          ` : ''}
        </div>
      `;
      
      textContent = `
Narrativesへのご登録ありがとうございます。

以下のURLをクリックして、メールアドレスを確認してください：
${mailData.verificationUrl}

${mailData.credentials ? `
ログイン情報:
メールアドレス: ${mailData.credentials.email}
仮パスワード: ${mailData.credentials.password}

※セキュリティのため、ログイン後にパスワードを変更することをお勧めします。
` : ''}
      `;
    } else if (mailData.type === 'password_reset' && mailData.resetUrl) {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>パスワードリセット</h2>
          <p>Narrativesのパスワードリセットを承りました。</p>
          <p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${mailData.resetUrl}" 
               style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              パスワードをリセット
            </a>
          </div>
          <p><small>または、以下のURLをブラウザにコピー＆ペーストしてください：<br>
          ${mailData.resetUrl}</small></p>
        </div>
      `;
      
      textContent = `
Narrativesのパスワードリセットを承りました。

以下のURLをクリックして、新しいパスワードを設定してください：
${mailData.resetUrl}
      `;
    } else {
      // カスタムメッセージの場合
      htmlContent = mailData.message?.html || `<p>${mailData.message?.text || 'メッセージがありません'}</p>`;
      textContent = mailData.message?.text || 'メッセージがありません';
    }
    
    const mailOptions = {
      from: 'Narratives <caotailangaogang@gmail.com>',
      to: mailData.to,
      subject: subject,
      text: textContent,
      html: htmlContent
    };
    
    logger.info('Sending authentication email:', mailOptions);
    
    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Authentication email sent successfully:', info);
    
    // 送信結果をFirestoreに記録
    await admin.firestore().collection('auth_mails').doc(mailId).update({
      delivery: {
        state: 'SUCCESS',
        time: admin.firestore.Timestamp.now(),
        messageId: info.messageId,
        response: info.response
      }
    });
    
    return null;
    
  } catch (error) {
    logger.error('Error sending authentication email:', error);
    
    // エラー情報をFirestoreに記録
    await admin.firestore().collection('auth_mails').doc(mailId).update({
      delivery: {
        state: 'ERROR',
        time: admin.firestore.Timestamp.now(),
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR'
        }
      }
    });
    
    throw error;
  }
});

// 手動でメール送信をトリガーする関数
const {onCall} = require('firebase-functions/v2/https');

exports.triggerEmailSend = onCall({
  region: 'us-central1'
}, async (request) => {
  const data = request.data;
  const context = request.auth;
  
  // 認証チェック
  if (!context) {
    throw new Error('ユーザーがログインしていません');
  }
  
  logger.info('Manual email trigger called:', data);
  
  try {
    const mailId = admin.firestore().collection('mails').doc().id;
    
    await admin.firestore().collection('mails').doc(mailId).set({
      ...data,
      timestamp: admin.firestore.Timestamp.now(),
      triggeredBy: context.uid
    });
    
    return { success: true, mailId: mailId };
    
  } catch (error) {
    logger.error('Error triggering email send:', error);
    throw new Error('メール送信のトリガーに失敗しました');
  }
});
