// tests/unit/models/MenuItem.test.js
const MenuItem = require('../../../models/MenuItem');
const db = require('../../../config/db');
const MenuItemVariant = require('../../../models/MenuItemVariant');

// Mock the db module
jest.mock('../../../config/db', () => ({
    query: jest.fn(),
}));

// Mock the MenuItemVariant module
jest.mock('../../../models/MenuItemVariant', () => ({
    findByMenuItemId: jest.fn(),
}));

describe('MenuItem Model', () => {
    beforeEach(() => {
        // Reset mocks before each test
        db.query.mockClear();
        MenuItemVariant.findByMenuItemId.mockClear();
    });

    const mockTenantId = 'tenant123';

    describe('findAll', () => {
        it('should throw an error if tenantId is not provided', async () => {
            await expect(MenuItem.findAll(undefined)).rejects.toThrow('Tenant ID is required to find all menu items.');
        });

        it('should return all active menu items for a given tenant', async () => {
            const mockMenuItems = [{
                menu_item_id: 'mi1',
                menu_item_name: 'Burger',
                menu_item_description: 'Tasty burger',
                menu_item_price: 10.00,
                menu_item_is_active: true,
                menu_item_image_path: '/images/burger.jpg',
                menu_item_created_at: new Date(),
                menu_item_updated_at: new Date(),
                menu_item_tenant: mockTenantId,
                category_id: 'cat1',
                category_name: 'Main Course',
                category_description: 'Main dishes',
                category_tenant: mockTenantId,
                variants: [],
            }];

            db.query.mockResolvedValueOnce({ rows: mockMenuItems });

            const result = await MenuItem.findAll(mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [mockTenantId, true]);
            expect(result).toEqual([
                {
                    id: 'mi1',
                    name: 'Burger',
                    description: 'Tasty burger',
                    price: 10.00,
                    is_active: true,
                    image_path: '/images/burger.jpg',
                    created_at: mockMenuItems[0].menu_item_created_at,
                    updated_at: mockMenuItems[0].menu_item_updated_at,
                    tenant: mockTenantId,
                    category: {
                        id: 'cat1',
                        name: 'Main Course',
                        description: 'Main dishes',
                        tenant: mockTenantId,
                    },
                    variants: [],
                },
            ]);
        });

        it('should return all menu items (active and inactive) when includeInactive is true', async () => {
            const mockMenuItems = [
                {
                    menu_item_id: 'mi1',
                    menu_item_name: 'Burger',
                    menu_item_description: 'Tasty burger',
                    menu_item_price: 10.00,
                    menu_item_is_active: true,
                    menu_item_image_path: '/images/burger.jpg',
                    menu_item_created_at: new Date(),
                    menu_item_updated_at: new Date(),
                    menu_item_tenant: mockTenantId,
                    category_id: 'cat1',
                    category_name: 'Main Course',
                    category_description: 'Main dishes',
                    category_tenant: mockTenantId,
                    variants: [],
                },
                {
                    menu_item_id: 'mi2',
                    menu_item_name: 'Inactive Soda',
                    menu_item_description: 'Out of stock',
                    menu_item_price: 2.00,
                    menu_item_is_active: false,
                    menu_item_image_path: '/images/soda.jpg',
                    menu_item_created_at: new Date(),
                    menu_item_updated_at: new Date(),
                    menu_item_tenant: mockTenantId,
                    category_id: 'cat2',
                    category_name: 'Drinks',
                    category_description: 'Beverages',
                    category_tenant: mockTenantId,
                    variants: [],
                },
            ];

            db.query.mockResolvedValueOnce({ rows: mockMenuItems });

            const result = await MenuItem.findAll(mockTenantId, true);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [mockTenantId]); // No 'is_active' filter
            expect(result.length).toBe(2);
            expect(result[1].name).toBe('Inactive Soda');
        });

        it('should handle no menu items found gracefully', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const result = await MenuItem.findAll(mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(expect.any(String), [mockTenantId, true]);
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        const mockMenuItemId = 'item1';

        it('should throw an error if tenantId is not provided', async () => {
            await expect(MenuItem.findById(mockMenuItemId, undefined)).rejects.toThrow('Tenant ID is required to find a menu item by ID.');
        });

        it('should return a menu item with variants if found for the given tenant', async () => {
            const mockMenuItemRow = {
                id: mockMenuItemId,
                name: 'Pizza',
                description: 'Delicious pizza',
                price: 15.00,
                is_active: true,
                image_path: '/images/pizza.jpg',
                created_at: new Date(),
                updated_at: new Date(),
                tenant: mockTenantId,
                category_id: 'cat3',
                category_name: 'Italian',
                category_description: 'Italian dishes',
                category_tenant: mockTenantId,
            };
            const mockVariants = [{ id: 'var1', name: 'Small', price: 0 }];

            db.query.mockResolvedValueOnce({ rows: [mockMenuItemRow] });
            MenuItemVariant.findByMenuItemId.mockResolvedValueOnce(mockVariants);

            const result = await MenuItem.findById(mockMenuItemId, mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [mockMenuItemId, mockTenantId]);
            expect(MenuItemVariant.findByMenuItemId).toHaveBeenCalledTimes(1);
            expect(MenuItemVariant.findByMenuItemId).toHaveBeenCalledWith(mockMenuItemId, mockTenantId);
            expect(result).toEqual({ ...mockMenuItemRow, variants: mockVariants });
        });

        it('should return undefined if menu item is not found for the given tenant', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const result = await MenuItem.findById(mockMenuItemId, mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(expect.any(String), [mockMenuItemId, mockTenantId]);
            expect(MenuItemVariant.findByMenuItemId).not.toHaveBeenCalled(); // Should not call variants if no menu item
            expect(result).toBeUndefined();
        });

        it('should return undefined if menu item is found for a different tenant', async () => {
            const mockMenuItemRow = {
                id: mockMenuItemId,
                name: 'Pizza',
                description: 'Delicious pizza',
                price: 15.00,
                is_active: true,
                image_path: '/images/pizza.jpg',
                created_at: new Date(),
                updated_at: new Date(),
                tenant: 'anotherTenant', // Different tenant
                category_id: 'cat3',
                category_name: 'Italian',
                category_description: 'Italian dishes',
                category_tenant: 'anotherTenant',
            };

            // The query itself handles tenant filtering, so if the tenantId doesn't match, rows will be empty
            db.query.mockResolvedValueOnce({ rows: [] });

            const result = await MenuItem.findById(mockMenuItemId, mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(expect.any(String), [mockMenuItemId, mockTenantId]);
            expect(result).toBeUndefined();
        });
    });

    describe('findByCategoryId', () => {
        const mockCategoryId = 'cat123';

        it('should throw an error if tenantId is not provided', async () => {
            await expect(MenuItem.findByCategoryId(mockCategoryId, undefined)).rejects.toThrow('Tenant ID is required to find menu items by category ID.');
        });

        it('should return active menu items for a given category and tenant', async () => {
            const mockMenuItems = [{
                menu_item_id: 'miA',
                menu_item_name: 'Salad',
                menu_item_description: 'Fresh greens',
                menu_item_price: 8.50,
                menu_item_is_active: true,
                menu_item_image_path: '/images/salad.jpg',
                menu_item_created_at: new Date(),
                menu_item_updated_at: new Date(),
                menu_item_tenant: mockTenantId,
                category_id: mockCategoryId,
                category_name: 'Appetizers',
                category_description: 'Starters',
                category_tenant: mockTenantId,
                variants: [],
            }];

            db.query.mockResolvedValueOnce({ rows: mockMenuItems });

            const result = await MenuItem.findByCategoryId(mockCategoryId, mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [mockCategoryId, mockTenantId, true]);
            expect(result).toEqual([
                {
                    id: 'miA',
                    name: 'Salad',
                    description: 'Fresh greens',
                    price: 8.50,
                    is_active: true,
                    image_path: '/images/salad.jpg',
                    created_at: mockMenuItems[0].menu_item_created_at,
                    updated_at: mockMenuItems[0].menu_item_updated_at,
                    tenant: mockTenantId,
                    category: {
                        id: mockCategoryId,
                        name: 'Appetizers',
                        description: 'Starters',
                        tenant: mockTenantId,
                    },
                    variants: [],
                },
            ]);
        });

        it('should return all menu items (active and inactive) for a given category and tenant when includeInactive is true', async () => {
            const mockMenuItems = [
                {
                    menu_item_id: 'miA',
                    menu_item_name: 'Salad',
                    menu_item_description: 'Fresh greens',
                    menu_item_price: 8.50,
                    menu_item_is_active: true,
                    menu_item_image_path: '/images/salad.jpg',
                    menu_item_created_at: new Date(),
                    menu_item_updated_at: new Date(),
                    menu_item_tenant: mockTenantId,
                    category_id: mockCategoryId,
                    category_name: 'Appetizers',
                    category_description: 'Starters',
                    category_tenant: mockTenantId,
                    variants: [],
                },
                {
                    menu_item_id: 'miB',
                    menu_item_name: 'Inactive Soup',
                    menu_item_description: 'Seasonal',
                    menu_item_price: 5.00,
                    menu_item_is_active: false,
                    menu_item_image_path: '/images/soup.jpg',
                    menu_item_created_at: new Date(),
                    menu_item_updated_at: new Date(),
                    menu_item_tenant: mockTenantId,
                    category_id: mockCategoryId,
                    category_name: 'Appetizers',
                    category_description: 'Starters',
                    category_tenant: mockTenantId,
                    variants: [],
                },
            ];

            db.query.mockResolvedValueOnce({ rows: mockMenuItems });

            const result = await MenuItem.findByCategoryId(mockCategoryId, mockTenantId, true);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [mockCategoryId, mockTenantId]); // No 'is_active' filter
            expect(result.length).toBe(2);
            expect(result[1].name).toBe('Inactive Soup');
        });

        it('should handle no menu items found for a category gracefully', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const result = await MenuItem.findByCategoryId(mockCategoryId, mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(expect.any(String), [mockCategoryId, mockTenantId, true]);
            expect(result).toEqual([]);
        });
    });

    describe('create', () => {
        it('should throw an error if tenantId is not provided in data', async () => {
            const menuItemData = {
                name: 'New Item',
                description: 'Description',
                price: 20.00,
                category_id: 'catX',
                is_active: true,
                image_path: '/path/to/img.jpg',
                // tenant: undefined
            };
            await expect(MenuItem.create(menuItemData)).rejects.toThrow('Tenant ID is required to create a menu item.');
        });

        it('should create a new menu item and return it', async () => {
            const newMenuItem = {
                id: 'new-mi-id',
                name: 'New Coffee',
                description: 'Freshly brewed',
                price: 5.50,
                category_id: 'catCoffee',
                is_active: true,
                image_path: '/images/coffee.jpg',
                tenant: mockTenantId,
                created_at: new Date(),
                updated_at: new Date(),
            };

            db.query.mockResolvedValueOnce({ rows: [newMenuItem] });

            const menuItemData = {
                name: 'New Coffee',
                description: 'Freshly brewed',
                price: 5.50,
                category_id: 'catCoffee',
                is_active: true,
                image_path: '/images/coffee.jpg',
                tenant: mockTenantId,
            };

            const result = await MenuItem.create(menuItemData);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO menu_items'),
                [
                    menuItemData.name,
                    menuItemData.description,
                    menuItemData.price,
                    menuItemData.category_id,
                    menuItemData.is_active,
                    menuItemData.image_path,
                    menuItemData.tenant
                ]
            );
            expect(result).toEqual(newMenuItem);
        });
    });

    describe('update', () => {
        const existingMenuItemId = 'existing-mi-id';

        it('should throw an error if tenantId is not provided', async () => {
            const updateData = { name: 'Updated Name' };
            await expect(MenuItem.update(existingMenuItemId, updateData, undefined)).rejects.toThrow('Tenant ID is required to update a menu item.');
        });

        it('should update an existing menu item and return the updated item', async () => {
            const updatedData = { name: 'Updated Burger', price: 12.00, is_active: false };
            const returnedItem = {
                id: existingMenuItemId,
                name: 'Updated Burger',
                description: 'Tasty burger',
                price: 12.00,
                category_id: 'cat1',
                is_active: false,
                image_path: '/images/burger.jpg',
                tenant: mockTenantId,
                created_at: new Date(),
                updated_at: new Date(),
            };

            db.query.mockResolvedValueOnce({ rows: [returnedItem] });

            const result = await MenuItem.update(existingMenuItemId, updatedData, mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE menu_items'),
                [
                    updatedData.name,
                    updatedData.description, // COALESCE makes this work even if undefined
                    updatedData.price,
                    updatedData.category_id, // COALESCE makes this work even if undefined
                    updatedData.is_active,
                    updatedData.image_path, // COALESCE makes this work even if undefined
                    existingMenuItemId,
                    mockTenantId
                ]
            );
            expect(result).toEqual(returnedItem);
        });

        it('should return undefined if the menu item to update is not found for the given tenant', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const updateData = { name: 'Non Existent' };
            const result = await MenuItem.update('non-existent-id', updateData, mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(result).toBeUndefined();
        });
    });

    describe('delete', () => {
        const menuItemToDeleteId = 'delete-mi-id';

        it('should throw an error if tenantId is not provided', async () => {
            await expect(MenuItem.delete(menuItemToDeleteId, undefined)).rejects.toThrow('Tenant ID is required to delete a menu item.');
        });

        it('should delete a menu item and return the deleted item', async () => {
            const deletedItem = {
                id: menuItemToDeleteId,
                name: 'Old Sandwich',
                tenant: mockTenantId
            };

            db.query.mockResolvedValueOnce({ rows: [deletedItem] });

            const result = await MenuItem.delete(menuItemToDeleteId, mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(
                'DELETE FROM menu_items WHERE id = $1 AND tenant = $2 RETURNING *',
                [menuItemToDeleteId, mockTenantId]
            );
            expect(result).toEqual(deletedItem);
        });

        it('should return undefined if the menu item to delete is not found for the given tenant', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const result = await MenuItem.delete('non-existent-id', mockTenantId);

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(result).toBeUndefined();
        });
    });
});