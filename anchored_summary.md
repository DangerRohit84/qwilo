# Qwilo Project Anchored Summary

## Goal
- Build a homework tracking app: students upload homework photos via mobile APK, AI extracts tasks, submit work, answer randomized questions, parents monitor progress.

## Constraints & Preferences
- **Stack**: React Native + Expo (mobile APK), Node.js + Express (server on Render), Groq AI, Supabase PostgreSQL (Prisma), Cloudinary (files)
- **Terminology**: "Homework" not "diary" everywhere
- **Auto-detection**: AI detects subject from content (no predefined list)
- **Question randomization**: Alternate MCQ/Voice per task per student, shuffle options
- **Parent email required** for student registration (not optional)
- **Deployment**: Server on Render, PostgreSQL on Supabase (free tier), APK built locally or via EAS
- **Local APK build**: Needs JDK 21, ANDROID_HOME, Gradle; `gradlew assembleRelease` from `mobile/android/`

## Progress
### Done
- Full system design (architecture, schema, API, routes)
- Backend: Express + Prisma (7 models), JWT, Groq (Vision OCR, LLM parsing, Whisper STT, answer eval), Cloudinary upload, all REST routes (auth, student 15+, parent 3+)
- Mobile: Auth (login/register + role picker, eye toggle), student dashboard, homework upload, task detail + submission, questions (MCQ/Voice), progress (calendar + presets + stats), review, parent dashboard + child drill-down + session detail
- Routing: Expo Router with splash → auth guard → tabs
- Theme: Dark/Light via `ThemeContext`, animated toggle button, floating rounded tab bar, all screens theme-aware
- Background queue: In-memory FIFO, returns immediately, async processing, client polls every 5s
- Duplicate handling: submit skips if exists, question gen skips if already generated
- Answer feedback: Wrong MCQ shows correct answer + explanation; Voice shows score + correct answer + improvement
- Review screen: All questions with correct answers highlighted, scores for voice
- Progress: Calendar with theme-aware `key={theme}` remount, date presets, stat cards, subject breakdown, task list
- Profile: User info + logout with ConfirmModal
- Parent screens: Child list with performance badges, progress with calendar/presets, session detail
- All screens theme-aware with warm indigo → logo deep navy/teal/sky blue palette
- Logo integration: `logo.png` (icon) and `logo_with_name_qwilo.png` (splash + brand)
- Parent email required: Frontend/backend blocks student registration without it
- Auth redirect fix: Uses `result.user.role` from API, not `form.role`
- 401 interceptor: Clears both auth_token and auth_user to prevent splash redirect loop
- Storage error handling: `persistAuth()` wraps in try-catch
- Inline errors: Red text above email, red border on inputs, clears on change
- API timeout: Decreased to 15s from 60s
- EAS project created, `app.json` configured, Supabase schema synced, Render deployed
- TypeScript errors fixed, Eye toggle fixed
- Test users created: Parent `parent@test.com`, Student `student2@test.com` (both pass `test123`)
- Server health endpoint returns `{"status":"ok"}` locally
- Supabase pooler connection fixed (aws-1, not aws-0); `DIRECT_URL` in Prisma config
- Login works on emulator against live server; pre-warm health check added
- **Switched to `@react-native-vector-icons/ionicons` v13.1.2**: From deprecated `@expo/vector-icons`. All 16 imports updated. Font auto-copied by build.gradle. Explicit `ExpoFontLoader.loadAsync('Ionicons', 'asset:///fonts/Ionicons.ttf')` in `_layout.tsx`
- **Icons visible in APK**: Fixed — user confirmed icons render correctly now
- **Back button crash fixed**: All 5 back buttons changed from `typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push(...)` to plain `router.back()`. On React Native mobile, `window` exists but `window.history` is `undefined`, causing `.length` to crash.
- **Camera/Gallery not working — fixed**: Missing `expo-file-system` dependency caused `Module 'expo.modules.interfaces.filesystem.AppDirectories' not found` error. Installed `expo-file-system@18.0.12`.
- **Android 16 permission bug — patched**: `ensureCameraPermissionsAreGranted()` in `ImagePickerModule.kt` always called `askForPermissions()` even when `CAMERA` was already granted. On Android 16 (Sep 2025 security patch) this fails with "No requestable permission in the request." Added `ContextCompat.checkSelfPermission()` check before requesting — if already granted, the function resumes immediately.
- **Code simplified**: Removed redundant JS-side `requestCameraPermissionsAsync()` / `requestMediaLibraryPermissionsAsync()` calls (native `launchCameraAsync` handles permissions). Removed `allowsEditing: true` (avoids crop activity complexity). Removed explicit `mediaTypes: ['images']` (default). Wrapped calls in try-catch with user-friendly error Alerts.
- **Icon padding regenerated — attempt 1 (15%)**: `icon_1024.png` had zero padding. Regenerated both `icon_1024.png` and `foreground.png` with 15% padding using `sharp`. Content area: ~18.9% of foreground. User reported "no same as last one" — no visible difference.
- **Icon padding regenerated — attempt 2 (30%)**: Increased padding to 30% using `sharp`. Content area: ~6.4% of foreground (confirmed in APK: xxxhdpi foreground has 6.4% non-white pixels). This is a ~3x reduction from previous attempt.
- **APK rebuilt**: With 30% padding icon. APK size: 89.4 MB.

