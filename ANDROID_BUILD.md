# Android APK Build Guide - Beat Saber (Rhythm Slasher)

## ✅ Setup Completed

Android platform đã được cấu hình thành công! Bạn có thể build APK ngay trên Windows.

---

## 📋 Yêu cầu

### 1. Android Studio (Bắt buộc)

**Download và cài đặt:**
- Tải về: https://developer.android.com/studio
- Chọn: Android Studio (latest stable version)
- Cài đặt với default settings
- Khi mở lần đầu, chọn "Standard" installation

**SDK Components cần thiết** (Android Studio sẽ tự động cài):
- Android SDK
- Android SDK Platform
- Android SDK Build-Tools
- Android Emulator (optional)

### 2. Java Development Kit (JDK)

Android Studio thường đi kèm JDK, nhưng nếu cần:
- Download: https://adoptium.net/ (Temurin JDK 17 or 21)

---

## 🚀 Cách Build APK  

### Option 1: Build bằng Android Studio (Recommended)

#### Bước 1: Mở Project

```bash
# Trong terminal
npx cap open android
```

Hoặc:
- Mở Android Studio
- Click "Open" → Chọn folder: `e:\WebPtit\Mobile2\beat_saber-main\android`

#### Bước 2: Chờ Gradle Sync

- Android Studio sẽ tự động sync Gradle (khoảng 2-5 phút lần đầu)
- Đợi đến khi thấy "Sync successful" ở thanh dưới

#### Bước 3: Build Debug APK

**Cách 1 - Build Menu:**
- Menu: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
- Đợi build hoàn tất (~2-5 phút)
- Khi xong, click **Locate** trong notification

**Cách 2 - Gradle Command:**
```bash
cd android
./gradlew assembleDebug
```

**APK sẽ nằm ở:**
```
android\app\build\outputs\apk\debug\app-debug.apk
```

#### Bước 4: Cài APK lên điện thoại

**Method 1: USB Debugging**
1. Trên điện thoại Android:
   - Settings → About Phone → Tap "Build Number" 7 lần
   - Settings → Developer Options → Enable "USB Debugging"
2. Kết nối điện thoại với PC qua USB
3. Trong Android Studio: Click ▶️ Run
4. Chọn điện thoại của bạn trong danh sách

**Method 2: Manual Install**
1. Copy file `app-debug.apk` vào điện thoại (qua USB/Bluetooth/Email)
2. Trong điện thoại, mở File Manager → Tìm file APK → Tap cài đặt
3. Nếu hỏi "Install from unknown sources" → Allow

---

### Option 2: Build bằng Command Line

```bash
# 1. Sync Capacitor
npx cap sync android

# 2. Build APK
cd android
gradlew.bat assembleDebug
cd ..

# APK tại: android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 🎮 Test trên Điện Thoại

### Lần đầu chạy app:

1. **Camera Permission:**
   - App sẽ hỏi quyền camera → Tap "Allow"

2. **Verify Functionality:**
   - ✅ Camera feed hiển thị ở góc dưới phải
   - ✅ Hand landmarks được detect (đường màu trên tay)
   - ✅ Sabers theo chuyển động tay
   - ✅ Game chạy mượt ~45-60 FPS
   - ✅ Audio phát khi bắt đầu game

---

## 🏗️ Build Release APK (Đã sign, sẵn sàng publish)

### Bước 1: Tạo Keystore (Chỉ cần làm 1 lần)

```bash
# Tạo keystore
keytool -genkey -v -keystore rhythm-slasher.keystore -alias rhythmslasher -keyalg RSA -keysize 2048 -validity 10000

# Nhập thông tin:
# - Password: [tạo password mạnh]
# - Name, Organization, etc.
# LƯU Ý: GHI NHỚ PASSWORD VÀ LƯU FILE .keystore AN TOÀN!
```

### Bước 2: Configure Signing

Tạo file `android/key.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=rhythmslasher
storeFile=../rhythm-slasher.keystore
```

**⚠️ QUAN TRỌNG:** Thêm file này vào `.gitignore`!

### Bước 3: Update `android/app/build.gradle`

Thêm trước `android {`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Trong `android { ... }`, thêm `signingConfigs`:

```gradle
android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...existing config...
        }
    }
}
```

### Bước 4: Build Release APK

```bash
cd android
gradlew.bat assembleRelease
cd ..
```

**APK tại:**
```
android\app\build\outputs\apk\release\app-release.apk
```

---

## 📱 Publish lên Google Play Store (Optional)

### Yêu cầu:
- Google Play Developer Account ($25 one-time fee)
- Release APK đã sign

### Quy trình:
1. Login: https://play.google.com/console
2. Create App → Điền thông tin
3. Upload APK hoặc AAB (Android App Bundle)
4. Điền Store Listing (screenshots, description)
5. Content Rating questionnaire
6. Pricing & Distribution
7. Submit for Review (~2-7 days)

**Build AAB thay vì APK:**
```bash
cd android
gradlew.bat bundleRelease
# AAB at: android\app\build\outputs\bundle\release\app-release.aab
```

---

## 🔧 Troubleshooting

### Lỗi: "Android SDK not found"
**Fix:**
- Mở Android Studio → SDK Manager
- Cài Android SDK 34 (hoặc latest)
- Set ANDROID_HOME environment variable

### Lỗi: "Gradle sync failed"
**Fix:**
```bash
cd android
gradlew.bat clean
cd ..
npx cap sync android
```

### Lỗi: Camera không hoạt động
**Fix:**
- Kiểm tra Settings → Apps → Rhythm Slasher → Permissions → Camera = Allowed
- Restart app
- Verify AndroidManifest.xml có camera permission

### App crash khi mở
** Fix:**
- Xem logcat trong Android Studio
- Build → Clean Project → Rebuild Project
- Verify web build mới nhất: `npm run build` → `npx cap sync android`

---

## 📂 File Structure

```
beat_saber-main/
├── android/                                [NEW] Android platform
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml        [MODIFIED] Permissions
│   │   │   └── assets/public/             [WEB ASSETS]
│   │   └── build/outputs/apk/
│   │       ├── debug/app-debug.apk        ← Debug APK
│   │       └── release/app-release.apk    ← Release APK
│   └── gradlew.bat                         Gradle wrapper
├── capacitor.config.ts                     [EXISTING] Already configured
└── dist/                                   Web build output
```

---

## ⚡ Quick Commands Reference

```bash
# Rebuild web + sync to Android
npm run build
npx cap sync android

# Open Android Studio
npx cap open android

# Build debug APK (command line)
cd android
gradlew.bat assembleDebug

# Build release APK (needs keystore)
cd android
gradlew.bat assembleRelease

# Run on connected device
npx cap run android
```

---

## 📊 Expected Performance

| Device | FPS | Notes |
|--------|-----|-------|
| Flagship (Snapdragon 8xx) | 60 | Smooth |
| Mid-range (Snapdragon 7xx) | 45-60 | Good |
| Budget (Snapdragon 6xx) | 30-45 | Playable |

**Tối ưu đã áp dụng:**
- MediaPipe @ 320x240
- Canvas pixel ratio ≤ 1.5
- GPU delegate enabled

---

## ✅ Summary

**Hoàn thành:**
- ✅ Android platform đã setup
- ✅ Camera permissions đã config
- ✅ Code đã optimize cho mobile
- ✅ Sẵn sàng build APK

**Next step:**
1. Download Android Studio nếu chưa có
2. Run `npx cap open android`
3. Build → Build APK(s)
4. Install lên điện thoại và chơi!

🎉 **Android APK của bạn đã sẵn sàng!**
