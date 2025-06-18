// tests/unit/controllers/menuItemController.test.js
const menuItemController = require('../../../controllers/menuItemController');
const MenuItem = require('../../../models/MenuItem');
const cloudinary = require('../../../config/cloudinary');
const fs = require('fs/promises');

// Mock dependencies
jest.mock('../../../models/MenuItem');
jest.mock('../../../config/cloudinary', () => ({
    uploader: {
        upload: jest.fn(),
        destroy: jest.fn(),
    },
}));
jest.mock('fs/promises', () => ({
    unlink: jest.fn(),
}));

describe('menuItemController', () => {
    let mockReq, mockRes;
    const mockTenantId = 'tenant123';

    beforeEach(() => {
        // Reset mocks and create fresh req/res objects for each test
        jest.clearAllMocks();

        mockReq = {
            tenantId: mockTenantId, // Simulate middleware setting tenantId
            query: {},
            params: {},
            body: {},
            file: undefined, // Default no file
        };
        mockRes = {
            status: jest.fn().mockReturnThis(), // Allow chaining .status().json()
            json: jest.fn(),
        };

        // Suppress console.error for expected error tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console.error after all tests in this describe block
        console.error.mockRestore();
        console.warn.mockRestore();
    });

    // Helper for common tenantId missing check
    const expectTenantIdRequiredError = async (controllerFn, req, res) => {
        req.tenantId = undefined;
        await controllerFn(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Tenant ID is required.' });
    };

    describe('getAllMenuItems', () => {
        it('should return all active menu items for a given tenant', async () => {
            const mockMenuItems = [{ id: 'mi1', name: 'Burger', tenant: mockTenantId }];
            MenuItem.findAll.mockResolvedValue(mockMenuItems);

            await menuItemController.getAllMenuItems(mockReq, mockRes);

            expect(mockReq.tenantId).toBe(mockTenantId);
            expect(MenuItem.findAll).toHaveBeenCalledTimes(1);
            expect(MenuItem.findAll).toHaveBeenCalledWith(mockTenantId, false);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: mockMenuItems });
        });

        it('should return all menu items (including inactive) when includeInactive is true', async () => {
            mockReq.query.includeInactive = 'true';
            const mockMenuItems = [{ id: 'mi1', name: 'Burger', tenant: mockTenantId, is_active: true }, { id: 'mi2', name: 'Soda', tenant: mockTenantId, is_active: false }];
            MenuItem.findAll.mockResolvedValue(mockMenuItems);

            await menuItemController.getAllMenuItems(mockReq, mockRes);

            expect(MenuItem.findAll).toHaveBeenCalledTimes(1);
            expect(MenuItem.findAll).toHaveBeenCalledWith(mockTenantId, true);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: mockMenuItems });
        });

        it('should handle errors during fetching menu items', async () => {
            const errorMessage = 'Database error';
            MenuItem.findAll.mockRejectedValue(new Error(errorMessage));

            await menuItemController.getAllMenuItems(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Failed to fetch menu items',
                error: errorMessage,
            });
        });

        it('should return 400 if tenantId is missing', async () => {
            await expectTenantIdRequiredError(menuItemController.getAllMenuItems, mockReq, mockRes);
        });
    });

    describe('getMenuItemById', () => {
        it('should return a menu item if found', async () => {
            mockReq.params.id = 'mi1';
            const mockMenuItem = { id: 'mi1', name: 'Burger', tenant: mockTenantId };
            MenuItem.findById.mockResolvedValue(mockMenuItem);

            await menuItemController.getMenuItemById(mockReq, mockRes);

            expect(MenuItem.findById).toHaveBeenCalledTimes(1);
            expect(MenuItem.findById).toHaveBeenCalledWith('mi1', mockTenantId);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: mockMenuItem });
        });

        it('should return 404 if menu item is not found', async () => {
            mockReq.params.id = 'nonExistentId';
            MenuItem.findById.mockResolvedValue(undefined);

            await menuItemController.getMenuItemById(mockReq, mockRes);

            expect(MenuItem.findById).toHaveBeenCalledTimes(1);
            expect(MenuItem.findById).toHaveBeenCalledWith('nonExistentId', mockTenantId);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Menu item not found' });
        });

        it('should handle errors during fetching menu item by ID', async () => {
            mockReq.params.id = 'mi1';
            const errorMessage = 'Network error';
            MenuItem.findById.mockRejectedValue(new Error(errorMessage));

            await menuItemController.getMenuItemById(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Failed to fetch menu item',
                error: errorMessage,
            });
        });

        it('should return 400 if tenantId is missing', async () => {
            mockReq.params.id = 'mi1';
            await expectTenantIdRequiredError(menuItemController.getMenuItemById, mockReq, mockRes);
        });
    });

    describe('getMenuItemsByCategoryId', () => {
        it('should return menu items for a given category and tenant', async () => {
            mockReq.params.categoryId = 'cat1';
            const mockMenuItems = [{ id: 'miA', name: 'Salad', category_id: 'cat1', tenant: mockTenantId }];
            MenuItem.findByCategoryId.mockResolvedValue(mockMenuItems);

            await menuItemController.getMenuItemsByCategoryId(mockReq, mockRes);

            expect(MenuItem.findByCategoryId).toHaveBeenCalledTimes(1);
            expect(MenuItem.findByCategoryId).toHaveBeenCalledWith('cat1', mockTenantId, false);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: mockMenuItems });
        });

        it('should return all menu items (including inactive) for a category when includeInactive is true', async () => {
            mockReq.params.categoryId = 'cat1';
            mockReq.query.includeInactive = 'true';
            const mockMenuItems = [{ id: 'miA', name: 'Salad', is_active: true, tenant: mockTenantId }, { id: 'miB', name: 'Inactive Soup', is_active: false, tenant: mockTenantId }];
            MenuItem.findByCategoryId.mockResolvedValue(mockMenuItems);

            await menuItemController.getMenuItemsByCategoryId(mockReq, mockRes);

            expect(MenuItem.findByCategoryId).toHaveBeenCalledTimes(1);
            expect(MenuItem.findByCategoryId).toHaveBeenCalledWith('cat1', mockTenantId, true);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: mockMenuItems });
        });

        it('should handle errors during fetching menu items by category ID', async () => {
            mockReq.params.categoryId = 'cat1';
            const errorMessage = 'DB category error';
            MenuItem.findByCategoryId.mockRejectedValue(new Error(errorMessage));

            await menuItemController.getMenuItemsByCategoryId(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: `Failed to fetch menu items for category ${mockReq.params.categoryId}`,
                error: errorMessage,
            });
        });

        it('should return 400 if tenantId is missing', async () => {
            mockReq.params.categoryId = 'cat1';
            await expectTenantIdRequiredError(menuItemController.getMenuItemsByCategoryId, mockReq, mockRes);
        });
    });

    describe('createMenuItem', () => {
        const baseMenuItemData = {
            name: 'New Pizza',
            description: 'Large pepperoni',
            price: 25.00,
            category_id: '1',
            is_active: 'true', // Simulate string from form data
        };

        it('should create a menu item with an uploaded image', async () => {
            mockReq.body = { ...baseMenuItemData };
            mockReq.file = { path: '/tmp/test_image.jpg' };
            const uploadedImageUrl = 'http://res.cloudinary.com/test/image/upload/v12345/Pood/tenant123/Product/new_pizza_12345.jpg';

            // This is the object that MenuItem.create is EXPECTED to return
            const returnedCreatedMenuItem = {
                id: 'new-mi-id', // This ID is returned by the DB
                name: baseMenuItemData.name,
                description: baseMenuItemData.description,
                price: baseMenuItemData.price,
                category_id: parseInt(baseMenuItemData.category_id),
                is_active: true,
                image_path: uploadedImageUrl,
                tenant: mockTenantId,
                created_at: new Date(), // Add expected fields from DB
                updated_at: new Date(), // Add expected fields from DB
            };

            // This is the data that MenuItem.create is EXPECTED to receive
            const expectedMenuItemDataSentToModel = {
                name: baseMenuItemData.name,
                description: baseMenuItemData.description,
                price: baseMenuItemData.price,
                category_id: parseInt(baseMenuItemData.category_id),
                is_active: true,
                image_path: uploadedImageUrl,
                tenant: mockTenantId,
            };

            cloudinary.uploader.upload.mockResolvedValue({ secure_url: uploadedImageUrl });
            // Mock MenuItem.create to return the full object with ID
            MenuItem.create.mockResolvedValue(returnedCreatedMenuItem);
            fs.unlink.mockResolvedValue(undefined);

            await menuItemController.createMenuItem(mockReq, mockRes);

            expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(1);
            expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
                mockReq.file.path,
                expect.objectContaining({
                    folder: `Pood/${mockTenantId}/Product`,
                    public_id: expect.stringMatching(/^new_pizza_\d+$/),
                })
            );
            expect(fs.unlink).toHaveBeenCalledTimes(1);
            expect(fs.unlink).toHaveBeenCalledWith(mockReq.file.path);
            expect(MenuItem.create).toHaveBeenCalledTimes(1);
            // Assert that MenuItem.create was called with the correct data (without ID)
            expect(MenuItem.create).toHaveBeenCalledWith(expectedMenuItemDataSentToModel);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            // Assert that the response JSON contains the full object (with ID)
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: returnedCreatedMenuItem });
        });

        it('should create a menu item without an image', async () => {
            mockReq.body = { ...baseMenuItemData };
            mockReq.file = undefined; // No file uploaded

            // This is the object that MenuItem.create is EXPECTED to return
            const returnedCreatedMenuItem = {
                id: 'new-mi-no-img-id',
                name: baseMenuItemData.name,
                description: baseMenuItemData.description,
                price: baseMenuItemData.price,
                category_id: parseInt(baseMenuItemData.category_id),
                is_active: true,
                image_path: null,
                tenant: mockTenantId,
                created_at: new Date(),
                updated_at: new Date(),
            };

            // This is the data that MenuItem.create is EXPECTED to receive
            const expectedMenuItemDataSentToModel = {
                name: baseMenuItemData.name,
                description: baseMenuItemData.description,
                price: baseMenuItemData.price,
                category_id: parseInt(baseMenuItemData.category_id),
                is_active: true,
                image_path: null,
                tenant: mockTenantId,
            };

            MenuItem.create.mockResolvedValue(returnedCreatedMenuItem);

            await menuItemController.createMenuItem(mockReq, mockRes);

            expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
            expect(fs.unlink).not.toHaveBeenCalled();
            expect(MenuItem.create).toHaveBeenCalledTimes(1);
            // Assert that MenuItem.create was called with the correct data (without ID)
            expect(MenuItem.create).toHaveBeenCalledWith(expectedMenuItemDataSentToModel);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            // Assert that the response JSON contains the full object (with ID)
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: returnedCreatedMenuItem });
        });

        it('should return 500 if Cloudinary upload fails', async () => {
            mockReq.body = { ...baseMenuItemData };
            mockReq.file = { path: '/tmp/test_image.jpg' };
            const uploadErrorMessage = 'Cloudinary upload failed';
            cloudinary.uploader.upload.mockRejectedValue(new Error(uploadErrorMessage));
            fs.unlink.mockResolvedValue(undefined); // Unlink should still be called

            await menuItemController.createMenuItem(mockReq, mockRes);

            expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(1);
            expect(fs.unlink).toHaveBeenCalledTimes(1);
            expect(MenuItem.create).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Failed to upload image to Cloudinary',
                error: uploadErrorMessage,
            });
        });

        it('should handle generic errors during creation and clean up file', async () => {
            mockReq.body = { ...baseMenuItemData };
            mockReq.file = { path: '/tmp/test_image.jpg' };
            const genericErrorMessage = 'DB insert error';
            cloudinary.uploader.upload.mockResolvedValue({ secure_url: 'http://cloudinary.com/uploaded.jpg' });
            MenuItem.create.mockRejectedValue(new Error(genericErrorMessage));
            fs.unlink.mockResolvedValue(undefined);

            await menuItemController.createMenuItem(mockReq, mockRes);

            expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(1);
            expect(fs.unlink).toHaveBeenCalledTimes(2); // One for successful upload, one for error cleanup
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Failed to create menu item',
                error: genericErrorMessage,
            });
        });

        it('should return 400 for specific upload errors (e.g., Invalid file type)', async () => {
            mockReq.body = { ...baseMenuItemData };
            mockReq.file = { path: '/tmp/bad_image.exe' };
            cloudinary.uploader.upload.mockRejectedValue(new Error('Invalid file type'));
            fs.unlink.mockResolvedValue(undefined);

            await menuItemController.createMenuItem(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Invalid file type' });
        });

        it('should return 400 if tenantId is missing', async () => {
            await expectTenantIdRequiredError(menuItemController.createMenuItem, mockReq, mockRes);
            expect(fs.unlink).not.toHaveBeenCalled(); // No file to unlink if tenantId missing early
        });
    });

    describe('updateMenuItem', () => {
        const existingMenuItemId = 'existing-item-id';
        const existingMenuItem = {
            id: existingMenuItemId,
            name: 'Old Name',
            description: 'Old Desc',
            price: 10.00,
            category_id: 1,
            is_active: true,
            image_path: 'http://res.cloudinary.com/test/image/upload/v12345/Pood/tenant123/Product/old_name.jpg',
            tenant: mockTenantId,
        };
        const mockPublicId = 'old_name';

        beforeEach(() => {
            mockReq.params.id = existingMenuItemId;
            MenuItem.findById.mockResolvedValue(existingMenuItem);
        });

        it('should update a menu item without changing the image', async () => {
            const updatedData = { name: 'New Name', description: 'Updated Description' };
            mockReq.body = updatedData;
            mockReq.file = undefined;

            const returnedUpdatedItem = { ...existingMenuItem, ...updatedData };
            MenuItem.update.mockResolvedValue(returnedUpdatedItem);

            await menuItemController.updateMenuItem(mockReq, mockRes);

            expect(MenuItem.findById).toHaveBeenCalledWith(existingMenuItemId, mockTenantId);
            expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
            expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
            expect(fs.unlink).not.toHaveBeenCalled();
            expect(MenuItem.update).toHaveBeenCalledTimes(1);
            expect(MenuItem.update).toHaveBeenCalledWith(existingMenuItemId, {
                ...updatedData,
                category_id: existingMenuItem.category_id, // category_id not provided in update, so retains old
                is_active: existingMenuItem.is_active,     // is_active not provided in update, so retains old
                image_path: existingMenuItem.image_path,   // image_path not provided, so retains old
            }, mockTenantId);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: returnedUpdatedItem });
        });

        it('should update a menu item with a new image, deleting the old one', async () => {
            const updatedData = { name: 'New Name', price: 15.00 };
            mockReq.body = updatedData;
            mockReq.file = { path: '/tmp/new_image.png' };
            const newImageUrl = 'http://res.cloudinary.com/test/image/upload/v12345/Pood/tenant123/Product/new_name_12345.png';

            const returnedUpdatedItem = { ...existingMenuItem, ...updatedData, image_path: newImageUrl };

            cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
            cloudinary.uploader.upload.mockResolvedValue({ secure_url: newImageUrl });
            MenuItem.update.mockResolvedValue(returnedUpdatedItem);
            fs.unlink.mockResolvedValue(undefined);

            await menuItemController.updateMenuItem(mockReq, mockRes);

            expect(MenuItem.findById).toHaveBeenCalledWith(existingMenuItemId, mockTenantId);
            expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1);
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(mockPublicId); // Based on existing image path
            expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(1);
            expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
                mockReq.file.path,
                expect.objectContaining({
                    folder: `Pood/${mockTenantId}/Product`,
                    public_id: expect.stringMatching(/^new_name_\d+$/),
                })
            );
            expect(fs.unlink).toHaveBeenCalledTimes(1);
            expect(fs.unlink).toHaveBeenCalledWith(mockReq.file.path);
            expect(MenuItem.update).toHaveBeenCalledTimes(1);
            expect(MenuItem.update).toHaveBeenCalledWith(existingMenuItemId, {
                ...updatedData,
                category_id: existingMenuItem.category_id,
                is_active: existingMenuItem.is_active,
                image_path: newImageUrl,
            }, mockTenantId);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: returnedUpdatedItem });
        });

        it('should remove image if image_path is explicitly set to null in body', async () => {
        const updatedData = { image_path: null };
        mockReq.body = updatedData;
        mockReq.file = undefined;

        const returnedUpdatedItem = { ...existingMenuItem, image_path: null };

        cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });
        MenuItem.update.mockResolvedValue(returnedUpdatedItem);

        await menuItemController.updateMenuItem(mockReq, mockRes);

        expect(MenuItem.findById).toHaveBeenCalledWith(existingMenuItemId, mockTenantId);
        expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1);
        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(mockPublicId);
        expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
        expect(fs.unlink).not.toHaveBeenCalled();
        expect(MenuItem.update).toHaveBeenCalledTimes(1);
        expect(MenuItem.update).toHaveBeenCalledWith(existingMenuItemId, {
            // These should be undefined, as they are not in mockReq.body.updatedData
            name: undefined,
            description: undefined,
            price: undefined,
            // These are correctly derived in the controller
            category_id: existingMenuItem.category_id,
            is_active: existingMenuItem.is_active,
            image_path: null,
        }, mockTenantId);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: returnedUpdatedItem });
    });

        it('should return 404 if menu item not found for update', async () => {
            MenuItem.findById.mockResolvedValue(undefined); // Simulate not found
            mockReq.params.id = 'non-existent-id';
            mockReq.body = { name: 'Update This' };

            await menuItemController.updateMenuItem(mockReq, mockRes);

            expect(MenuItem.findById).toHaveBeenCalledWith('non-existent-id', mockTenantId);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Menu item not found for this tenant.' });
            expect(MenuItem.update).not.toHaveBeenCalled();
            expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
            expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
            expect(fs.unlink).not.toHaveBeenCalled();
        });

        it('should handle Cloudinary upload errors during update', async () => {
            mockReq.file = { path: '/tmp/new_image.png' };
            const uploadErrorMessage = 'Cloudinary update upload failed';
            cloudinary.uploader.upload.mockRejectedValue(new Error(uploadErrorMessage));
            cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' }); // Old image delete might succeed
            fs.unlink.mockResolvedValue(undefined);

            await menuItemController.updateMenuItem(mockReq, mockRes);

            expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(1);
            expect(fs.unlink).toHaveBeenCalledTimes(1);
            expect(MenuItem.update).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Failed to upload new image',
                error: uploadErrorMessage,
            });
        });

        it('should handle generic errors during update and clean up file', async () => {
            mockReq.file = { path: '/tmp/new_image.png' };
            const genericErrorMessage = 'DB update error';
            cloudinary.uploader.upload.mockResolvedValue({ secure_url: 'http://cloudinary.com/uploaded.jpg' });
            MenuItem.update.mockRejectedValue(new Error(genericErrorMessage));
            fs.unlink.mockResolvedValue(undefined);

            await menuItemController.updateMenuItem(mockReq, mockRes);

            expect(cloudinary.uploader.upload).toHaveBeenCalledTimes(1);
            expect(fs.unlink).toHaveBeenCalledTimes(2); // One for successful upload, one for error cleanup
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Failed to update menu item',
                error: genericErrorMessage,
            });
        });

        it('should return 400 if tenantId is missing', async () => {
            mockReq.params.id = existingMenuItemId;
            await expectTenantIdRequiredError(menuItemController.updateMenuItem, mockReq, mockRes);
        });
    });

    describe('deleteMenuItem', () => {
        const menuItemToDeleteId = 'delete-mi-id';
        const menuItemToDelete = {
            id: menuItemToDeleteId,
            name: 'ToDelete',
            image_path: 'http://res.cloudinary.com/test/image/upload/v12345/Pood/tenant123/Product/to_delete.jpg',
            tenant: mockTenantId,
        };
        const mockPublicId = 'to_delete';

        beforeEach(() => {
            mockReq.params.id = menuItemToDeleteId;
            MenuItem.findById.mockResolvedValue(menuItemToDelete);
        });

        it('should delete a menu item and its image', async () => {
            MenuItem.delete.mockResolvedValue(menuItemToDelete);
            cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

            await menuItemController.deleteMenuItem(mockReq, mockRes);

            expect(MenuItem.findById).toHaveBeenCalledWith(menuItemToDeleteId, mockTenantId);
            expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1);
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(mockPublicId);
            expect(MenuItem.delete).toHaveBeenCalledTimes(1);
            expect(MenuItem.delete).toHaveBeenCalledWith(menuItemToDeleteId, mockTenantId);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: menuItemToDelete });
        });

        it('should delete a menu item without an image path', async () => {
            const menuItemWithoutImage = { ...menuItemToDelete, image_path: null };
            MenuItem.findById.mockResolvedValue(menuItemWithoutImage);
            MenuItem.delete.mockResolvedValue(menuItemWithoutImage);

            await menuItemController.deleteMenuItem(mockReq, mockRes);

            expect(MenuItem.findById).toHaveBeenCalledWith(menuItemToDeleteId, mockTenantId);
            expect(cloudinary.uploader.destroy).not.toHaveBeenCalled(); // No image to delete
            expect(MenuItem.delete).toHaveBeenCalledTimes(1);
            expect(MenuItem.delete).toHaveBeenCalledWith(menuItemToDeleteId, mockTenantId);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: menuItemWithoutImage });
        });

        it('should return 404 if menu item not found for deletion', async () => {
            MenuItem.findById.mockResolvedValue(undefined);
            mockReq.params.id = 'non-existent-id';

            await menuItemController.deleteMenuItem(mockReq, mockRes);

            expect(MenuItem.findById).toHaveBeenCalledWith('non-existent-id', mockTenantId);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Menu item not found for this tenant.' });
            expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
            expect(MenuItem.delete).not.toHaveBeenCalled();
        });

        it('should handle errors during Cloudinary deletion gracefully (warn and proceed)', async () => {
            cloudinary.uploader.destroy.mockRejectedValue(new Error('Cloudinary delete failed'));
            MenuItem.delete.mockResolvedValue(menuItemToDelete);

            await menuItemController.deleteMenuItem(mockReq, mockRes);

            expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith('Could not delete image from Cloudinary:', expect.any(Error));
            expect(MenuItem.delete).toHaveBeenCalledTimes(1); // Should still attempt DB delete
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', data: menuItemToDelete });
        });

        it('should handle generic errors during deletion', async () => {
            const errorMessage = 'DB delete error';
            MenuItem.delete.mockRejectedValue(new Error(errorMessage));
            cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' }); // Cloudinary might succeed

            await menuItemController.deleteMenuItem(mockReq, mockRes);

            expect(MenuItem.delete).toHaveBeenCalledTimes(1);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Failed to delete menu item',
                error: errorMessage,
            });
        });

        it('should return 400 if tenantId is missing', async () => {
            await expectTenantIdRequiredError(menuItemController.deleteMenuItem, mockReq, mockRes);
        });
    });
});