### In Progress
- **App launcher icon still looks "full"/zoomed**: User reports icon appears too large/zoomed. Previous 15% padding produced ~19% content area with no visible change (likely cached). Current 30% padding = ~6.4% content area. If still no visible difference after uninstall + reinstall, likely emulator launcher cache issue.

### Blocked
- **Icon cache on emulator**: Emulator launcher may cache old icon even after APK reinstall. User should uninstall app completely, then install new APK fresh. If icon still appears "full" after that, root cause may be elsewhere (e.g., icon background blending with launcher background).

## Key Decisions
- **PostgreSQL over MongoDB**: Faster relational queries, Prisma nested includes, JOINs
- **Supabase over Neon**: Always-on free tier; IPv6 limitation resolved via shared pooler
- **Groq AI for all AI**: Single key, fast Vision + LLM + Whisper
- **Cloudinary for files**: Server-side upload via streamifier
- **Background queue over sync**: In-memory FIFO; scalable to Redis later
- **Stack + Tabs hybrid routing**: Expo Router pattern
- **Custom inline errors over Alert.alert**: Cross-platform, no popup blocking
- **Local APK build**: Via `gradlew assembleRelease` with JDK 21, Gradle 8.10.2, Expo SDK 52
- **`.env` NOT committed**: Secrets set on Render dashboard
- **`@react-native-vector-icons/ionicons` over `@expo/vector-icons`**: Official Expo migration; per-icon package auto-handles font copying
- **Dynamic import over static**: Metro 0.81.5 can't resolve `/static` subpath exports
- **Direct `ExpoFontLoader.loadAsync` call**: Bypasses JS asset system
- **Patched native `ImagePickerModule.kt`**: Added `checkSelfPermission()` guard before `askForPermissions()` to fix Android 16 permission re-request crash
- **Icon padding strategy**: 30% padding using `sharp` with `fit: 'contain'` to center logo on 1024×1024 canvas
- **Prebuild after icon changes**: Required to sync updated `foreground.png` / `icon_1024.png` into Android `mipmap-*` resources

## Next Steps
1. Uninstall app completely from emulator, install new APK to clear launcher icon cache
2. If icon still looks "full" after fresh install, try changing icon background from white to a contrasting color
3. If all else fails, consider a completely different icon design (e.g., a simpler vector shape)
4. Push final code changes to GitHub
5. Redeploy Render if not already done

