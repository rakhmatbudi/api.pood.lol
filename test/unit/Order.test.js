const Order = require('../../models/Order');
const db = require('../../config/db');
const OrderItem = require('../../models/OrderItem');

// models/Order.test.js

jest.mock('../../config/db');
jest.mock('../../models/OrderItem');

describe('Order Model', () => {
  const tenant = 'tenant1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all orders for tenant', async () => {
      const mockRows = [{ id: 1, tenant }];
      db.query.mockResolvedValue({ rows: mockRows });
      const result = await Order.findAll(tenant);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [tenant]);
      expect(result).toEqual(mockRows);
    });

    it('returns empty array if no orders', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const result = await Order.findAll(tenant);
      expect(result).toEqual([]);
    });

    it('throws on db error', async () => {
      db.query.mockRejectedValue(new Error('fail'));
      await expect(Order.findAll(tenant)).rejects.toThrow('fail');
    });
  });

  describe('findById', () => {
    it('returns order by id and tenant', async () => {
      const mockRow = { id: 1, tenant };
      db.query.mockResolvedValue({ rows: [mockRow] });
      const result = await Order.findById(1, tenant);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [1, tenant]);
      expect(result).toEqual(mockRow);
    });

    it('returns undefined if not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const result = await Order.findById(999, tenant);
      expect(result).toBeUndefined();
    });

    it('throws on db error', async () => {
      db.query.mockRejectedValue(new Error('fail'));
      await expect(Order.findById(1, tenant)).rejects.toThrow('fail');
    });
  });

  describe('findAllGroupedBySessionDescending', () => {
    it('returns grouped orders', async () => {
      const mockRows = [{ cashier_session_id: 1, orders: [] }];
      db.query.mockResolvedValue({ rows: mockRows });
      const result = await Order.findAllGroupedBySessionDescending(tenant);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [tenant]);
      expect(result).toEqual(mockRows);
    });
  });

  describe('getServiceChargeTaxRate', () => {
    it('returns service charge tax rate', async () => {
      db.query.mockResolvedValue({ rows: [{ amount: '10' }] });
      const result = await Order.getServiceChargeTaxRate(tenant);
      expect(result).toEqual({ amount: '10' });
    });

    it('returns undefined if not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const result = await Order.getServiceChargeTaxRate(tenant);
      expect(result).toBeUndefined();
    });
  });

  describe('getSalesTaxRate', () => {
    it('returns sales tax rate', async () => {
      db.query.mockResolvedValue({ rows: [{ amount: '5' }] });
      const result = await Order.getSalesTaxRate(tenant);
      expect(result).toEqual({ amount: '5' });
    });
  });

  describe('calculateServiceCharge', () => {
    it('returns 0 if no items', async () => {
      OrderItem.findAllByOrderId.mockResolvedValue([]);
      const result = await Order.calculateServiceCharge(1, tenant);
      expect(result).toBe(0);
    });

    it('returns 0 if no service charge tax', async () => {
      OrderItem.findAllByOrderId.mockResolvedValue([{ total_price: '100', status: 'active' }]);
      jest.spyOn(Order, 'getServiceChargeTaxRate').mockResolvedValue(undefined);
      const result = await Order.calculateServiceCharge(1, tenant);
      expect(result).toBe(0);
    });

    it('calculates service charge', async () => {
      OrderItem.findAllByOrderId.mockResolvedValue([
        { total_price: '100', status: 'active' },
        { total_price: '50', status: 'cancelled' }
      ]);
      jest.spyOn(Order, 'getServiceChargeTaxRate').mockResolvedValue({ amount: '10' });
      const result = await Order.calculateServiceCharge(1, tenant);
      expect(result).toBe(10); // 100 * 0.10
    });

    it('throws on error', async () => {
      OrderItem.findAllByOrderId.mockRejectedValue(new Error('fail'));
      await expect(Order.calculateServiceCharge(1, tenant)).rejects.toThrow('fail');
    });
  });

  describe('calculateTaxAmount', () => {
    it('returns 0 if no items', async () => {
      OrderItem.findAllByOrderId.mockResolvedValue([]);
      const result = await Order.calculateTaxAmount(1, tenant);
      expect(result).toBe(0);
    });

    it('returns 0 if no sales tax', async () => {
      OrderItem.findAllByOrderId.mockResolvedValue([{ total_price: '100', status: 'active' }]);
      jest.spyOn(Order, 'getServiceChargeTaxRate').mockResolvedValue({ amount: '10' });
      jest.spyOn(Order, 'getSalesTaxRate').mockResolvedValue(undefined);
      const result = await Order.calculateTaxAmount(1, tenant);
      expect(result).toBe(0);
    });

    it('calculates tax amount', async () => {
      OrderItem.findAllByOrderId.mockResolvedValue([{ total_price: '100', status: 'active' }]);
      jest.spyOn(Order, 'getServiceChargeTaxRate').mockResolvedValue({ amount: '10' });
      jest.spyOn(Order, 'getSalesTaxRate').mockResolvedValue({ amount: '5' });
      const result = await Order.calculateTaxAmount(1, tenant);
      expect(result).toBeCloseTo(5.5); // (100 + 10) * 0.05
    });

    it('throws on error', async () => {
      OrderItem.findAllByOrderId.mockRejectedValue(new Error('fail'));
      await expect(Order.calculateTaxAmount(1, tenant)).rejects.toThrow('fail');
    });
  });

  describe('updateOrderTotalAndServiceCharge', () => {
    it('returns null if no order items', async () => {
      OrderItem.findAllByOrderId.mockResolvedValue(null);
      const result = await Order.updateOrderTotalAndServiceCharge(1, tenant);
      expect(result).toBeNull();
    });

    it('updates order total and service charge', async () => {
      OrderItem.findAllByOrderId.mockResolvedValue([{ total_price: '100', status: 'active' }]);
      jest.spyOn(Order, 'calculateServiceCharge').mockResolvedValue(10);
      db.query.mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await Order.updateOrderTotalAndServiceCharge(1, tenant);
      expect(db.query).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });

    it('throws on error', async () => {
      OrderItem.findAllByOrderId.mockRejectedValue(new Error('fail'));
      await expect(Order.updateOrderTotalAndServiceCharge(1, tenant)).rejects.toThrow('fail');
    });
  });

  describe('updateOrderTotalServiceChargeAndTax', () => {
    it('returns null if no order items', async () => {
      OrderItem.findAllByOrderId.mockResolvedValue(null);
      const result = await Order.updateOrderTotalServiceChargeAndTax(1, tenant);
      expect(result).toBeNull();
    });

    it('updates order total, service charge, and tax', async () => {
      OrderItem.findAllByOrderId.mockResolvedValue([{ total_price: '100', status: 'active' }]);
      jest.spyOn(Order, 'calculateServiceCharge').mockResolvedValue(10);
      jest.spyOn(Order, 'calculateTaxAmount').mockResolvedValue(5);
      jest.spyOn(Order, 'findById').mockResolvedValue({ discount_amount: 2, promo_amount: 1 });
      db.query.mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await Order.updateOrderTotalServiceChargeAndTax(1, tenant);
      expect(db.query).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });

    it('throws on error', async () => {
      OrderItem.findAllByOrderId.mockRejectedValue(new Error('fail'));
      await expect(Order.updateOrderTotalServiceChargeAndTax(1, tenant)).rejects.toThrow('fail');
    });
  });

  describe('calculateServiceChargeForSubtotal', () => {
    it('returns 0 if no service charge tax', async () => {
        // Mock getServiceChargeTaxRate to return undefined for no tax
        jest.spyOn(Order, 'getServiceChargeTaxRate').mockResolvedValue(undefined);

        // Await the function call to get the resolved value
        const result = await Order.calculateServiceChargeForSubtotal(100, tenant);

        // Assert directly on the resolved value
        expect(result).toBe(0);
    });

    it('calculates service charge for subtotal', async () => {
        // Mock getServiceChargeTaxRate to return a specific tax amount
        jest.spyOn(Order, 'getServiceChargeTaxRate').mockResolvedValue({ amount: '10' });

        // Await the function call to get the resolved value
        const result = await Order.calculateServiceChargeForSubtotal(100, tenant);

        // Assert directly on the resolved value
        expect(result).toBe(10);
    });
  });

  describe('create', () => {
    it('throws if tenant missing', async () => {
      await expect(Order.create({})).rejects.toThrow('Tenant ID is required');
    });

    it('creates order with default order_status', async () => {
      jest.spyOn(Order, 'calculateServiceChargeForSubtotal').mockResolvedValue(0);
      db.query.mockResolvedValue({ rows: [{ id: 1 }] });
      const orderData = {
        table_number: 1,
        server_id: 2,
        customer_id: 3,
        cashier_session_id: 4,
        order_type_id: 5,
        tenant
      };
      const result = await Order.create(orderData);
      expect(db.query).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });

    it('creates order with provided order_status', async () => {
      jest.spyOn(Order, 'calculateServiceChargeForSubtotal').mockResolvedValue(0);
      db.query.mockResolvedValue({ rows: [{ id: 2 }] });
      const orderData = {
        table_number: 1,
        server_id: 2,
        customer_id: 3,
        cashier_session_id: 4,
        order_type_id: 5,
        tenant,
        order_status: 2
      };
      const result = await Order.create(orderData);
      expect(result).toEqual({ id: 2 });
    });
  });

  describe('updateOrderStatus', () => {
    it('updates order status and cascades to items', async () => {
        const tenantId = 'test_tenant_id'; // Define your tenant variable

        const mockClient = {
            query: jest.fn()
                // 1. Mock for 'BEGIN' transaction
                .mockResolvedValueOnce({ rows: [] })
                // 2. Mock for getting status ID (SELECT id FROM order_status)
                .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // For 'cancelled' status
                // 3. Mock for updating the main order (UPDATE orders)
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // The updated order object you expect
                // 4. Mock for updating order items (UPDATE order_items)
                .mockResolvedValueOnce({ rows: [] })
                // 5. Mock for 'COMMIT' transaction
                .mockResolvedValueOnce({ rows: [] }),
            release: jest.fn(),
        };
        db.connect.mockResolvedValue(mockClient);

        const result = await Order.updateOrderStatus(1, 'cancelled', tenantId);

        // Verify all query calls were made in the correct sequence
        expect(mockClient.query).toHaveBeenCalledTimes(5);

        // Corrected order of assertions:
        expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');

        expect(mockClient.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('SELECT id FROM order_status WHERE name = $1 AND tenant = $2'),
            ['cancelled', tenantId]
        );

        expect(mockClient.query).toHaveBeenNthCalledWith(
            3,
            expect.stringContaining('UPDATE orders SET order_status = $1, is_open = $2'),
            [2, false, 1, tenantId]
        );

        // The update items query condition: (statusName.toLowerCase() === 'cancelled') is true
        expect(mockClient.query).toHaveBeenNthCalledWith(
            4,
            expect.stringContaining('UPDATE order_items SET status = $1'),
            ['cancelled', 1, tenantId]
        );

        expect(mockClient.query).toHaveBeenNthCalledWith(5, 'COMMIT');

        // Assert that the function returned the expected value
        expect(result).toEqual({ id: 1 });
        expect(mockClient.release).toHaveBeenCalledTimes(1);
    });

    it('throws if status name invalid', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        release: jest.fn(),
      };
      db.connect.mockResolvedValue(mockClient);
      await expect(Order.updateOrderStatus(1, 'invalid', tenant)).rejects.toThrow('Invalid status name');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rolls back and throws on error', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('fail')),
        release: jest.fn(),
      };
      db.connect.mockResolvedValue(mockClient);
      await expect(Order.updateOrderStatus(1, 'closed', tenant)).rejects.toThrow('fail');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws if tenant missing', async () => {
      await expect(Order.update(1, {})).rejects.toThrow('Tenant ID is required');
    });

    it('returns null if no fields to update', async () => {
      const orderData = { tenant };
      const result = await Order.update(1, orderData);
      expect(result).toBeNull();
    });

    it('updates order fields', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 1 }] });
      const orderData = { table_number: 1, tenant };
      const result = await Order.update(1, orderData);
      expect(db.query).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findByStatus', () => {
    it('returns orders by status', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // statusRows
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // orders
      const result = await Order.findByStatus('open', tenant);
      expect(result).toEqual([{ id: 1 }]);
    });

    it('returns empty array if no status found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      const result = await Order.findByStatus('missing', tenant);
      expect(result).toEqual([]);
    });
  });

  describe('findOpenOrders', () => {
    it('returns open orders', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await Order.findOpenOrders(tenant);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('findOpenOrdersBySession', () => {
    it('returns open orders by session', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await Order.findOpenOrdersBySession(123, tenant);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('getOrdersBySessionId', () => {
    it('returns orders by session id', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await Order.getOrdersBySessionId(123, tenant);
      expect(result).toEqual([{ id: 1 }]);
    });

    it('throws on db error', async () => {
      db.query.mockRejectedValue(new Error('fail'));
      await expect(Order.getOrdersBySessionId(123, tenant)).rejects.toThrow('fail');
    });
  });

  describe('delete', () => {
    it('deletes order by id and tenant', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 1 }] });
      const result = await Order.delete(1, tenant);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [1, tenant]);
      expect(result).toEqual({ id: 1 });
    });

    it('returns undefined if not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const result = await Order.delete(999, tenant);
      expect(result).toBeUndefined();
    });
  });
});

// We recommend installing an extension to run jest tests.