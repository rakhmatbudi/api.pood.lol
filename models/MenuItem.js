// models/MenuItem.js
const db = require('../config/db');
const MenuItemVariant = require('./MenuItemVariant'); // Import MenuItemVariant model for direct use if needed

class MenuItem {
  // Fetches all menu items along with their category details,
  // optionally including inactive items based on the includeInactive flag.
  static async findAll(includeInactive = false) { // Add includeInactive parameter with default false
    let whereClause = '';
    const values = [];

    if (!includeInactive) {
      whereClause = 'WHERE mi.is_active = true';
    }

    const query = `
      SELECT
          mi.id AS menu_item_id,
          mi.name AS menu_item_name,
          mi.description AS menu_item_description,
          mi.price AS menu_item_price,
          mi.is_active AS menu_item_is_active,
          mi.image_path AS menu_item_image_path,
          mi.created_at AS menu_item_created_at,
          mi.updated_at AS menu_item_updated_at,
          mc.id AS category_id,
          mc.name AS category_name,
          mc.description AS category_description,
          CASE
              WHEN COUNT(miv.id) = 0 THEN '[]'::json -- Handle no variants to return empty array, not [null]
              ELSE json_agg(
                  json_build_object(
                      'id', miv.id,
                      'name', miv.name,
                      'price', miv.price,
                      'is_active', miv.is_active,
                      'created_at', miv.created_at,
                      'updated_at', miv.updated_at
                  ) ORDER BY miv.name
              )
          END AS variants
      FROM
          menu_items mi
      JOIN
          menu_categories mc ON mi.category_id = mc.id
      LEFT JOIN
          menu_item_variants miv ON mi.id = miv.menu_item_id
      ${whereClause} -- Dynamically add WHERE clause
      GROUP BY
          mi.id, mi.name, mi.description, mi.price, mi.is_active, mi.image_path, mi.created_at, mi.updated_at,
          mc.id, mc.name, mc.description -- All non-aggregated columns must be in GROUP BY
      ORDER BY
          mi.name ASC;
    `;
    const { rows } = await db.query(query, values);


    // Map the flat rows into a nested structure for menu items with their variants
    return rows.map(row => ({
      id: row.menu_item_id,
      name: row.menu_item_name,
      description: row.menu_item_description,
      price: row.menu_item_price,
      is_active: row.menu_item_is_active,
      image_path: row.menu_item_image_path,
      created_at: row.menu_item_created_at,
      updated_at: row.menu_item_updated_at,
      category: {
        id: row.category_id,
        name: row.category_name,
        description: row.category_description
      },
      variants: row.variants // variants will already be a JSON array from json_agg
    }));
  }

  // Fetches a single menu item by ID, including its associated variants
  // This method will now also check for active status. If you want to fetch
  // inactive items by ID, you might need a separate method or another flag.
  static async findById(id) {
    const query = `
      SELECT
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.is_active,
        mi.image_path,
        mi.created_at,
        mi.updated_at,
        mc.id AS category_id,
        mc.name AS category_name,
        mc.description AS category_description
      FROM menu_items mi
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.id = $1 AND mi.is_active = true;
    `;
    const { rows: menuItemRows } = await db.query(query, [id]);
    const menuItem = menuItemRows[0];

    if (menuItem) {
      // If menu item found, fetch its variants
      const variants = await MenuItemVariant.findByMenuItemId(menuItem.id);
      return { ...menuItem, variants }; // Combine menu item data with variants
    }
    return undefined; // Return undefined if no menu item found
  }

  // Creates a new menu item
  static async create(menuItemData) {
    const { name, description, price, category_id, is_active, image_path } = menuItemData;
    const query = `
      INSERT INTO menu_items (name, description, price, category_id, is_active, image_path)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [name, description, price, category_id, is_active, image_path];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  // Updates an existing menu item
  static async update(id, menuItemData) {
    const { name, description, price, category_id, is_active, image_path } = menuItemData;
    const query = `
      UPDATE menu_items
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        category_id = COALESCE($4, category_id),
        is_active = COALESCE($5, is_active),
        image_path = COALESCE($6, image_path),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;
    // COALESCE is used here to only update fields that are provided (not null/undefined)
    const values = [name, description, price, category_id, is_active, image_path, id];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  // Deletes a menu item
  static async delete(id) {
    const query = 'DELETE FROM menu_items WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

}

module.exports = MenuItem;