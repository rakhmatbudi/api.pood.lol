// tests/unit/routes/menuItems.test.js
const request = require('supertest');
const menuItemController = require('../../../controllers/menuItemController');
const upload = require('../../../middleware/upload');
const { getTempTenantId } = require('../../../middleware/tempTenantMiddleware');

// Define global variables to hold the mocked router instance and express module.
// These will be assigned during the `jest.mock('express')` setup.
let routerCreatedByMenuItemsRoutes;
let expressMockModule;

jest.mock('express', () => {
    const mockRouter = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        use: jest.fn(),
        stack: [],
    };

    const mockExpressApp = {
        use: jest.fn(function(path, handler) {
            if (typeof path === 'function') {
                this.stack.push({ handle: path });
            } else {
                this.stack.push({ path, handle: handler });
            }
            return this;
        }),
        listen: jest.fn(),
        stack: [],
    };

    const expressFactory = jest.fn(() => mockExpressApp); // This is the `express()` function
    expressFactory.Router = jest.fn(() => {
        routerCreatedByMenuItemsRoutes = mockRouter; // Capture the router when Router() is called
        return mockRouter;
    });

    expressFactory.json = jest.fn(() => (req, res, next) => next());
    expressFactory.urlencoded = jest.fn(() => (req, res, next) => next());

    expressMockModule = expressFactory; // Expose the mocked express module for direct use in tests
    return expressFactory; // This is what `require('express')` will return
});

// Mock other modules as before
jest.mock('../../../controllers/menuItemController');
jest.mock('../../../middleware/upload', () => ({
    single: jest.fn(() => (req, res, next) => {
        if (req.method === 'POST' || req.method === 'PUT') {
            req.file = {
                fieldname: 'image',
                originalname: 'test.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                size: 12345,
                destination: '/tmp',
                filename: 'test-12345.jpg',
                path: '/tmp/test-12345.jpg'
            };
        }
        next();
    }),
}));
jest.mock('../../../middleware/tempTenantMiddleware', () => ({
    getTempTenantId: jest.fn((req, res, next) => {
        req.tenantId = 'testTenant123';
        next();
    }),
}));

// IMPORTANT: Require the module under test *here*, after all mocks are defined.
// This will cause routes/menuItems.js to execute and call express.Router(),
// populating `routerCreatedByMenuItemsRoutes`.
const menuItemsRouterModule = require('../../../routes/menuItems');


