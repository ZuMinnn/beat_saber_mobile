# TÀI LIỆU KỸ THUẬT: CAPACITOR.JS TRONG DỰ ÁN RHYTHM SLASHER

**Sinh viên thực hiện:** [Tên sinh viên]  
**MSSV:** [Mã số sinh viên]  
**Lớp:** [Lớp học phần]  
**Ngày:** 13/12/2025

---

## MỤC LỤC

1. [Giới thiệu về Capacitor](#1-giới-thiệu-về-capacitor)
2. [Vai trò của Capacitor trong dự án](#2-vai-trò-của-capacitor-trong-dự-án)
3. [Cấu trúc thư mục và file liên quan](#3-cấu-trúc-thư-mục-và-file-liên-quan)
4. [Quy trình build APK (Android)](#4-quy-trình-build-apk-android)
5. [Quy trình build IPA (iOS)](#5-quy-trình-build-ipa-ios)
6. [Các plugin Capacitor được sử dụng](#6-các-plugin-capacitor-được-sử-dụng)
7. [Tổng kết](#7-tổng-kết)

---

## 1. GIỚI THIỆU VỀ CAPACITOR

### 1.1. Capacitor là gì?

**Capacitor** là một cross-platform runtime framework được phát triển bởi Ionic Team, cho phép các ứng dụng web (HTML, CSS, JavaScript) chạy như các ứng dụng native trên **Android**, **iOS**, và các nền tảng khác.

### 1.2. Capacitor làm được gì?

Capacitor cung cấp các khả năng sau:

| Tính năng | Mô tả | Ứng dụng trong dự án |
|-----------|-------|----------------------|
| **Web-to-Native Bridge** | Chuyển đổi web app thành native app | Chuyển game web React + Three.js thành APK/IPA |
| **Native API Access** | Truy cập camera, GPS, filesystem, etc. | Sử dụng camera cho MediaPipe hand tracking |
| **Plugin System** | Mở rộng chức năng qua plugins | Haptics (rung điện thoại), Camera |
| **Live Reload** | Test nhanh trên thiết bị thật | Debug game trực tiếp trên Android/iOS |
| **Code Sharing** | Một codebase cho nhiều platform | React code dùng chung cho web, Android, iOS |

### 1.3. So sánh với các công nghệ tương tự

| Framework | Ngôn ngữ | Hiệu năng | WebView | Dự án phù hợp |
|-----------|----------|-----------|---------|---------------|
| **Capacitor** | Web (HTML/JS/CSS) | Tốt | Native WebView | ✅ Rhythm Slasher (game web 3D) |
| React Native | JavaScript + JSX | Rất tốt | Custom | App phức tạp, cần hiệu năng cao |
| Flutter | Dart | Xuất sắc | Không | App UI đẹp, animation nhiều |
| Cordova/PhoneGap | Web | Trung bình | UIWebView (cũ) | Legacy apps |

**Lý do chọn Capacitor cho dự án:**
- ✅ Dự án đã có sẵn codebase web (React + Three.js + MediaPipe)
- ✅ Không cần viết lại code native
- ✅ Hỗ trợ tốt WebGL và camera (cần cho game 3D + hand tracking)
- ✅ Dễ debug và test
- ✅ Cộng đồng hỗ trợ tốt, documentation rõ ràng

---

## 2. VAI TRÒ CỦA CAPACITOR TRONG DỰ ÁN

### 2.1. Tổng quan dự án Rhythm Slasher

**Rhythm Slasher** là một game mobile tương tự Beat Saber, trong đó người chơi sử dụng **tay** (thông qua camera) để chém các khối nhạc theo nhịp điệu.

**Tech stack:**
- **Frontend:** React 18.3.1 + TypeScript
- **3D Graphics:** Three.js 0.167.1 + React Three Fiber
- **Hand Tracking:** MediaPipe Tasks Vision 0.10.9
- **Build Tool:** Vite 6.2.0
- **Mobile Runtime:** ⭐ **Capacitor 6.2.0**

### 2.2. Capacitor đang làm gì trong dự án?

#### a) Chuyển đổi Web App → Mobile App

```
┌─────────────────────────────────────────────────────────────┐
│  Web App (React + Three.js + MediaPipe)                     │
│  ├── App.tsx           (logic game chính)                   │
│  ├── components/       (UI components)                      │
│  ├── index.html        (entry point)                        │
│  └── dist/             (build output từ Vite)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    [ npm run build ]
                    Vite compile → dist/
                              ↓
                    [ npx cap sync ]
                    Capacitor copy web assets
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Native App (Android/iOS)                                   │
│  ├── android/app/src/main/assets/public/ ← dist/            │
│  ├── WebView chạy HTML/JS/CSS                               │
│  └── Native code (Java/Kotlin/Swift) + Capacitor Bridge     │
└─────────────────────────────────────────────────────────────┘
```

#### b) Cung cấp quyền truy cập Camera

Game cần camera để:
1. Capture video stream từ camera trước/sau
2. Đưa vào MediaPipe để detect bàn tay
3. Hiển thị video feed trên UI (góc dưới phải màn hình)

**AndroidManifest.xml** (Capacitor tự động config):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" />
```

**Khi app chạy lần đầu:**
```javascript
// Trong App.tsx
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
// → Capacitor hiển thị popup xin quyền camera
// → User tap "Allow" → Camera hoạt động
```

#### c) Hỗ trợ Haptic Feedback (rung điện thoại)

Khi người chơi chém trúng khối:

```typescript
// File: package.json
"@capacitor/haptics": "^6.0.0"

// Trong code game
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Khi chém trúng
await Haptics.impact({ style: ImpactStyle.Medium });
```

#### d) Tối ưu WebView cho game 3D

File `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.beatsaber.rhythmslasher',      // Unique ID trên store
  appName: 'Rhythm Slasher',                  // Tên hiển thị
  webDir: 'dist',                             // Output folder của Vite
  
  server: {
    androidScheme: 'https'  // Dùng HTTPS thay vì file:// → tốt hơn cho camera
  },
  
  ios: {
    preferences: {
      'AllowInlineMediaPlayback': 'TRUE',    // Video inline không fullscreen
      'MediaPlaybackRequiresUserAction': 'FALSE', // Auto-play audio/video
      'WKWebViewOnly': 'TRUE'                // Dùng WKWebView hiện đại (hỗ trợ WebGL)
    }
  }
};
```

---

## 3. CẤU TRÚC THƯ MỤC VÀ FILE LIÊN QUAN

### 3.1. Cấu trúc tổng quan

```
beat_saber-main/
│
├── 📁 src/ (Web app source code)
│   ├── App.tsx                    ← Logic game chính (Three.js scene, hand tracking)
│   ├── components/                ← UI components (Menu, Settings, Scoreboard)
│   ├── constants.ts               ← Config (FPS, difficulty, colors)
│   ├── types.ts                   ← TypeScript interfaces
│   └── index.tsx                  ← React root
│
├── 📁 dist/ (Vite build output)   ← Capacitor dùng folder này
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js        ← Bundled JS
│   │   └── index-[hash].css       ← Bundled CSS
│   └── models/                    ← MediaPipe models (.wasm files)
│
├── 📄 capacitor.config.ts         ⭐ Config Capacitor
│
├── 📁 android/                    ⭐ Android native project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml       ← Permissions (camera)
│   │   │   ├── assets/public/            ← Web files từ dist/
│   │   │   ├── java/.../MainActivity.java ← Entry point Android
│   │   │   └── res/                      ← Icons, splash screen
│   │   └── build.gradle                  ← Dependencies Android
│   ├── gradlew.bat                       ← Build script cho Windows
│   └── build/outputs/apk/
│       ├── debug/app-debug.apk           ← Debug APK
│       └── release/app-release.apk       ← Release APK (signed)
│
├── 📁 ios/                        ⭐ iOS native project
│   ├── App/
│   │   ├── App/
│   │   │   ├── Info.plist                ← Permissions (camera)
│   │   │   ├── AppDelegate.swift         ← Entry point iOS
│   │   │   └── public/                   ← Web files từ dist/
│   │   └── App.xcworkspace               ← Xcode workspace
│   └── App/App/App.xcodeproj
│
├── 📄 package.json                ← Dependencies (Capacitor, React, Three.js)
├── 📄 vite.config.ts              ← Vite build config
└── 📄 tsconfig.json               ← TypeScript config
```

### 3.2. File quan trọng và chức năng

#### a) `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beatsaber.rhythmslasher',     // Bundle ID (unique trên store)
  appName: 'Rhythm Slasher',                 // Tên app hiển thị
  webDir: 'dist',                            // Folder chứa web build
  
  server: {
    androidScheme: 'https'   // Android dùng HTTPS scheme
  },
  
  ios: {
    contentInset: 'always',
    preferences: {
      // iOS-specific WebView settings
      'AllowInlineMediaPlayback': 'TRUE',
      'MediaPlaybackRequiresUserAction': 'FALSE',
      'WKWebViewOnly': 'TRUE'
    }
  }
};

export default config;
```

**Ý nghĩa:**
- `appId`: ID duy nhất của app trên App Store/Play Store
- `webDir`: Capacitor biết copy files từ `dist/` sang native projects
- `server.androidScheme`: Xài HTTPS thay vì `file://` → camera hoạt động tốt hơn
- `ios.preferences`: Tối ưu cho game (WebGL, media playback)

#### b) `package.json` - Dependencies Capacitor

```json
{
  "dependencies": {
    "@capacitor/android": "^6.2.0",   // Android platform
    "@capacitor/core": "^6.2.0",      // Core runtime
    "@capacitor/ios": "^6.2.0",       // iOS platform
    "@capacitor/haptics": "^6.0.0"    // Haptic feedback plugin
  },
  "devDependencies": {
    "@capacitor/cli": "^6.2.0"        // CLI tools (cap sync, cap open, etc.)
  },
  "scripts": {
    "build": "vite build",                    // Build web → dist/
    "cap:sync": "cap sync",                   // Sync dist/ → android/ + ios/
    "cap:sync:android": "cap sync android",
    "cap:open:android": "cap open android",   // Mở Android Studio
    "cap:run:android": "cap run android",     // Build + run trên device
    "cap:open:ios": "cap open ios",
    "cap:run:ios": "cap run ios"
  }
}
```

#### c) `android/app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- ===== CAPACITOR AUTO-GENERATED PERMISSIONS ===== -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    
    <uses-feature android:name="android.hardware.camera" 
                  android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus"
                  android:required="false" />
    
    <!-- Landscape orientation cho game -->
    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:screenOrientation="landscape"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

**Giải thích:**
- `CAMERA` permission: Cho phép app dùng camera
- `screenOrientation="landscape"`: Bắt buộc chế độ ngang (phù hợp game)
- `configChanges`: Không restart app khi xoay màn hình

#### d) `android/app/src/main/java/.../MainActivity.java`

```java
package com.beatsaber.rhythmslasher;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Capacitor tự động:
        // 1. Load WebView
        // 2. Load file từ assets/public/index.html
        // 3. Inject Capacitor bridge (JS ↔ Native)
        // 4. Register plugins (Camera, Haptics, etc.)
    }
}
```

**BridgeActivity** là class của Capacitor:
- Khởi tạo WebView
- Load web app từ `assets/public/`
- Tạo cầu nối JS ↔ Native (gọi native code từ JavaScript)

---

## 4. QUY TRÌNH BUILD APK (ANDROID)

### 4.1. Workflow tổng quan

```
┌──────────────────────────────────────────────────────────────┐
│  BƯỚC 1: Code web app (React + Three.js)                     │
│  ├── src/App.tsx                                             │
│  ├── src/components/                                         │
│  └── ...                                                     │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  BƯỚC 2: Build web app                                       │
│  $ npm run build                                             │
│  → Vite compile → dist/                                      │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  BƯỚC 3: Sync web → Android                                  │
│  $ npx cap sync android                                      │
│  → Copy dist/ → android/app/src/main/assets/public/          │
│  → Update Capacitor plugins                                  │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  BƯỚC 4: Mở Android Studio                                   │
│  $ npx cap open android                                      │
│  → Android Studio mở project android/                        │
│  → Gradle sync (download dependencies)                       │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  BƯỚC 5: Build APK                                           │
│  Option A: Android Studio UI                                 │
│    Build → Build Bundle(s)/APK(s) → Build APK(s)             │
│                                                               │
│  Option B: Command line (Gradle)                             │
│    $ cd android                                              │
│    $ ./gradlew assembleDebug    (Debug APK)                  │
│    $ ./gradlew assembleRelease  (Release APK - cần keystore) │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  OUTPUT: APK file                                            │
│  📦 android/app/build/outputs/apk/debug/app-debug.apk        │
│  📦 android/app/build/outputs/apk/release/app-release.apk    │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2. Chi tiết từng bước

#### BƯỚC 1: Cài đặt Android Studio

**Yêu cầu:**
- Android Studio (latest stable)
- JDK 17+ (thường đi kèm Android Studio)
- Android SDK Platform 34 (API 34)

**Download:** https://developer.android.com/studio

#### BƯỚC 2: Build web app

```bash
# Terminal trong thư mục dự án
npm install        # Cài dependencies (lần đầu)
npm run build      # Build web → dist/
```

**Output:**
```
dist/
├── index.html
├── assets/
│   ├── index-a1b2c3d4.js      ← Bundled JavaScript (minified)
│   ├── index-e5f6g7h8.css     ← Bundled CSS
│   └── hand_landmarker.task   ← MediaPipe model
└── models/
```

#### BƯỚC 3: Sync vào Android project

```bash
npx cap sync android
```

**Capacitor CLI sẽ:**
1. Copy tất cả files từ `dist/` → `android/app/src/main/assets/public/`
2. Update `capacitor.config.json` trong Android project
3. Cài đặt/update các Capacitor plugins
4. Verify AndroidManifest.xml có đủ permissions

**Log output:**
```
✔ Copying web assets from dist to android/app/src/main/assets/public in 123.45ms
✔ Creating capacitor.config.json in android/app/src/main/assets in 1.23ms
✔ Updating Android plugins in 45.67ms
✔ Updating Android project configuration in 12.34ms
✔ Syncing Gradle in 234.56ms
```

#### BƯỚC 4: Build APK

**Option A - Android Studio (Recommended):**

```bash
npx cap open android   # Mở Android Studio
```

Trong Android Studio:
1. Đợi Gradle sync xong (~2-5 phút lần đầu)
2. Menu: **Build** → **Build Bundle(s)/APK(s)** → **Build APK(s)**
3. Đợi build hoàn tất (~3-5 phút)
4. Click **Locate** trong notification → Mở folder chứa APK

**Option B - Command Line (Gradle):**

```bash
cd android
./gradlew assembleDebug            # Windows: gradlew.bat assembleDebug
```

**Output:**
```
> Task :app:assembleDebug
BUILD SUCCESSFUL in 3m 45s
142 actionable tasks: 142 executed

APK location: android\app\build\outputs\apk\debug\app-debug.apk
```

#### BƯỚC 5: Cài APK lên điện thoại

**Method 1: USB Debugging**

1. **Bật Developer Options trên điện thoại:**
   - Settings → About Phone → Tap "Build Number" 7 lần
   - Settings → Developer Options → Enable "USB Debugging"

2. **Kết nối USB:**
   ```bash
   # Kiểm tra thiết bị
   adb devices
   # List of devices attached
   # ABC123456789    device
   ```

3. **Install APK:**
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

   Hoặc trong Android Studio: Click ▶️ Run → Chọn device

**Method 2: Manual Install**
1. Copy file `app-debug.apk` vào điện thoại (USB/Bluetooth/Email)
2. Mở File Manager → Tap file APK → Install
3. Nếu hỏi "Install from unknown sources" → Allow

### 4.3. Build Release APK (Signed - Cho Google Play)

#### Tạo Keystore (chỉ làm 1 lần)

```bash
keytool -genkey -v -keystore rhythm-slasher.keystore -alias rhythmslasher -keyalg RSA -keysize 2048 -validity 10000
```

**Nhập thông tin:**
- Password: `<tạo password mạnh>`
- Name: `Rhythm Slasher`
- Organizational Unit: `Student Project`
- Organization: `PTIT`
- City: `Hanoi`
- State: `Vietnam`
- Country Code: `VN`

**⚠️ LƯU Ý:** File `.keystore` và password rất quan trọng! Nếu mất → không thể update app trên Play Store.

#### Config Signing

Tạo file `android/key.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=rhythmslasher
storeFile=../rhythm-slasher.keystore
```

Thêm vào `.gitignore`:
```
android/key.properties
rhythm-slasher.keystore
```

#### Build Release APK

```bash
cd android
./gradlew assembleRelease
```

**Output:**
```
android/app/build/outputs/apk/release/app-release.apk
```

File này đã được sign, sẵn sàng upload lên Google Play Store.

---

## 5. QUY TRÌNH BUILD IPA (iOS)

> **Lưu ý:** Build iOS yêu cầu **macOS** + **Xcode**. Không thể build trên Windows.

### 5.1. Yêu cầu

- **macOS** (Monterey trở lên)
- **Xcode** 14+ (download từ App Store)
- **Apple Developer Account** ($99/năm - nếu muốn publish lên App Store)
- **CocoaPods** (dependency manager cho iOS)

### 5.2. Cài đặt

```bash
# Cài CocoaPods
sudo gem install cocoapods

# Add iOS platform (nếu chưa có)
npx cap add ios
```

### 5.3. Build workflow

```bash
# 1. Build web
npm run build

# 2. Sync vào iOS
npx cap sync ios

# 3. Mở Xcode
npx cap open ios
```

### 5.4. Trong Xcode

1. **Chọn Team:**
   - Click project "App" → Signing & Capabilities
   - Team: Chọn Apple Developer account của bạn

2. **Build & Run:**
   - Chọn device (iPhone thật hoặc Simulator)
   - Click ▶️ Run (hoặc Cmd+R)

3. **Archive (để publish):**
   - Menu: Product → Archive
   - Đợi build xong → Upload to App Store Connect

**Output:** File `.ipa` trong `ios/build/`

### 5.5. Camera Permission (iOS)

File `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Rhythm Slasher cần camera để phát hiện chuyển động tay và điều khiển game</string>
```

Khi chạy app lần đầu, iOS sẽ hiện popup xin quyền camera với message trên.

---

## 6. CÁC PLUGIN CAPACITOR ĐƯỢC SỬ DỤNG

### 6.1. @capacitor/core

**Mô tả:** Core runtime của Capacitor, cung cấp bridge giữa JavaScript và Native code.

**Chức năng:**
- WebView management
- Plugin system
- Native events handling

**Không cần import trực tiếp** (các plugin khác dùng nội bộ).

### 6.2. @capacitor/camera (Camera API)

**Mặc dù không dùng plugin này trực tiếp**, nhưng Capacitor tự động config permissions cho `navigator.mediaDevices.getUserMedia()`.

**Code trong App.tsx:**

```typescript
// Lấy camera stream
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'user',    // Camera trước (selfie)
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
});

videoRef.current.srcObject = stream;
```

**Capacitor làm gì:**
- Android: Tự động thêm `CAMERA` permission vào `AndroidManifest.xml`
- iOS: Đảm bảo `NSCameraUsageDescription` có trong `Info.plist`
- Request permission lần đầu chạy

### 6.3. @capacitor/haptics

**Mô tả:** Plugin cung cấp haptic feedback (rung điện thoại).

**Code sử dụng:**

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Khi người chơi chém trúng khối
const handleCubeHit = async () => {
  // Rung nhẹ
  await Haptics.impact({ style: ImpactStyle.Light });
  
  // Rung vừa
  await Haptics.impact({ style: ImpactStyle.Medium });
  
  // Rung mạnh
  await Haptics.impact({ style: ImpactStyle.Heavy });
};

// Khi game over
await Haptics.vibrate({ duration: 500 });
```

**Platform support:**
- ✅ Android: Dùng `Vibrator` API
- ✅ iOS: Dùng `UIImpactFeedbackGenerator`
- ❌ Web: Fallback (không làm gì hoặc dùng Vibration API nếu có)

---

## 7. TỔNG KẾT

### 7.1. Vai trò của Capacitor trong dự án

| Vấn đề | Giải pháp của Capacitor |
|--------|------------------------|
| Game web không chạy trên mobile | Đóng gói thành APK/IPA native |
| Cần quyền camera cho hand tracking | Auto-config permissions + request popup |
| Cần haptic feedback khi chém khối | Plugin `@capacitor/haptics` |
| Web build (dist/) không tự động vào mobile | `npx cap sync` copy files sang native projects |
| Debug khó khăn | Live reload + Chrome DevTools (inspect WebView) |

### 7.2. Luồng dữ liệu Capacitor

```
┌─────────────────────────────────────────────────────────────┐
│  React App (App.tsx)                                        │
│  ├── Three.js scene (game graphics)                         │
│  ├── MediaPipe (hand tracking)                              │
│  └── navigator.mediaDevices.getUserMedia() ← Camera         │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│  Capacitor Bridge (JavaScript ↔ Native)                     │
│  ├── cordova.plugins.*                                      │
│  └── window.Capacitor.*                                     │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│  Native Platform (Android/iOS)                              │
│  ├── Android: MainActivity.java + WebView                   │
│  ├── iOS: AppDelegate.swift + WKWebView                     │
│  ├── Camera API                                             │
│  ├── Haptics/Vibration API                                  │
│  └── Rendering engine (GPU acceleration)                    │
└─────────────────────────────────────────────────────────────┘
```

### 7.3. Ưu điểm và hạn chế

**✅ Ưu điểm:**
- Code một lần, chạy trên web + Android + iOS
- Dễ học (nếu đã biết web development)
- Community lớn, plugins nhiều
- Performance tốt cho game 3D (WebGL + GPU)
- Debug dễ (Chrome DevTools)

**❌ Hạn chế:**
- Performance kém hơn native app thuần (Unity, Unreal)
- Không truy cập được APIs rất sâu của OS
- File APK/IPA lớn hơn (do chứa cả WebView runtime)
- iOS cần macOS để build

### 7.4. Kết luận

**Capacitor** là lựa chọn hoàn hảo cho dự án Rhythm Slasher vì:

1. **Tận dụng codebase existing:** Dự án đã có sẵn React + Three.js + MediaPipe, không cần viết lại
2. **Cross-platform:** Một lần code, deploy lên cả Android và iOS
3. **Hỗ trợ tốt WebGL:** Game 3D chạy mượt mà
4. **Camera access:** Dễ dàng lấy camera stream cho hand tracking
5. **Học tập:** Phù hợp với sinh viên CNTT đang học React/Web development

**Quy trình build tóm tắt:**

```bash
# 1. Code web app
npm run dev                      # Test trên browser

# 2. Build production
npm run build                    # → dist/

# 3. Sync to mobile
npx cap sync android             # Android
npx cap sync ios                 # iOS (cần macOS)

# 4. Build APK/IPA
npx cap open android             # Mở Android Studio → Build APK
npx cap open ios                 # Mở Xcode → Build IPA

# 5. Deploy
# - Install trực tiếp APK lên thiết bị
# - Hoặc publish lên Google Play / App Store
```

---

## PHỤ LỤC

### A. Tài liệu tham khảo

- **Capacitor Official Docs:** https://capacitorjs.com/docs
- **Capacitor Plugins:** https://capacitorjs.com/docs/plugins
- **Android Developer Guide:** https://developer.android.com/
- **iOS Developer Guide:** https://developer.apple.com/develop/

### B. Commands thường dùng

```bash
# Capacitor
npx cap sync                     # Sync tất cả platforms
npx cap sync android             # Sync chỉ Android
npx cap sync ios                 # Sync chỉ iOS
npx cap open android             # Mở Android Studio
npx cap open ios                 # Mở Xcode
npx cap run android              # Build + run trên Android device
npx cap run ios                  # Build + run trên iOS device

# Vite (Web build)
npm run dev                      # Dev server (localhost:5173)
npm run build                    # Production build → dist/
npm run preview                  # Preview production build

# Android (Gradle)
cd android
./gradlew assembleDebug          # Debug APK
./gradlew assembleRelease        # Release APK (signed)
./gradlew clean                  # Clean build cache
```

### C. File sizes (ước tính)

| File | Size | Ghi chú |
|------|------|---------|
| Web build (dist/) | ~15 MB | Includes MediaPipe models |
| APK (debug) | ~30 MB | Chứa WebView + assets |
| APK (release) | ~20 MB | Minified + optimized |
| IPA (iOS) | ~25 MB | WKWebView + assets |

---

**TÀI LIỆU KẾT THÚC**

*Lưu ý: Tài liệu này được viết với mục đích học tập và nghiên cứu. Sinh viên có thể tham khảo và điều chỉnh cho phù hợp với yêu cầu của giảng viên.*