## Critical Context
- **Supabase pooler**: `aws-1-ap-south-1.pooler.supabase.com:6543` — project on `aws-1`, not `aws-0`. Username: `postgres.ggzabosatkbzdainkagp`.
- **Server DATABASE_URL**: `postgresql://postgres.ggzabosatkbzdainkagp:[REDACTED]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`
- **Server DIRECT_URL**: `postgresql://postgres:[REDACTED]@db.ggzabosatkbzdainkagp.supabase.co:5432/postgres?sslmode=require`
- **Render server URL**: `https://qwilo.onrender.com` — cold start up to 30s. Health endpoint at `/api/health`.
- **Mobile API URL**: `https://qwilo.onrender.com/api`
- **Login confirmed working**: Auth flow against live server works on emulator
- **Test accounts**: Parent `parent@test.com`, Student `student2@test.com` (both pass `test123`)
- **Local APK build**: JDK 21 at `C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`; ANDROID_HOME at `$env:LOCALAPPDATA\Android\Sdk`; Gradle 8.10.2; Expo SDK 52; React Native 0.76.9
- **Camera/Gallery now working**: After installing `expo-file-system@18.0.12` and patching `ImagePickerModule.kt` to avoid Android 16 permission re-request crash
- **Back button crash fixed**: All 5 instances changed from `window.history.length` check to `router.back()`
- **Icon padding — 30%**: Content area ~6.4% in xxxhdpi (192×192). Source: `logo.png` (796×663). Regenerated with `sharp` using `fit: 'contain'`. APK verified: `res/-6.webp` (foreground) has 6.4% non-white pixels.
- **`local.properties`**: Deleted by `npx expo prebuild`, must recreate at `D:\Qwilo\mobile\android\local.properties` with `sdk.dir=C:\\Users\\Rohit\\AppData\\Local\\Android\\Sdk`

## Relevant Files
- `D:\Qwilo\mobile\app\_layout.tsx` — Mounts `ExpoFontLoader.loadAsync('Ionicons', 'asset:///fonts/Ionicons.ttf')`
- `D:\Qwilo\mobile\app\(auth)\index.tsx` — Pre-war server via health check
- `D:\Qwilo\mobile\app.json` — Plugins: `expo-router`, `expo-camera`, `expo-image-picker`, `expo-secure-store`, `expo-notifications`, `expo-av`, `expo-asset`; adaptiveIcon with foreground + white background
- `D:\Qwilo\mobile\app\(student)\homework-upload.tsx` — Camera + gallery picker with try-catch, no JS permission requests, uses `launchCameraAsync` / `launchImageLibraryAsync` directly
- `D:\Qwilo\mobile\app\(student)\tasks\[id]\index.tsx` — Gallery picker for work images, same pattern as homework-upload
- `D:\Qwilo\mobile\app\(student)\tasks\[id]\review.tsx` — Back button uses `router.back()`
- `D:\Qwilo\mobile\app\(parent)\sessions\[sessionId].tsx` — Back button uses `router.back()`
- `D:\Qwilo\mobile\app\(parent)\child\[id].tsx` — Back button uses `router.back()`
- `D:\Qwilo\mobile\android\local.properties` — `sdk.dir=C:\\Users\\Rohit\\AppData\\Local\\Android\\Sdk`
- `D:\Qwilo\mobile\node_modules\expo-image-picker\android\src\main\java\expo\modules\imagepicker\ImagePickerModule.kt` — Patched `ensureCameraPermissionsAreGranted()` to check `checkSelfPermission()` before `askForPermissions()`
- `D:\Qwilo\mobile\assets\foreground.png` — 1024×1024 with 30% padding (~716×716 inner area)
- `D:\Qwilo\mobile\assets\icon_1024.png` — 1024×1024 with white background + 30% padding
- `D:\Qwilo\mobile\assets\logo.png` — Source logo 796×663 (landscape rectangle)
- `D:\Qwilo\mobile\services\api.ts` — `timeout: 15000`
