/**
 * Nama cookie auth, sengaja dipisah dari libs/session.ts.
 *
 * session.ts memuat `import "server-only"` karena memakai firebase-admin, jadi
 * client component tidak boleh mengimpor apa pun dari sana. File ini hanya
 * berisi konstanta, sehingga aman dipakai kedua sisi.
 */

export const SESSION_COOKIE = "__session"

/**
 * Penanda yang bisa dibaca JavaScript, berisi uid pemilik session cookie.
 *
 * Cookie session sendiri httpOnly sehingga client tidak bisa tahu apakah server
 * sudah mengenalinya. Tanpa penanda ini, setiap page load harus memanggil
 * /api/auth/session dulu sebelum UI berani menampilkan status login — satu
 * round-trip yang terasa di setiap navigasi. Isinya hanya uid, bukan rahasia:
 * memalsukannya tidak memberi akses apa pun karena otorisasi tetap bersandar
 * pada session cookie httpOnly yang diverifikasi di server.
 */
export const SESSION_HINT_COOKIE = "notify_uid"

/** 5 hari, dalam milidetik — batas maksimum session cookie Firebase adalah 14 hari */
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000
