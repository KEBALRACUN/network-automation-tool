const axios = require('axios');
const { Client } = require('ssh2');

// GANTI INI PAKAI LINK VERCEL KAMU!
const API_URL = 'https://network-automation-tool-KEBALRACUN.vercel.app/api/get-task';

async function dor(task) {
    const conn = new Client();
    conn.on('ready', () => {
        console.log(`[SSH] Login Sukses ke ${task.deviceIp}`);
        conn.exec(task.script, (err, stream) => {
            if (err) throw err;
            stream.on('close', () => {
                console.log("✅ Settingan Berhasil Ditembak!");
                conn.end();
            });
        });
    }).on('error', (err) => {
        console.log(`❌ Gagal SSH: ${err.message}`);
    }).connect({
        host: task.deviceIp,
        port: 22,
        username: 'admin',
        password: '', // Isi password mikrotik jika ada
        readyTimeout: 5000
    });
}

console.log("🚀 Agent nunggu tugas...");
setInterval(async () => {
    try {
        const res = await axios.get(API_URL);
        console.log(`🎯 Ada tugas untuk ${res.data.deviceIp}!`);
        await dor(res.data);
    } catch (e) {
        // Antrean kosong
    }
}, 5000);