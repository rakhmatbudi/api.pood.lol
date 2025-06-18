const MenuItem = require('../../models/MenuItem');
const MenuItemVariant = require('../../models/MenuItemVariant');
const db = require('../../config/db');

// models/MenuItem.test.js

jest.mock('../../config/db');
jest.mock('../../models/MenuItemVariant');

describe('MenuItem Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        const mockRows = [
            {
                menu_item_id: 1,
                menu_item_name: 'Burger',
                menu_item_description: 'Yummy',
                menu_item_price: 10,
                menu_item_is_active: true,
                menu_item_image_path: '/img/burger.jpg',
                menu_item_created_at: '2024-01-01T00:00:00Z',
                menu_item_updated_at: '2024-01-01T00:00:00Z',
                category_id: 2,
                category_name: 'Food',
                category_description: 'Main food',
                variants: [{ id: 1, name: 'Small' }]
            }
        ];

        it('returns all active menu items by default', async () => {
            db.query.mockResolvedValue({ rows: mockRows });
            const result = await MenuItem.findAll();
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE mi.is_active = true'), []);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Burger');
        });

        it('returns all menu items including inactive when includeInactive is true', async () => {
            db.query.mockResolvedValue({ rows: mockRows });
            await MenuItem.findAll(true);
            expect(db.query).toHaveBeenCalledWith(expect.not.stringContaining('WHERE mi.is_active = true'), []);
        });

        it('returns empty array if no items', async () => {
            db.query.mockResolvedValue({ rows: [] });
            const result = await MenuItem.findAll();
            expect(result).toEqual([]);
        });

        it('throws on db error', async () => {
            db.query.mockRejectedValue(new Error('fail'));
            await expect(MenuItem.findAll()).rejects.toThrow('fail');
        });
    });

    describe('findById', () => {
        const mockMenuItem = {
            id: 1,
            name: 'Burger',
            description: 'Yummy',
            price: 10,
            is_active: true,
            image_path: '/img/burger.jpg',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            category_id: 2,
            category_name: 'Food',
            category_description: 'Main food'
        };
        const mockVariants = [{ id: 1, name: 'Small' }];

        it('returns menu item with variants when found', async () => {
            db.query.mockResolvedValue({ rows: [mockMenuItem] });
            MenuItemVariant.findByMenuItemId.mockResolvedValue(mockVariants);
            const result = await MenuItem.findById(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE mi.id = $1'), [1]);
            expect(MenuItemVariant.findByMenuItemId).toHaveBeenCalledWith(1);
            expect(result).toMatchObject({ ...mockMenuItem, variants: mockVariants });
        });

        it('returns undefined if not found', async () => {
            db.query.mockResolvedValue({ rows: [] });
            const result = await MenuItem.findById(999);
            expect(result).toBeUndefined();
            expect(MenuItemVariant.findByMenuItemId).not.toHaveBeenCalled();
        });

        it('throws on db error', async () => {
            db.query.mockRejectedValue(new Error('fail'));
            await expect(MenuItem.findById(1)).rejects.toThrow('fail');
        });
    });

    describe('findByCategoryId', () => {
        const mockRows = [
            {
                menu_item_id: 1,
                menu_item_name: 'Burger',
                menu_item_description: 'Yummy',
                menu_item_price: 10,
                menu_item_is_active: true,
                menu_item_image_path: '/img/burger.jpg',
                menu_item_created_at: '2024-01-01T00:00:00Z',
                menu_item_updated_at: '2024-01-01T00:00:00Z',
                category_id: 2,
                category_name: 'Food',
                category_description: 'Main food',
                variants: []
            }
        ];

        it('returns active menu items for a category by default', async () => {
            db.query.mockResolvedValue({ rows: mockRows });
            const result = await MenuItem.findByCategoryId(2);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE mi.category_id = $1 AND mi.is_active = true'),
                [2]
            );
            expect(result[0].category.id).toBe(2);
        });

        it('returns all menu items for a category when includeInactive is true', async () => {
            db.query.mockResolvedValue({ rows: mockRows });
            await MenuItem.findByCategoryId(2, true);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE mi.category_id = $1'),
                [2]
            );
        });

        it('returns empty array if no items', async () => {
            db.query.mockResolvedValue({ rows: [] });
            const result = await MenuItem.findByCategoryId(2);
            expect(result).toEqual([]);
        });

        it('throws on db error', async () => {
            db.query.mockRejectedValue(new Error('fail'));
            await expect(MenuItem.findByCategoryId(2)).rejects.toThrow('fail');
        });
    });

    describe('create', () => {
        const menuItemData = {
            name: 'Pizza',
            description: 'Cheesy',
            price: 15,
            category_id: 2,
            is_active: true,
            image_path: '/img/pizza.jpg'
        };
        const mockCreated = { id: 2, ...menuItemData };

        it('creates a new menu item', async () => {
            db.query.mockResolvedValue({ rows: [mockCreated] });
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
            expect(result).toEqual(mockCreated);
        });

        it('throws on db error', async () => {
            db.query.mockRejectedValue(new Error('fail'));
            await expect(MenuItem.create(menuItemData)).rejects.toThrow('fail');
        });
    });

    describe('update', () => {
        const updateData = {
            name: 'Pizza',
            description: 'Cheesy',
            price: 15,
            category_id: 2,
            is_active: true,
            image_path: '/img/pizza.jpg'
        };
        const mockUpdated = { id: 2, ...updateData };

        it('updates a menu item', async () => {
            db.query.mockResolvedValue({ rows: [mockUpdated] });
            const result = await MenuItem.update(2, updateData);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE menu_items'),
                [
                    updateData.name,
                    updateData.description,
                    updateData.price,
                    updateData.category_id,
                    updateData.is_active,
                    updateData.image_path,
                    2
                ]
            );
            expect(result).toEqual(mockUpdated);
        });

        it('returns undefined if not found', async () => {
            db.query.mockResolvedValue({ rows: [] });
            const result = await MenuItem.update(999, updateData);
            expect(result).toBeUndefined();
        });

        it('throws on db error', async () => {
            db.query.mockRejectedValue(new Error('fail'));
            await expect(MenuItem.update(2, updateData)).rejects.toThrow('fail');
        });
    });

    describe('delete', () => {
        const mockDeleted = { id: 1, name: 'Burger' };

        it('deletes a menu item', async () => {
            db.query.mockResolvedValue({ rows: [mockDeleted] });
            const result = await MenuItem.delete(1);
            expect(db.query).toHaveBeenCalledWith(
                'DELETE FROM menu_items WHERE id = $1 RETURNING *',
                [1]
            );
            expect(result).toEqual(mockDeleted);
        });

        it('returns undefined if not found', async () => {
            db.query.mockResolvedValue({ rows: [] });
            const result = await MenuItem.delete(999);
            expect(result).toBeUndefined();
        });

        it('throws on db error', async () => {
            db.query.mockRejectedValue(new Error('fail'));
            await expect(MenuItem.delete(1)).rejects.toThrow('fail');
        });
    });
});

// We recommend installing an extension to run jest tests.