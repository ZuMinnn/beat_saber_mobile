# Beat Saber iOS - Quick Reference

## ✅ What's Done (Windows)

- ✅ Capacitor installed and configured
- ✅ iOS platform added
- ✅ Code optimized for mobile (MediaPipe 320x240, Canvas dpr 1.5)
- ✅ Camera permissions configured
- ✅ Custom ViewController created
- ✅ Web app built and synced

## 📱 Next: Test on Mac

```bash
# 1. Open Xcode
npx cap open ios

# 2. Select iPhone device (real hardware required for camera)

# 3. Click Run ▶️

# 4. Grant camera permission on device

# 5. Verify:
#    ✅ Camera feed visible
#    ✅ Hands tracked
#    ✅ Game plays smoothly
```

## 🔧 If You Need to Rebuild

```bash
# Rebuild web app
npm run build

# Sync to iOS
npx cap sync ios

# Clean iOS build (if errors)
cd ios/App
pod install
cd ../..
npx cap sync ios
```

## 📚 Full Documentation

- [IOS_SETUP.md](file:///e:/WebPtit/Mobile2/beat_saber-main/IOS_SETUP.md) - Detailed macOS setup guide
- [walkthrough.md](file:///C:/Users/ADMIN/.gemini/antigravity/brain/cd4fbe1d-b206-4d5d-8992-5ec223ae4671/walkthrough.md) - Complete walkthrough
- [implementation_plan.md](file:///C:/Users/ADMIN/.gemini/antigravity/brain/cd4fbe1d-b206-4d5d-8992-5ec223ae4671/implementation_plan.md) - Technical plan

## ⚡ Key Performance Settings

| Setting | Value | File |
|---------|-------|------|
| Camera Res | 320x240 | hooks/useMediaPipe.ts |
| Confidence | 0.4 | hooks/useMediaPipe.ts |
| Pixel Ratio | ≤1.5 | App.tsx |
| Target FPS | 45-60 | - |

All configured and ready for Xcode! 🎉
