const MenuItem = require('../../models/MenuItem');
const MenuItemVariant = require('../../models/MenuItemVariant');
const db = require('../../config/db');

// Mock the database and MenuItemVariant
jest.mock('../../config/db');
jest.mock('../../models/MenuItemVariant');

describe('MenuItem Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        const mockMenuItemsData = [
            {
                menu_item_id: 1,
                menu_item_name: 'Burger',
                menu_item_description: 'Delicious burger',
                menu_item_price: 10.99,
                menu_item_is_active: true,
                menu_item_image_path: '/images/burger.jpg',
                menu_item_created_at: '2023-01-01T00:00:00Z',
                menu_item_updated_at: '2023-01-01T00:00:00Z',
                category_id: 1,
                category_name: 'Main Course',
                category_description: 'Main dishes',
                variants: [
                    {
                        id: 1,
                        name: 'Small',
                        price: 8.99,
                        is_active: true,
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z'
                    }
                ]
            },
            {
                menu_item_id: 2,
                menu_item_name: 'Pizza',
                menu_item_description: 'Cheesy pizza',
                menu_item_price: 15.99,
                menu_item_is_active: false,
                menu_item_image_path: '/images/pizza.jpg',
                menu_item_created_at: '2023-01-02T00:00:00Z',
                menu_item_updated_at: '2023-01-02T00:00:00Z',
                category_id: 1,
                category_name: 'Main Course',
                category_description: 'Main dishes',
                variants: []
            }
        ];

        it('should return all active menu items by default', async () => {
            const activeItems = mockMenuItemsData.filter(item => item.menu_item_is_active);
            db.query.mockResolvedValue({ rows: activeItems });

            const result = await MenuItem.findAll();

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE mi.is_active = true'),
                []
            );
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                id: 1,
                name: 'Burger',
                description: 'Delicious burger',
                price: 10.99,
                is_active: true,
                image_path: '/images/burger.jpg',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z',
                category: {
                    id: 1,
                    name: 'Main Course',
                    description: 'Main dishes'
                },
                variants: [
                    {
                        id: 1,
                        name: 'Small',
                        price: 8.99,
                        is_active: true,
                        created_at: '2023-01-01T00:00:00Z',
                        updated_at: '2023-01-01T00:00:00Z'
                    }
                ]
            });
        });

        it('should return all menu items including inactive when includeInactive is true', async () => {
            db.query.mockResolvedValue({ rows: mockMenuItemsData });

            const result = await MenuItem.findAll(true);

            expect(db.query).toHaveBeenCalledWith(
                expect.not.stringContaining('WHERE mi.is_active = true'),
                []
            );
            expect(result).toHaveLength(2);
        });

        it('should handle empty results', async () => {
            db.query.mockResolvedValue({ rows: [] });

            const result = await MenuItem.findAll();

            expect(result).toEqual([]);
        });

        it('should handle database errors', async () => {
            const dbError = new Error('Database connection failed');
            db.query.mockRejectedValue(dbError);

            await expect(MenuItem.findAll()).rejects.toThrow('Database connection failed');
        });
    });

    describe('findById', () => {
        const mockMenuItem = {
            id: 1,
            name: 'Burger',
            description: 'Delicious burger',
            price: 10.99,
            is_active: true,
            image_path: '/images/burger.jpg',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            category_id: 1,
            category_name: 'Main Course',
            category_description: 'Main dishes'
        };

        const mockVariants = [
            {
                id: 1,
                name: 'Small',
                price: 8.99,
                is_active: true
            }
        ];

        it('should return menu item with variants when found', async () => {
            db.query.mockResolvedValue({ rows: [mockMenuItem] });
            MenuItemVariant.findByMenuItemId.mockResolvedValue(mockVariants);

            const result = await MenuItem.findById(1);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE mi.id = $1'),
                [1]
            );
            expect(MenuItemVariant.findByMenuItemId).toHaveBeenCalledWith(1);
            expect(result).toEqual({
                ...mockMenuItem,
                variants: mockVariants
            });
        });

        it('should return undefined when menu item not found', async () => {
            db.query.mockResolvedValue({ rows: [] });

            const result = await MenuItem.findById(999);

            expect(result).toBeUndefined();
            expect(MenuItemVariant.findByMenuItemId).not.toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            const dbError = new Error('Database error');
            db.query.mockRejectedValue(dbError);

            await expect(MenuItem.findById(1)).rejects.toThrow('Database error');
        });
    });

    describe('findByCategoryId', () => {
        const mockCategoryItems = [
            {
                menu_item_id: 1,
                menu_item_name: 'Burger',
                menu_item_description: 'Delicious burger',
                menu_item_price: 10.99,
                menu_item_is_active: true,
                menu_item_image_path: '/images/burger.jpg',
                menu_item_created_at: '2023-01-01T00:00:00Z',
                menu_item_updated_at: '2023-01-01T00:00:00Z',
                category_id: 1,
                category_name: 'Main Course',
                category_description: 'Main dishes',
                variants: []
            }
        ];

        it('should return active menu items for a category by default', async () => {
            db.query.mockResolvedValue({ rows: mockCategoryItems });

            const result = await MenuItem.findByCategoryId(1);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE mi.category_id = $1 AND mi.is_active = true'),
                [1]
            );
            expect(result).toHaveLength(1);
            expect(result[0].category.id).toBe(1);
        });

        it('should return all menu items for a category when includeInactive is true', async () => {
            db.query.mockResolvedValue({ rows: mockCategoryItems });

            const result = await MenuItem.findByCategoryId(1, true);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE mi.category_id = $1'),
                [1]
            );
            expect(db.query).toHaveBeenCalledWith(
                expect.not.stringContaining('AND mi.is_active = true'),
                [1]
            );
        });

        it('should handle empty results for category', async () => {
            db.query.mockResolvedValue({ rows: [] });

            const result = await MenuItem.findByCategoryId(999);

            expect(result).toEqual([]);
        });
    });

    describe('create', () => {
        const menuItemData = {
            name: 'New Burger',
            description: 'A new delicious burger',
            price: 12.99,
            category_id: 1,
            is_active: true,
            image_path: '/images/new-burger.jpg'
        };

        const mockCreatedItem = {
            id: 1,
            ...menuItemData,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
        };

        it('should create a new menu item successfully', async () => {
            db.query.mockResolvedValue({ rows: [mockCreatedItem] });

            const result = await MenuItem.create(menuItemData);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO menu_items'),
                [
                    menuItemData.name,
                    menuItemData.description,
                    menuItemData.price,
                    menuItemData.category_id,
                    menuItemData.is_active,
                    menuItemData.image_path
                ]
            );
            expect(result).toEqual(mockCreatedItem);
        });

        it('should handle database errors during creation', async () => {
            const dbError = new Error('Constraint violation');
            db.query.mockRejectedValue(dbError);

            await expect(MenuItem.create(menuItemData)).rejects.toThrow('Constraint violation');
        });
    });

    describe('update', () => {
        const updateData = {
            name: 'Updated Burger',
            description: 'Updated description',
            price: 13.99,
            category_id: 2,
            is_active: false,
            image_path: '/images/updated-burger.jpg'
        };

        const mockUpdatedItem = {
            id: 1,
            ...updateData,
            updated_at: '2023-01-01T12:00:00Z'
        };

        it('should update menu item successfully', async () => {
            db.query.mockResolvedValue({ rows: [mockUpdatedItem] });

            const result = await MenuItem.update(1, updateData);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE menu_items'),
                [
                    updateData.name,
                    updateData.description,
                    updateData.price,
                    updateData.category_id,
                    updateData.is_active,
                    updateData.image_path,
                    1
                ]
            );
            expect(result).toEqual(mockUpdatedItem);
        });

        it('should handle partial updates with COALESCE', async () => {
            const partialUpdate = { name: 'Partially Updated' };
            const mockPartialUpdatedItem = { id: 1, name: 'Partially Updated' };
            
            db.query.mockResolvedValue({ rows: [mockPartialUpdatedItem] });

            const result = await MenuItem.update(1, partialUpdate);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('COALESCE'),
                [
                    partialUpdate.name,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    1
                ]
            );
            expect(result).toEqual(mockPartialUpdatedItem);
        });

        it('should return undefined when item not found for update', async () => {
            db.query.mockResolvedValue({ rows: [] });

            const result = await MenuItem.update(999, updateData);

            expect(result).toBeUndefined();
        });
    });

    describe('delete', () => {
        const mockDeletedItem = {
            id: 1,
            name: 'Deleted Burger',
            description: 'This was deleted',
            price: 10.99
        };

        it('should delete menu item successfully', async () => {
            db.query.mockResolvedValue({ rows: [mockDeletedItem] });

            const result = await MenuItem.delete(1);

            expect(db.query).toHaveBeenCalledWith(
                'DELETE FROM menu_items WHERE id = $1 RETURNING *',
                [1]
            );
            expect(result).toEqual(mockDeletedItem);
        });

        it('should return undefined when item not found for deletion', async () => {
            db.query.mockResolvedValue({ rows: [] });

            const result = await MenuItem.delete(999);

            expect(result).toBeUndefined();
        });

        it('should handle database errors during deletion', async () => {
            const dbError = new Error('Foreign key constraint');
            db.query.mockRejectedValue(dbError);

            await expect(MenuItem.delete(1)).rejects.toThrow('Foreign key constraint');
        });
    });
});
