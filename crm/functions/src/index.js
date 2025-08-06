"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.narrativesApiProxy = exports.onUserEmailVerified = void 0;
var functions = require("firebase-functions");
var admin = require("firebase-admin");
// Initialize Firebase Admin
admin.initializeApp();
var NARRATIVES_SNS_API_BASE_URL = "https://narratives-api-765852113927.asia-northeast1.run.app";
// ユーザーのメール認証状態が変更された時のトリガー
exports.onUserEmailVerified = functions.auth.user().onUpdate(function (change, context) { return __awaiter(void 0, void 0, void 0, function () {
    var beforeUser, afterUser, db, businessUserDoc, businessUserData, existingNotifications, notificationData, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                beforeUser = change.before;
                afterUser = change.after;
                if (!(!beforeUser.emailVerified && afterUser.emailVerified)) return [3 /*break*/, 6];
                console.log("User ".concat(afterUser.uid, " verified their email: ").concat(afterUser.email));
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                db = admin.firestore();
                return [4 /*yield*/, db.collection('business_users').doc(afterUser.uid).get()];
            case 2:
                businessUserDoc = _a.sent();
                if (!businessUserDoc.exists) {
                    console.log("Business user document not found for ".concat(afterUser.uid));
                    return [2 /*return*/];
                }
                businessUserData = businessUserDoc.data();
                // 一時パスワードが設定されているかチェック
                if (!(businessUserData === null || businessUserData === void 0 ? void 0 : businessUserData.temporary_password)) {
                    console.log("No temporary password found for ".concat(afterUser.uid));
                    return [2 /*return*/];
                }
                return [4 /*yield*/, db.collection('notifications')
                        .where('user_id', '==', afterUser.uid)
                        .where('notification_type', '==', 'welcome_email')
                        .where('processed', '==', false)
                        .get()];
            case 3:
                existingNotifications = _a.sent();
                if (!existingNotifications.empty) {
                    console.log("Welcome email notification already exists for ".concat(afterUser.uid));
                    return [2 /*return*/];
                }
                notificationData = {
                    notification_id: db.collection('notifications').doc().id,
                    user_id: afterUser.uid,
                    notification_type: 'welcome_email',
                    title: 'アカウント作成完了',
                    body: "".concat(businessUserData.last_name, " ").concat(businessUserData.first_name, "\u69D8\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u4F5C\u6210\u3055\u308C\u307E\u3057\u305F\u3002"),
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                    is_read: false,
                    read_at: null,
                    processed: false
                };
                return [4 /*yield*/, db.collection('notifications').add(notificationData)];
            case 4:
                _a.sent();
                console.log("Welcome email notification created for ".concat(afterUser.uid));
                return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                console.error('Error creating welcome email notification:', error_1);
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// CORS proxy function for narratives-test SNS API
exports.narrativesApiProxy = functions.https.onRequest(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiPath, targetUrl, cleanHeaders_1, response, responseData, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // Set CORS headers
                res.set("Access-Control-Allow-Origin", "https://narratives-crm-site.web.app");
                res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
                res.set("Access-Control-Allow-Credentials", "true");
                // Handle preflight requests
                if (req.method === "OPTIONS") {
                    res.status(200).send();
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                apiPath = req.path || "/";
                targetUrl = "".concat(NARRATIVES_SNS_API_BASE_URL).concat(apiPath);
                console.log("Proxying ".concat(req.method, " ").concat(targetUrl));
                cleanHeaders_1 = {};
                Object.entries(req.headers).forEach(function (_a) {
                    var key = _a[0], value = _a[1];
                    if (key !== 'host' && typeof value === 'string') {
                        cleanHeaders_1[key] = value;
                    }
                });
                return [4 /*yield*/, fetch(targetUrl, {
                        method: req.method,
                        headers: cleanHeaders_1,
                        body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined
                    })];
            case 2:
                response = _a.sent();
                return [4 /*yield*/, response.text()];
            case 3:
                responseData = _a.sent();
                // Set response headers
                response.headers.forEach(function (value, key) {
                    if (key.toLowerCase() !== "access-control-allow-origin") {
                        res.set(key, value);
                    }
                });
                res.status(response.status).send(responseData);
                return [3 /*break*/, 5];
            case 4:
                error_2 = _a.sent();
                console.error("Proxy error:", error_2);
                res.status(500).json({
                    error: "Proxy error",
                    message: error_2 instanceof Error ? error_2.message : "Unknown error"
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
