// __tests__/models/CashDenomination.test.js
const CashDenomination = require('../../models/CashDenomination');
const db = require('../../config/db'); // Import the actual db module to mock it

// Mock the db module
jest.mock('../../config/db', () => ({
  query: jest.fn(), // Mock the query function
}));

describe('CashDenomination Model', () => {
  // Clear all mocks before each test to ensure a clean slate
  beforeEach(() => {
    db.query.mockClear();
  });

  describe('findAll', () => {
    test('should retrieve all cash denominations from the database', async () => {
      // Define mock data that db.query will return
      const mockDenominations = [
        { id: 1, value: 1000 },
        { id: 2, value: 2000 },
        { id: 3, value: 5000 },
      ];

      // Configure the mocked db.query to return our mock data
      db.query.mockResolvedValueOnce({ rows: mockDenominations });

      // Call the method being tested
      const denominations = await CashDenomination.findAll();

      // Assertions
      // 1. Ensure db.query was called
      expect(db.query).toHaveBeenCalledTimes(1);

      // 2. Ensure db.query was called with the correct SQL query
      expect(db.query).toHaveBeenCalledWith('SELECT id, value FROM cash_denominations');

      // 3. Ensure the method returns the expected mock data
      expect(denominations).toEqual(mockDenominations);
    });

    test('should return an empty array if no cash denominations are found', async () => {
      // Configure the mocked db.query to return an empty array for rows
      db.query.mockResolvedValueOnce({ rows: [] });

      // Call the method being tested
      const denominations = await CashDenomination.findAll();

      // Assertions
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith('SELECT id, value FROM cash_denominations');
      expect(denominations).toEqual([]);
    });

    test('should handle database errors gracefully', async () => {
      // Simulate a database error by rejecting the promise from db.query
      const errorMessage = 'Database connection error';
      db.query.mockRejectedValueOnce(new Error(errorMessage));

      // Use try...catch to check if the error is propagated
      await expect(CashDenomination.findAll()).rejects.toThrow(errorMessage);

      // Ensure db.query was still called
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith('SELECT id, value FROM cash_denominations');
    });
  });
});
