const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 8080);

const poolConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
};

if (process.env.INSTANCE_CONNECTION_NAME) {
  const socketBase = process.env.DB_SOCKET_PATH || '/cloudsql';
  poolConfig.socketPath = path.posix.join(socketBase, process.env.INSTANCE_CONNECTION_NAME);
} else {
  poolConfig.host = process.env.DB_HOST || '127.0.0.1';
  poolConfig.port = Number(process.env.DB_PORT || 3306);
}

const requiredEnv = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required env vars: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const pool = mysql.createPool(poolConfig);

const ensureTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS inquiries (
      id BIGINT NOT NULL AUTO_INCREMENT,
      name VARCHAR(60) NOT NULL,
      email VARCHAR(120) NULL,
      phone VARCHAR(30) NULL,
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_inquiries_created_at (created_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
};

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/api/inquiries', async (req, res) => {
  const requested = Number.parseInt(req.query.limit || '20', 10);
  const limit = Number.isNaN(requested) ? 20 : Math.max(1, Math.min(100, requested));

  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, title, message, created_at
       FROM inquiries
       ORDER BY created_at DESC
       LIMIT ${limit}`
    );

    res.json({
      ok: true,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        title: row.title,
        message: row.message,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch inquiries:', error);
    res.status(500).json({ ok: false, error: '문의 목록 조회 중 오류가 발생했습니다.' });
  }
});

app.post('/api/inquiries', async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 60);
  const email = String(req.body?.email || '').trim().slice(0, 120);
  const phone = String(req.body?.phone || '').trim().slice(0, 30);
  const title = String(req.body?.title || '').trim().slice(0, 150);
  const message = String(req.body?.message || '').trim().slice(0, 2000);

  if (!name || !title || !message) {
    return res.status(400).json({
      ok: false,
      error: '이름, 제목, 문의 내용을 모두 입력해주세요.',
    });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO inquiries (name, email, phone, title, message)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email || null, phone || null, title, message]
    );

    return res.status(201).json({ ok: true, id: result.insertId });
  } catch (error) {
    console.error('Failed to create inquiry:', error);
    return res.status(500).json({ ok: false, error: '문의 등록 중 오류가 발생했습니다.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const bootstrap = async () => {
  try {
    await ensureTable();
    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server bootstrap failed:', error);
    process.exit(1);
  }
};

bootstrap();
