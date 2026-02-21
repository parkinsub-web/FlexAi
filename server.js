const path = require('path');
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 8080);

// ─── In-memory fallback store (로컬 개발용, MySQL 없을 때 사용) ───
let useMemoryStore = false;
const memoryStore = { items: [], nextId: 1 };

const memQuery = {
  getAll(limit) {
    return [...memoryStore.items]
      .sort((a, b) => b.id - a.id)
      .slice(0, limit);
  },
  insert(name, email, phone, title, message) {
    const id = memoryStore.nextId++;
    const item = {
      id,
      name,
      email: email || null,
      phone: phone || null,
      title,
      message,
      created_at: new Date(),
    };
    memoryStore.items.push(item);
    return id;
  },
};

// ─── MySQL 설정 ───
let pool = null;

const isTruthy = (value) => {
  if (value == null) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const buildPoolConfig = () => {
  const mysql = require('mysql2/promise');
  const cloudSqlConnectionName =
    process.env.INSTANCE_CONNECTION_NAME || process.env.CLOUD_SQL_CONNECTION_NAME;

  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0,
    charset: 'utf8mb4',
    connectTimeout: 5000,
  };

  if (cloudSqlConnectionName) {
    const socketBase = process.env.DB_SOCKET_PATH || '/cloudsql';
    config.socketPath = path.posix.join(socketBase, cloudSqlConnectionName);
  } else {
    config.host = process.env.DB_HOST || '127.0.0.1';
    config.port = Number(process.env.DB_PORT || 3306);
  }

  if (isTruthy(process.env.DB_SSL)) {
    const ssl = {};
    const sslCa = process.env.DB_SSL_CA;
    if (sslCa) ssl.ca = sslCa.replace(/\\n/g, '\n');
    config.ssl = ssl;
  }

  return mysql.createPool(config);
};

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

// ─── 미들웨어 ───
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

// ─── API: 문의 목록 조회 ───
app.get('/api/inquiries', async (req, res) => {
  const requested = Number.parseInt(req.query.limit || '20', 10);
  const limit = Number.isNaN(requested) ? 20 : Math.max(1, Math.min(100, requested));

  try {
    if (useMemoryStore) {
      const items = memQuery.getAll(limit).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        title: row.title,
        message: row.message,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      }));
      return res.json({ ok: true, items });
    }

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

// ─── API: 문의 등록 ───
app.post('/api/inquiries', async (req, res) => {
  const name    = String(req.body?.name    || '').trim().slice(0, 60);
  const email   = String(req.body?.email   || '').trim().slice(0, 120);
  const phone   = String(req.body?.phone   || '').trim().slice(0, 30);
  const title   = String(req.body?.title   || '').trim().slice(0, 150);
  const message = String(req.body?.message || '').trim().slice(0, 2000);

  if (!name || !title || !message) {
    return res.status(400).json({
      ok: false,
      error: '이름, 제목, 문의 내용을 모두 입력해주세요.',
    });
  }

  try {
    if (useMemoryStore) {
      const id = memQuery.insert(name, email, phone, title, message);
      return res.status(201).json({ ok: true, id });
    }

    const [result] = await pool.execute(
      `INSERT INTO inquiries (name, email, phone, title, message) VALUES (?, ?, ?, ?, ?)`,
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

// ─── 서버 시작 ───
const bootstrap = async () => {
  const hasDbEnv = process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME;

  if (hasDbEnv) {
    try {
      pool = buildPoolConfig();
      await pool.query('SELECT 1');
      await ensureTable();
      console.log('✅ MySQL 연결 성공');
    } catch (error) {
      console.warn(`⚠️  MySQL 연결 실패 (${error.code || error.message})`);
      console.warn('   → In-memory 모드로 전환합니다. (데이터는 서버 재시작 시 초기화됩니다)');
      pool = null;
      useMemoryStore = true;
    }
  } else {
    console.warn('⚠️  DB 환경변수 미설정 → In-memory 모드로 실행합니다.');
    useMemoryStore = true;
  }

  app.listen(PORT, () => {
    const mode = useMemoryStore ? '[In-memory 로컬 모드]' : '[MySQL 연결됨]';
    console.log(`🚀 서버 시작: http://localhost:${PORT}  ${mode}`);
  });
};

bootstrap();
