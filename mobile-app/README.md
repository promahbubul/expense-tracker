# Expense Tracker Mobile

Mobile app for the same NestJS backend. It uses a compact mobile-first UI with bottom navigation.

## Run

```bash
cd mobile-app
npm install
cp .env.example .env
npm run start:lan
```

Set `EXPO_PUBLIC_API_URL` to your backend API. For Android emulator, use your machine IP or `http://10.0.2.2:4000/api`.
The current app also auto-resolves `http://localhost:4000/api` for Android emulator and Expo LAN dev mode.

## Expo Go QR Troubleshooting

If Expo Go shows `Failed to download remote update`, the phone cannot download the Metro bundle.

Try these in order:

1. Keep phone and computer on the same Wi-Fi.
2. Run LAN mode:

```bash
npm run start:lan
```

3. If LAN fails, run tunnel mode:

```bash
npm run start:tunnel
```

4. Allow Node.js/Expo through Windows Firewall.
5. Clear Expo Go app cache and scan the new QR code.
6. If LAN auto-resolution still fails on a physical phone, set `EXPO_PUBLIC_API_URL` to your computer IP, like `http://192.168.0.105:4000/api`.
