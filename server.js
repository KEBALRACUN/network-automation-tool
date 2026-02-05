require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

let db;
const client = new MongoClient(process.env.MONGODB_URI);

async function connectDB() {
    try {
        await client.connect();
        db = client.db('network_db');
        console.log("✅ MongoDB Connected!");
    } catch (e) {
        console.error("❌ DB Error:", e);
    }
}
connectDB();

// API untuk Form Web
app.post('/api/deploy', async (req, res) => {
    try {
        const { deviceIp, brand, pppoeUser, pppoePass } = req.body;
        const script = brand === 'MikroTik' 
            ? `/interface pppoe-client add user="${pppoeUser}" password="${pppoePass}" name=pppoe-out1 interface=ether1 disabled=no`
            : `SET_ONT_PPPOE_USER=${pppoeUser}`;

        await db.collection('tasks').insertOne({
            deviceIp, script, status: 'pending', createdAt: new Date()
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API untuk Agent Lokal
app.get('/api/get-task', async (req, res) => {
    try {
        const task = await db.collection('tasks').findOne({ status: 'pending' });
        if (!task) return res.status(404).json({ msg: "Kosong" });
        
        // Tandai sedang diproses agar tidak diambil agent lain
        await db.collection('tasks').updateOne({ _id: task._id }, { $set: { status: 'processing' } });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log("🚀 Server: http://localhost:3000"));
}