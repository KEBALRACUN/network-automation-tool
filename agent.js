const axios = require('axios');
const { Client } = require('ssh2');

// 1. GANTI LINK INI dengan link Web Vercel kamu!
const API_URL = 'https://network-automation-tool.vercel.app/';

async function eksekusiKeMikrotik(task) {
    const conn = new Client();
    
    console.log(`[LOG] Mencoba konek ke: ${task.deviceIp}`);

    conn.on('ready', () => {
        console.log(`[SSH] Login Berhasil! Menjalankan Script...`);
        conn.exec(task.script, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log(`[DONE] Script sukses dijalankan pada ${task.deviceIp}`);
                conn.end();
                // Opsional: Di sini kamu bisa buat API update status jadi 'success'
            }).on('data', (data) => {
                console.log('[OUTPUT]: ' + data);
            });
        });
    }).on('error', (err) => {
        console.error(`[ERROR] Gagal konek ke ${task.deviceIp}: ${err.message}`);
    }).connect({
        host: task.deviceIp,
        port: 22,
        username: 'admin', // Ganti jika user MikroTik bukan admin
        password: '',      // Ganti jika MikroTik ada passwordnya
        readyTimeout: 10000
    });
}

// Fungsi nge-loop cek database tiap 5 detik
console.log('🚀 Agent Aktif... Menunggu tugas dari Cloud Vercel.');
setInterval(async () => {
    try {
        const res = await axios.get(API_URL);
        if (res.data && res.data.script) {
            console.log(`\n[TASK] Ditemukan tugas baru untuk: ${res.data.deviceIp}`);
            await eksekusiKeMikrotik(res.data);
        }
    } catch (error) {
        // Jika 404 artinya antrean kosong, cuekin aja
        if (error.response && error.response.status !== 404) {
            console.log('[ERROR]: API Vercel bermasalah atau internet mati.');
        }
    }
}, 5000);