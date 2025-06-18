// tests/unit/models/RoundingValue.test.js
const RoundingValue = require('../../../models/RoundingValue');
const db = require('../../../config/db'); // Import the db module to mock it

// Mock the entire db module
jest.mock('../../../config/db', () => ({
  query: jest.fn(), // Mock the query method
}));

describe('RoundingValue Model', () => {
  let tenantId;
  let consoleErrorSpy;

  beforeEach(() => {
    // Clear all mock calls before each test to ensure isolation
    jest.clearAllMocks();
    tenantId = 'testTenant123';

    // Spy on console.error to suppress output during tests, but can be checked if needed
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error to its original implementation after each test
    consoleErrorSpy.mockRestore();
  });

  // --- Create Method ---
  describe('create', () => {
    it('should create a new rounding value record', async () => {
      const roundingValueData = {
        rounding_below: 100,
        rounding_digit: 1, // Corresponds to a rounding_type ID
      };
      const expectedRecord = {
        id: 1,
        rounding_below: 100,
        rounding_digit: 1,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock the db.query to return the expected new record
      db.query.mockResolvedValueOnce({ rows: [expectedRecord] });

      const result = await RoundingValue.create(roundingValueData, tenantId);

      // Verify db.query was called with the correct SQL and values
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO rounding_value'),
        [roundingValueData.rounding_below, roundingValueData.rounding_digit, tenantId]
      );
      expect(result).toEqual(expectedRecord);
    });

    it('should handle database errors during creation', async () => {
      const roundingValueData = {
        rounding_below: 100,
        rounding_digit: 1,
      };
      const error = new Error('Database insertion failed');
      db.query.mockRejectedValueOnce(error); // Simulate a database error

      await expect(RoundingValue.create(roundingValueData, tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // The model just re-throws, it doesn't log internally
    });
  });

  // --- FindAll Method ---
  describe('findAll', () => {
    it('should retrieve all rounding value records for a tenant', async () => {
      const expectedRecords = [
        {
          id: 1,
          rounding_below: 100,
          rounding_digit: 1,
          tenant_id: tenantId,
          rounding_digit_description: 'Nearest 100',
          rounding_number: 100
        },
        {
          id: 2,
          rounding_below: 50,
          rounding_digit: 2,
          tenant_id: tenantId,
          rounding_digit_description: 'Nearest 50',
          rounding_number: 50
        },
      ];

      db.query.mockResolvedValueOnce({ rows: expectedRecords });

      const result = await RoundingValue.findAll(tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT rv.*, rt.rounding_digit AS rounding_digit_description, rt.rounding_number FROM rounding_value rv JOIN rounding_type rt ON rv.rounding_digit = rt.id AND rt.tenant_id = $1 WHERE rv.tenant_id = $1 ORDER BY rv.rounding_below ASC;'),
        [tenantId]
      );
      expect(result).toEqual(expectedRecords);
    });

    it('should return an empty array if no records are found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await RoundingValue.findAll(tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should handle database errors during retrieval', async () => {
      const error = new Error('Database retrieval failed');
      db.query.mockRejectedValueOnce(error);

      await expect(RoundingValue.findAll(tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // --- findByRoundingBelow Method ---
  describe('findByRoundingBelow', () => {
    it('should retrieve a rounding value record by rounding_below value', async () => {
      const roundingBelow = 100;
      const expectedRecord = {
        id: 1,
        rounding_below: 100,
        rounding_digit: 1,
        tenant_id: tenantId,
        rounding_digit_description: 'Nearest 100',
        rounding_number: 100
      };

      db.query.mockResolvedValueOnce({ rows: [expectedRecord] });

      const result = await RoundingValue.findByRoundingBelow(roundingBelow, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT rv.*, rt.rounding_digit AS rounding_digit_description, rt.rounding_number FROM rounding_value rv JOIN rounding_type rt ON rv.rounding_digit = rt.id AND rt.tenant_id = $2 WHERE rv.rounding_below = $1 AND rv.tenant_id = $2;'),
        [roundingBelow, tenantId]
      );
      expect(result).toEqual(expectedRecord);
    });

    it('should return null if no record is found by rounding_below value', async () => {
      const roundingBelow = 999; // Non-existent
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await RoundingValue.findByRoundingBelow(roundingBelow, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle database errors during retrieval by rounding_below', async () => {
      const roundingBelow = 100;
      const error = new Error('Database retrieval failed');
      db.query.mockRejectedValueOnce(error);

      await expect(RoundingValue.findByRoundingBelow(roundingBelow, tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // --- Update Method ---
  describe('update', () => {
    it('should update an existing rounding value record', async () => {
      const originalRoundingBelow = 100;
      const newData = { rounding_digit: 2 }; // Update to a different rounding_digit
      const updatedRecord = {
        id: 1,
        rounding_below: 100,
        rounding_digit: 2,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      db.query.mockResolvedValueOnce({ rows: [updatedRecord] });

      const result = await RoundingValue.update(originalRoundingBelow, newData, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE rounding_value SET rounding_digit = $2 WHERE rounding_below = $1 AND tenant_id = $3 RETURNING *;'),
        [originalRoundingBelow, newData.rounding_digit, tenantId]
      );
      expect(result).toEqual(updatedRecord);
    });

    it('should return null if the record to update is not found', async () => {
      const originalRoundingBelow = 999;
      const newData = { rounding_digit: 2 };
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await RoundingValue.update(originalRoundingBelow, newData, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle database errors during update', async () => {
      const originalRoundingBelow = 100;
      const newData = { rounding_digit: 2 };
      const error = new Error('Database update failed');
      db.query.mockRejectedValueOnce(error);

      await expect(RoundingValue.update(originalRoundingBelow, newData, tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // --- Delete Method ---
  describe('delete', () => {
    it('should delete a rounding value record', async () => {
      const roundingBelowToDelete = 100;
      const deletedRecord = {
        id: 1,
        rounding_below: 100,
        rounding_digit: 1,
        tenant_id: tenantId,
      };

      db.query.mockResolvedValueOnce({ rows: [deletedRecord] });

      const result = await RoundingValue.delete(roundingBelowToDelete, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM rounding_value WHERE rounding_below = $1 AND tenant_id = $2 RETURNING *;'),
        [roundingBelowToDelete, tenantId]
      );
      expect(result).toEqual(deletedRecord);
    });

    it('should return null if the record to delete is not found', async () => {
      const roundingBelowToDelete = 999;
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await RoundingValue.delete(roundingBelowToDelete, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle database errors during deletion', async () => {
      const roundingBelowToDelete = 100;
      const error = new Error('Database deletion failed');
      db.query.mockRejectedValueOnce(error);

      await expect(RoundingValue.delete(roundingBelowToDelete, tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // --- getApplicableRoundingRule Method ---
  describe('getApplicableRoundingRule', () => {
    it('should retrieve the applicable rounding rule for a given amount', async () => {
      const amount = 75;
      const expectedRule = {
        rounding_type_id: 1,
        rounding_digit_description: 'Nearest 100',
        rounding_number: 100,
      };

      // Mock a scenario where 75 is below 100, and 100 is the smallest `rounding_below` greater than amount
      db.query.mockResolvedValueOnce({ rows: [expectedRule] });

      const result = await RoundingValue.getApplicableRoundingRule(amount, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT rv.rounding_digit AS rounding_type_id, rt.rounding_digit AS rounding_digit_description, rt.rounding_number FROM rounding_value rv JOIN rounding_type rt ON rv.rounding_digit = rt.id AND rt.tenant_id = $2 WHERE $1 < rv.rounding_below AND rv.tenant_id = $2 ORDER BY rv.rounding_below ASC LIMIT 1;'),
        [amount, tenantId]
      );
      expect(result).toEqual(expectedRule);
    });

    it('should return null if no applicable rule is found (amount is too high)', async () => {
      const amount = 500; // No rounding_below is greater than this
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await RoundingValue.getApplicableRoundingRule(amount, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle database errors during applicable rule retrieval', async () => {
      const amount = 75;
      const error = new Error('Database rule retrieval failed');
      db.query.mockRejectedValueOnce(error);

      await expect(RoundingValue.getApplicableRoundingRule(amount, tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });
});