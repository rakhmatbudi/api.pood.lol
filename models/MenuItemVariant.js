// models/MenuItemVariant.js
const db = require('../config/db'); // Your database client

class MenuItemVariant {
  /**
   * Fetches all menu item variants from the database.
   * @returns {Promise<Array>} A promise that resolves to an array of all menu item variants.
   */
  static async findAll() {
    const query = 'SELECT * FROM public.menu_item_variants ORDER BY name ASC;';
    const { rows } = await db.query(query);
    return rows;
  }

  /**
   * Fetches a single menu item variant by its ID.
   * @param {number} id - The ID of the menu item variant.
   * @returns {Promise<Object|undefined>} A promise that resolves to the menu item variant object or undefined if not found.
   */
  static async findById(id) {
    const query = 'SELECT * FROM public.menu_item_variants WHERE id = $1;';
    const { rows } = await db.query(query, [id]);
    return rows[0]; // Returns the first row or undefined
  }

  /**
   * Fetches all menu item variants associated with a specific menu item ID.
   * @param {number} menuItemId - The ID of the parent menu item.
   * @returns {Promise<Array>} A promise that resolves to an array of variants for the given menu item.
   */
  static async findByMenuItemId(menuItemId) {
    const query = 'SELECT * FROM public.menu_item_variants WHERE menu_item_id = $1 ORDER BY name ASC;';
    const { rows } = await db.query(query, [menuItemId]);
    return rows;
  }

  /**
   * Creates a new menu item variant in the database.
   * @param {Object} variantData - The data for the new menu item variant.
   * @param {number} variantData.menu_item_id - The ID of the menu item this variant belongs to.
   * @param {string} variantData.name - The name of the variant (e.g., "Large", "Add Cheese").
   * @param {number} variantData.price - The price of the variant.
   * @param {boolean} variantData.is_active - Whether the variant is active (defaults to true).
   * @returns {Promise<Object>} A promise that resolves to the newly created menu item variant object.
   */
  static async create({ menu_item_id, name, price, is_active }) {
    const query = `
      INSERT INTO public.menu_item_variants (menu_item_id, name, price, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [menu_item_id, name, price, is_active];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Updates an existing menu item variant in the database.
   * @param {number} id - The ID of the menu item variant to update.
   * @param {Object} variantData - The data to update the menu item variant with.
   * @param {string} [variantData.name] - The new name of the variant.
   * @param {number} [variantData.price] - The new price of the variant.
   * @param {boolean} [variantData.is_active] - The new active status of the variant.
   * @returns {Promise<Object|undefined>} A promise that resolves to the updated menu item variant object or undefined if not found.
   */
  static async update(id, { name, price, is_active }) {
    const query = `
      UPDATE public.menu_item_variants
      SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        is_active = COALESCE($3, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;
    // COALESCE ensures that if a field is not provided (null/undefined), it retains its current value
    const values = [name, price, is_active, id];
    const { rows } = await db.query(query, values);
    return rows[0]; // Returns the updated item or undefined if not found
  }

  /**
   * Deletes a menu item variant from the database.
   * @param {number} id - The ID of the menu item variant to delete.
   * @returns {Promise<Object|undefined>} A promise that resolves to the deleted menu item variant object or undefined if not found.
   */
  static async delete(id) {
    const query = 'DELETE FROM public.menu_item_variants WHERE id = $1 RETURNING *;';
    const { rows } = await db.query(query, [id]);
    return rows[0]; // Returns the deleted item or undefined if not found
  }
}

module.exports = MenuItemVariant;