describe('menuItems routes', () => {
    let app;
    let consoleErrorSpy;

    // No `beforeAll` needed for `menuItemsRouterModule` now as it's globally required.

    beforeEach(() => {
        // Clear all mocks for a clean state before each test
        jest.clearAllMocks();

        // `routerCreatedByMenuItemsRoutes` holds the actual router instance
        // that `routes/menuItems.js` exported.
        // We ensure its individual methods (get, post, etc.) are cleared for fresh spies.
        if (routerCreatedByMenuItemsRoutes) {
            Object.values(routerCreatedByMenuItemsRoutes).forEach(mockFn => {
                if (jest.isMockFunction(mockFn)) {
                    mockFn.mockClear();
                }
            });
        }
        // Also clear the `express` mock's internal method calls (json, urlencoded, Router)
        expressMockModule.Router.mockClear();
        expressMockModule.json.mockClear();
        expressMockModule.urlencoded.mockClear();

        // Create a basic express app to attach our mocked router to for supertest
        app = expressMockModule(); // Call the mocked `express()` function
        app.use(expressMockModule.json()); // Use the mocked `express.json()`
        app.use(expressMockModule.urlencoded({ extended: true })); // Use the mocked `express.urlencoded()`
        app.use('/', menuItemsRouterModule); // Use the actual exported router from menuItems.js

        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        if (jest.isMockFunction(console.warn)) {
            console.warn.mockRestore();
        }
    });

    // Helper to get the arguments passed to a specific router method for a path
    const getRouteArgs = (method, path) => {
        // Use `routerCreatedByMenuItemsRoutes` as it's the specific instance whose methods were called
        const calls = routerCreatedByMenuItemsRoutes[method].mock.calls;
        for (const call of calls) {
            if (call[0] === path) {
                return call.slice(1);
            }
        }
        return null;
    };

    // ... (All your `it` blocks for route definitions and Supertest E2E-like tests)
    // Make sure to use `routerCreatedByMenuItemsRoutes` consistently when asserting
    // on `router.get`, `router.post` calls.
    it('should define a GET / route with getTempTenantId and getAllMenuItems', () => {
        const routeArgs = getRouteArgs('get', '/');
        expect(routeArgs).not.toBeNull();
        expect(routeArgs).toHaveLength(2);
        expect(routeArgs[0]).toBe(getTempTenantId);
        expect(routeArgs[1]).toBe(menuItemController.getAllMenuItems);
    });

    it('should define a POST / route with getTempTenantId, upload.single, and createMenuItem', () => {
        const routeArgs = getRouteArgs('post', '/');
        expect(routeArgs).not.toBeNull();
        expect(routeArgs).toHaveLength(3);
        expect(routeArgs[0]).toBe(getTempTenantId);
        // This now correctly checks if the `single` method of the `upload` mock was called with 'image'
        expect(upload.single).toHaveBeenCalledWith('image');
        // This now correctly asserts that the second argument is the *result* of calling upload.single()
        expect(routeArgs[1]).toBe(upload.single());
        expect(routeArgs[2]).toBe(menuItemController.createMenuItem);
    });
    // ... (rest of the tests as before)

    it('should call getAllMenuItems with tenantId set by middleware', async () => {
        menuItemController.getAllMenuItems.mockImplementationOnce((req, res) => {
            res.status(200).json({ status: 'success', data: { tenantId: req.tenantId } });
        });

        const res = await request(app).get('/');

        expect(res.statusCode).toEqual(200);
        expect(res.body.data).toEqual({ tenantId: 'testTenant123' });
        expect(menuItemController.getAllMenuItems).toHaveBeenCalledTimes(1);
        expect(getTempTenantId).toHaveBeenCalledTimes(1);

        const getCalls = routerCreatedByMenuItemsRoutes.get.mock.calls;
        const allMenuItemsCall = getCalls.find(call => call[0] === '/');
        const [path, tenantMiddleware, controller] = allMenuItemsCall;
        expect(tenantMiddleware).toBe(getTempTenantId);
        expect(controller).toBe(menuItemController.getAllMenuItems);
    });

    it('should call createMenuItem with req.file and req.tenantId set by middleware', async () => {
        menuItemController.createMenuItem.mockImplementationOnce((req, res) => {
            res.status(201).json({
                status: 'success',
                data: {
                    file: req.file ? req.file.originalname : null,
                    tenantId: req.tenantId,
                    body: req.body
                }
            });
        });

        const mockBody = { name: 'Test Item', price: '10.00' };

        const res = await request(app)
            .post('/')
            .attach('image', 'test-data/dummy.jpg')
            .field('name', mockBody.name)
            .field('price', mockBody.price);

        expect(res.statusCode).toEqual(201);
        expect(res.body.data.file).toBe('test.jpg');
        expect(res.body.data.tenantId).toBe('testTenant123');
        expect(menuItemController.createMenuItem).toHaveBeenCalledTimes(1);
        expect(getTempTenantId).toHaveBeenCalledTimes(1);
        expect(upload.single).toHaveBeenCalledTimes(2);

        const postCalls = routerCreatedByMenuItemsRoutes.post.mock.calls;
        const createMenuItemCall = postCalls.find(call => call[0] === '/');
        const [path, tenantMiddleware, uploadMiddleware, controller] = createMenuItemCall;
        expect(tenantMiddleware).toBe(getTempTenantId);
        expect(uploadMiddleware).toBe(upload.single());
        expect(controller).toBe(menuItemController.createMenuItem);
    });
});