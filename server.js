require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();

// Middleware untuk membaca JSON dan melayani folder 'public'
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;
const client = new MongoClient(process.env.MONGODB_URI);

// Fungsi Koneksi Database (Singleton)
async function connectDB() {
    if (!db) {
        try {
            await client.connect();
            db = client.db('network_db');
            console.log("✅ MongoDB Terhubung, Jing!");
        } catch (e) {
            console.error("❌ Gagal Konek MongoDB:", e);
        }
    }
    return db;
}

// --- ROUTES ---

// 1. Halaman Utama (Mencegah "Cannot GET /")
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. API: Simpan Tugas dari Form Web ke MongoDB
app.post('/api/deploy', async (req, res) => {
    try {
        const database = await connectDB();
        const { deviceIp, brand, pppoeUser, pppoePass } = req.body;

        // Logika pembuatan script berdasarkan brand
        const script = brand === 'MikroTik' 
            ? `/interface pppoe-client add user="${pppoeUser}" password="${pppoePass}" name=pppoe-out1 interface=ether1 disabled=no`
            : `SET_ONT_CONFIG_USER=${pppoeUser}_PASS=${pppoePass}`;

        const task = {
            deviceIp,
            brand,
            script,
            status: 'pending',
            createdAt: new Date()
        };

        const result = await database.collection('tasks').insertOne(task);
        res.status(200).json({ success: true, id: result.insertedId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. API: Diambil oleh Agent Lokal
app.get('/api/get-task', async (req, res) => {
    try {
        const database = await connectDB();
        
        // Cari 1 tugas tertua yang statusnya masih 'pending'
        const task = await database.collection('tasks').findOne({ status: 'pending' });

        if (!task) {
            return res.status(404).json({ message: "Antrean Kosong" });
        }

        // Update status agar tidak diambil agent lain (jika agent lebih dari satu)
        await database.collection('tasks').updateOne(
            { _id: task._id },
            { $set: { status: 'processing' } }
        );

        res.status(200).json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- EXPORT UNTUK VERCEL ---
module.exports = app;

// Jalankan server lokal jika bukan di lingkungan production (Vercel)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Server lokal jalan di http://localhost:${PORT}`);
    });
}