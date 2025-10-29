const request = require('supertest');
const express = require('express');
const session = require('express-session');
const authRoutes = require('../routes/auth');

// 模擬資料庫
jest.mock('../config/database', () => ({
  query: jest.fn(),
  getOne: jest.fn(),
  transaction: jest.fn(),
}));

const { getOne, query } = require('../config/database');

describe('Auth API Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    app.use('/api/auth', authRoutes);
    
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('應該拒絕空的使用者名稱', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: 'test123' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('應該拒絕不存在的使用者', async () => {
      getOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'test123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('使用者名稱或密碼錯誤');
    });

    it('應該拒絕被停用的帳號', async () => {
      getOne.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password_hash: '$2a$10$test',
        is_active: false,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'test123' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('停用');
    });

    it('應該拒絕被鎖定的帳號', async () => {
      const futureDate = new Date(Date.now() + 600000);
      getOne.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password_hash: '$2a$10$test',
        is_active: true,
        locked_until: futureDate,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'test123' });

      expect(response.status).toBe(423);
      expect(response.body.error).toContain('鎖定');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('應該成功登出', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('登出成功');
    });
  });

  describe('GET /api/auth/status', () => {
    it('未登入時應該返回未認證', async () => {
      const response = await request(app)
        .get('/api/auth/status');

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(false);
    });
  });
});
