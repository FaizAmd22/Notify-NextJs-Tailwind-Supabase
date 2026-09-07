This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Stack

- **Firebase Auth** — login email/password, Google, dan GitHub
- **Cloud Firestore** — koleksi `songs`, `liked_songs`, `users`
- **Cloudinary** — penyimpanan file mp3 dan gambar cover

> Firebase Cloud Storage **tidak** dipakai: sejak 3 Februari 2026 layanan itu
> mewajibkan Blaze plan, sementara project ini berjalan di Spark (gratis).
> Karena itu file media ditaruh di Cloudinary.

## Setup

1. **Firebase** — buat project, lalu:
   - Authentication → aktifkan provider **Email/Password**, **Google**, **GitHub**
   - Firestore Database → buat database (production mode)
   - Project Settings → Service Accounts → *Generate new private key*
   - Tambahkan `localhost` dan domain produksi di Authentication → Settings → Authorized domains
2. **Cloudinary** — daftar akun, ambil `cloud_name`, `api_key`, `api_secret` dari Dashboard.
3. **Environment** — salin `.env.example` jadi `.env.local` lalu isi semua nilainya.
4. **Verifikasi kredensial**:
   ```bash
   npm run check:setup
   ```
5. **Deploy rules & index** (wajib — seluruh otorisasi aplikasi ada di `firestore.rules`;
   tanpa ini setiap operasi Firestore gagal dengan *"Missing or insufficient permissions"*):
   ```bash
   npm run deploy:firebase
   ```
   Memakai service account, jadi tidak butuh `firebase login`.

### Catatan composite index

`firestore.indexes.json` berisi dua index yang **opsional** — tidak ada query di
aplikasi ini yang membutuhkannya.

`getSongsByUserId` dan `getLikedSongs` sengaja hanya memakai `where('userId', ...)`
lalu mengurutkan hasilnya di memori. Menambahkan `.orderBy()` pada query ber-`where`
akan menuntut composite index, dan bila index itu belum ada, Firestore melempar
`FAILED_PRECONDITION` sehingga sidebar dan halaman Liked tampak kosong tanpa pesan
error apa pun. Karena daftar lagu milik satu user selalu kecil, pengurutan di memori
lebih murah daripada biaya setup dan risiko kegagalan senyapnya.

Kalau suatu saat koleksi per user tumbuh besar, kembalikan `.orderBy('createdAt', 'desc')`
pada kedua action itu lalu buat index-nya. `npm run deploy:firebase` akan mencoba
membuatnya; kalau ditolak 403 (service account Firebase Admin SDK memang tidak punya
izin `datastore.indexes.create`), skrip menampilkan tautan pembuatan sekali-klik dari
Firestore. Alternatifnya, beri role **Cloud Datastore Index Admin** ke service account
`firebase-adminsdk-...` di Google Cloud Console → IAM.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
