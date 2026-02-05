require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

let db;
MongoClient.connect(process.env.MONGODB_URI)
    .then(client => {
        db = client.db('network_db');
        console.log("✅ MongoDB Terhubung!");
    }).catch(err => console.error("❌ Gagal DB:", err));

// API Kirim Data dari Web
app.post('/api/deploy', async (req, res) => {
    const { deviceIp, brand, pppoeUser, pppoePass } = req.body;
    const script = brand === 'MikroTik' 
        ? `/interface pppoe-client add user="${pppoeUser}" password="${pppoePass}" name=pppoe-out1 interface=ether1 disabled=no`
        : `SET_ONT_USER_${pppoeUser}`;

    await db.collection('tasks').insertOne({ deviceIp, script, status: 'pending', createdAt: new Date() });
    res.json({ success: true });
});

// API untuk dibaca oleh Agent Lokal
app.get('/api/get-task', async (req, res) => {
    const task = await db.collection('tasks').findOne({ status: 'pending' });
    task ? res.json(task) : res.status(404).json({ msg: "Kosong" });
});

module.exports = app; // Penting untuk Vercel
const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => console.log(`🚀 Jalan di http://localhost:${port}`));
}