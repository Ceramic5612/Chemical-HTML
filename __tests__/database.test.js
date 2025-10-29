const { query, getOne, getAll, transaction } = require('../config/database');

// 模擬 pg pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('Database Helper Tests', () => {
  describe('query', () => {
    it('應該正確執行查詢', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      require('pg').Pool().query.mockResolvedValue(mockResult);

      const result = await query('SELECT * FROM users WHERE id = $1', [1]);
      expect(result.rows).toEqual([{ id: 1 }]);
      expect(result.rowCount).toBe(1);
    });
  });

  describe('getOne', () => {
    it('應該返回單筆資料', async () => {
      const mockRow = { id: 1, name: 'Test' };
      require('pg').Pool().query.mockResolvedValue({ rows: [mockRow] });

      const result = await getOne('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual(mockRow);
    });

    it('找不到資料時應該返回 null', async () => {
      require('pg').Pool().query.mockResolvedValue({ rows: [] });

      const result = await getOne('SELECT * FROM users WHERE id = $1', [999]);
      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('應該返回所有資料', async () => {
      const mockRows = [{ id: 1 }, { id: 2 }];
      require('pg').Pool().query.mockResolvedValue({ rows: mockRows });

      const result = await getAll('SELECT * FROM users');
      expect(result).toEqual(mockRows);
    });
  });
});
