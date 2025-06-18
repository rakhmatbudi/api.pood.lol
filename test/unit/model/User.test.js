// tests/unit/models/User.test.js
const User = require('../../../models/User');
const db = require('../../../config/db'); // Import the db module to mock it
const bcrypt = require('bcrypt'); // Import bcrypt to mock it

// Mock the entire db module
jest.mock('../../../config/db', () => ({
  query: jest.fn(),
}));

// Mock the bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('User Model', () => {
  let tenantId;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mock calls before each test
    tenantId = 'testTenant123';

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // --- FindAll Method ---
  describe('findAll', () => {
    it('should retrieve all users for a specific tenant without filters', async () => {
      const expectedUsers = [
        { id: 'user1', name: 'User One', email: 'user1@example.com', role_id: 1, tenant_id: tenantId },
        { id: 'user2', name: 'User Two', email: 'user2@example.com', role_id: 2, tenant_id: tenantId },
      ];
      db.query.mockResolvedValueOnce({ rows: expectedUsers });

      const result = await User.findAll(tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, name, email, created_at, updated_at, role_id FROM public.users WHERE tenant_id = $1 ORDER BY id',
        [tenantId]
      );
      expect(result).toEqual(expectedUsers);
    });

    it('should retrieve users filtered by a single role ID', async () => {
      const expectedUsers = [
        { id: 'user1', name: 'User One', email: 'user1@example.com', role_id: 1, tenant_id: tenantId },
      ];
      const filter = { role: 1 };
      db.query.mockResolvedValueOnce({ rows: expectedUsers });

      const result = await User.findAll(tenantId, filter);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, name, email, created_at, updated_at, role_id FROM public.users WHERE tenant_id = $1 AND role_id = $2 ORDER BY id',
        [tenantId, filter.role]
      );
      expect(result).toEqual(expectedUsers);
    });

    it('should retrieve users filtered by multiple role IDs', async () => {
      const expectedUsers = [
        { id: 'user2', name: 'User Two', email: 'user2@example.com', role_id: 2, tenant_id: tenantId },
        { id: 'user3', name: 'User Three', email: 'user3@example.com', role_id: 3, tenant_id: tenantId },
      ];
      const filter = { roles: [2, 3] };
      db.query.mockResolvedValueOnce({ rows: expectedUsers });

      const result = await User.findAll(tenantId, filter);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, name, email, created_at, updated_at, role_id FROM public.users WHERE tenant_id = $1 AND role_id IN ($2, $3) ORDER BY id',
        [tenantId, ...filter.roles]
      );
      expect(result).toEqual(expectedUsers);
    });

    it('should return an empty array if no users are found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await User.findAll(tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should handle database errors during findAll', async () => {
      const error = new Error('Database find all error');
      db.query.mockRejectedValueOnce(error);

      await expect(User.findAll(tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // --- findByEmail Method ---
  describe('findByEmail', () => {
    it('should find a user by email and tenant ID', async () => {
      const email = 'test@example.com';
      const expectedUser = {
        id: 'user1',
        name: 'Test User',
        email: email,
        password: 'hashedpassword123',
        role_id: 1,
        tenant_id: tenantId,
      };
      db.query.mockResolvedValueOnce({ rows: [expectedUser] });

      const result = await User.findByEmail(email, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, name, email, password, role_id, tenant_id, created_at, updated_at FROM public.users WHERE email = $1 AND tenant_id = $2',
        [email, tenantId]
      );
      expect(result).toEqual(expectedUser);
    });

    it('should return null if user not found by email and tenant ID', async () => {
      const email = 'nonexistent@example.com';
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await User.findByEmail(email, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle database errors during findByEmail', async () => {
      const email = 'test@example.com';
      const error = new Error('Database findByEmail error');
      db.query.mockRejectedValueOnce(error);

      await expect(User.findByEmail(email, tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // --- findById Method ---
  describe('findById', () => {
    it('should find a user by ID and tenant ID', async () => {
      const userId = 'user1';
      const expectedUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        role_id: 1,
        tenant_id: tenantId,
      };
      db.query.mockResolvedValueOnce({ rows: [expectedUser] });

      const result = await User.findById(userId, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, name, email, role_id, tenant_id, created_at, updated_at FROM public.users WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );
      expect(result).toEqual(expectedUser);
    });

    it('should return null if user not found by ID and tenant ID', async () => {
      const userId = 'nonexistentId';
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await User.findById(userId, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle database errors during findById', async () => {
      const userId = 'user1';
      const error = new Error('Database findById error');
      db.query.mockRejectedValueOnce(error);

      await expect(User.findById(userId, tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // --- verifyPassword Method ---
  describe('verifyPassword', () => {
    it('should return true for matching passwords', async () => {
      const plainPassword = 'mysecretpassword';
      const hashedPassword = 'hashed_mysecretpassword';
      bcrypt.compare.mockResolvedValueOnce(true);

      const result = await User.verifyPassword(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const plainPassword = 'wrongpassword';
      const hashedPassword = 'hashed_mysecretpassword';
      bcrypt.compare.mockResolvedValueOnce(false);

      const result = await User.verifyPassword(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
      expect(result).toBe(false);
    });

    it('should handle errors during password comparison', async () => {
      const plainPassword = 'mysecretpassword';
      const hashedPassword = 'hashed_mysecretpassword';
      const error = new Error('Bcrypt comparison error');
      bcrypt.compare.mockRejectedValueOnce(error);

      await expect(User.verifyPassword(plainPassword, hashedPassword)).rejects.toThrow(error);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });
  });

  // --- Create Method ---
  describe('create', () => {
    const saltRounds = 10;
    const mockHashedPassword = 'some_hashed_password';
    const mockNow = new Date();

    // Mock Date globally to ensure consistent timestamps if needed, or just capture it.
    // For this test, we'll just mock bcrypt.hash to ensure a consistent output.
    beforeEach(() => {
        bcrypt.hash.mockResolvedValue(mockHashedPassword);
        // Optionally mock Date if you need very precise timestamp assertions
        // jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
    });

    // afterEach(() => {
    //     jest.restoreAllMocks(); // Restore Date mock if it was spied on global
    // });


    it('should create a new user with default role_id if not provided', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'securepassword',
      };
      const expectedUser = {
        id: 'newUserId1',
        name: 'New User',
        email: 'newuser@example.com',
        role_id: 2, // Default role
        tenant_id: tenantId,
        created_at: mockNow.toISOString(),
        updated_at: mockNow.toISOString(),
      };

      db.query.mockResolvedValueOnce({ rows: [expectedUser] });

      const result = await User.create(userData, tenantId);

      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, saltRounds);

      expect(db.query).toHaveBeenCalledTimes(1);
      const dbQueryArgs = db.query.mock.calls[0];
      expect(dbQueryArgs[0]).toContain('INSERT INTO public.users');
      expect(dbQueryArgs[0]).toContain('RETURNING id, name, email, role_id, tenant_id, created_at, updated_at');
      expect(dbQueryArgs[1][0]).toBe(userData.name);
      expect(dbQueryArgs[1][1]).toBe(userData.email);
      expect(dbQueryArgs[1][2]).toBe(mockHashedPassword);
      expect(dbQueryArgs[1][3]).toBe(2); // Default role_id
      expect(dbQueryArgs[1][4]).toBe(tenantId);
      expect(dbQueryArgs[1][5]).toBeInstanceOf(Date); // Check if it's a Date object
      expect(dbQueryArgs[1][6]).toBeInstanceOf(Date); // Check if it's a Date object

      expect(result).toEqual({
        ...expectedUser,
        created_at: new Date(expectedUser.created_at), // Adjust for Date object comparison if needed
        updated_at: new Date(expectedUser.updated_at)
      });
    });

    it('should create a new user with a specified role_id', async () => {
      const userData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'adminpassword',
        role_id: 1, // Specified role
      };
      const expectedUser = {
        id: 'newUserId2',
        name: 'Admin User',
        email: 'admin@example.com',
        role_id: 1,
        tenant_id: tenantId,
        created_at: mockNow.toISOString(),
        updated_at: mockNow.toISOString(),
      };

      db.query.mockResolvedValueOnce({ rows: [expectedUser] });

      const result = await User.create(userData, tenantId);

      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, saltRounds);

      expect(db.query).toHaveBeenCalledTimes(1);
      const dbQueryArgs = db.query.mock.calls[0];
      expect(dbQueryArgs[1][3]).toBe(1); // Specified role_id
      expect(result).toEqual({
        ...expectedUser,
        created_at: new Date(expectedUser.created_at),
        updated_at: new Date(expectedUser.updated_at)
      });
    });

    it('should handle database errors during user creation', async () => {
      const userData = {
        name: 'Error User',
        email: 'error@example.com',
        password: 'pwd',
      };
      const error = new Error('Database creation failed');
      db.query.mockRejectedValueOnce(error);

      await expect(User.create(userData, tenantId)).rejects.toThrow(error);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1); // Hashing still happens
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should handle bcrypt hashing errors during user creation', async () => {
        const userData = {
            name: 'Hash Error User',
            email: 'hasherror@example.com',
            password: 'pwd',
        };
        const error = new Error('Bcrypt hashing failed');
        bcrypt.hash.mockRejectedValueOnce(error); // Simulate bcrypt error

        await expect(User.create(userData, tenantId)).rejects.toThrow(error);
        expect(bcrypt.hash).toHaveBeenCalledTimes(1);
        expect(db.query).not.toHaveBeenCalled(); // DB query should not be made if hashing fails
    });
  });

  // --- emailExists Method ---
  describe('emailExists', () => {
    it('should return true if email exists for the tenant', async () => {
      const email = 'existing@example.com';
      db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await User.emailExists(email, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM public.users WHERE email = $1 AND tenant_id = $2',
        [email, tenantId]
      );
      expect(result).toBe(true);
    });

    it('should return false if email does not exist for the tenant', async () => {
      const email = 'nonexistent@example.com';
      db.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await User.emailExists(email, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });

    it('should handle database errors during emailExists check', async () => {
      const email = 'test@example.com';
      const error = new Error('Database emailExists error');
      db.query.mockRejectedValueOnce(error);

      await expect(User.emailExists(email, tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // --- Update Method ---
  describe('update', () => {
    const userId = 'userToUpdate';
    const originalUserData = {
        id: userId,
        name: 'Original Name',
        email: 'original@example.com',
        role_id: 2,
        tenant_id: tenantId,
        created_at: new Date('2024-01-01T10:00:00Z'),
        updated_at: new Date('2024-01-01T10:00:00Z')
    };
    const mockUpdatedDate = new Date('2025-06-18T15:30:00Z'); // Consistent mock date

    beforeEach(() => {
        // Mock Date for predictable updated_at values
        jest.spyOn(global, 'Date').mockImplementation(() => mockUpdatedDate);
        bcrypt.hash.mockResolvedValue('new_hashed_password');
    });

    afterEach(() => {
        jest.restoreAllMocks(); // Restore Date mock
    });

    it('should update user name and email', async () => {
      const newData = { name: 'Updated Name', email: 'updated@example.com' };
      const expectedUpdatedUser = { ...originalUserData, ...newData, updated_at: mockUpdatedDate };
      db.query.mockResolvedValueOnce({ rows: [expectedUpdatedUser] });

      const result = await User.update(userId, newData, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      const dbQueryArgs = db.query.mock.calls[0];
      expect(dbQueryArgs[0]).toContain('UPDATE public.users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4 RETURNING id, name, email, role_id, tenant_id, created_at, updated_at');
      expect(dbQueryArgs[1]).toEqual([newData.name, newData.email, userId, tenantId]);
      expect(result).toEqual(expectedUpdatedUser);
    });

    it('should update user password', async () => {
      const newData = { password: 'newSecurePassword' };
      const expectedUpdatedUser = { ...originalUserData, updated_at: mockUpdatedDate }; // password not returned by RETURNING clause
      db.query.mockResolvedValueOnce({ rows: [expectedUpdatedUser] });

      const result = await User.update(userId, newData, tenantId);

      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith(newData.password, 10); // Default saltRounds is 10

      expect(db.query).toHaveBeenCalledTimes(1);
      const dbQueryArgs = db.query.mock.calls[0];
      expect(dbQueryArgs[0]).toContain('UPDATE public.users SET password = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING id, name, email, role_id, tenant_id, created_at, updated_at');
      expect(dbQueryArgs[1]).toEqual(['new_hashed_password', userId, tenantId]);
      expect(result).toEqual(expectedUpdatedUser);
    });

    it('should update user role_id', async () => {
        const newData = { role_id: 3 };
        const expectedUpdatedUser = { ...originalUserData, role_id: 3, updated_at: mockUpdatedDate };
        db.query.mockResolvedValueOnce({ rows: [expectedUpdatedUser] });

        const result = await User.update(userId, newData, tenantId);

        expect(db.query).toHaveBeenCalledTimes(1);
        const dbQueryArgs = db.query.mock.calls[0];
        expect(dbQueryArgs[0]).toContain('UPDATE public.users SET role_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING id, name, email, role_id, tenant_id, created_at, updated_at');
        expect(dbQueryArgs[1]).toEqual([newData.role_id, userId, tenantId]);
        expect(result).toEqual(expectedUpdatedUser);
    });

    it('should return null if no data is provided for update', async () => {
      const newData = {};
      const result = await User.update(userId, newData, tenantId);

      expect(db.query).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null if the user to update is not found', async () => {
      const nonExistentUserId = 'nonexistent';
      const newData = { name: 'Updated Name' };
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await User.update(nonExistentUserId, newData, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle database errors during update', async () => {
      const newData = { name: 'Updated Name' };
      const error = new Error('Database update error');
      db.query.mockRejectedValueOnce(error);

      await expect(User.update(userId, newData, tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should handle bcrypt hashing errors during password update', async () => {
        const newData = { password: 'newPwd' };
        const error = new Error('Bcrypt hashing failed during update');
        bcrypt.hash.mockRejectedValueOnce(error);

        await expect(User.update(userId, newData, tenantId)).rejects.toThrow(error);
        expect(bcrypt.hash).toHaveBeenCalledTimes(1);
        expect(db.query).not.toHaveBeenCalled(); // DB query should not be made
    });
  });

  // --- Delete Method ---
  describe('delete', () => {
    it('should delete a user record', async () => {
      const userIdToDelete = 'userToDelete';
      const deletedUser = {
        id: userIdToDelete,
        name: 'Deleted User',
        email: 'deleted@example.com',
        role_id: 2,
        tenant_id: tenantId,
      };
      db.query.mockResolvedValueOnce({ rows: [deletedUser] });

      const result = await User.delete(userIdToDelete, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM public.users WHERE id = $1 AND tenant_id = $2 RETURNING id, name, email, role_id, tenant_id',
        [userIdToDelete, tenantId]
      );
      expect(result).toEqual(deletedUser);
    });

    it('should return null if the user to delete is not found', async () => {
      const nonExistentUserId = 'nonexistent';
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await User.delete(nonExistentUserId, tenantId);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should handle database errors during deletion', async () => {
      const userIdToDelete = 'userToDelete';
      const error = new Error('Database deletion error');
      db.query.mockRejectedValueOnce(error);

      await expect(User.delete(userIdToDelete, tenantId)).rejects.toThrow(error);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });
});