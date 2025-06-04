// services/DataSyncService.js

const db = require('../config/db'); // Main database connection
const db_serendipity = require('../config/db_serendipity'); // Source database connection
const { v4: uuidv4 } = require('uuid');

class DataSyncService {
    /**
     * Synchronizes data from the source table to the destination table.
     * @param {string} sourceTable - The name of the table in the source database.
     * @param {string} destinationTable - The name of the table in the destination database.
     * @param {object} [options] - Additional options for the synchronization process.
     * @param {object} [options.columnMapping] - An object mapping source column names to destination column names. If not provided, assumes same names.
     * @param {string} [options.idField] - The primary key field in the destination table. Defaults to 'id'.
     * @param {boolean} [options.useUuid] - Whether to use UUIDs for new records in the destination table. Defaults to false.
     * @param {string[]} [options.includeColumns] - Specific columns to select from the source table. If not provided, selects all columns.
     * @returns {Promise<void>}
     */
    static async syncTable(sourceTable, destinationTable, options = {}) {
        const {
            columnMapping = {},
            idField = 'id',
            useUuid = false,
            includeColumns = []
        } = options;

        try {
            // 1. Fetch data from the source table with selected columns
            let sourceQuery;
            if (includeColumns.length > 0) {
                // Only select specified columns
                sourceQuery = `SELECT ${includeColumns.join(', ')} FROM ${sourceTable}`;
            } else {
                // Select all columns (original behavior)
                sourceQuery = `SELECT * FROM ${sourceTable}`;
            }

            const { rows: sourceData } = await db_serendipity.query(sourceQuery);
            console.log(`Processed ${sourceData.length} records from ${sourceTable}.`);

            // Debug - log the first record to see what we're working with
            if (sourceData.length > 0) {
                console.log('Sample source record:', sourceData[0]);
            }

            // 2. Process each record from the source
            for (const sourceRecord of sourceData) {
                const destinationRecord = {};

                // --- IMPORTANT: Log the source record to verify its content and casing ---
                console.log('Original Source Record:', sourceRecord);
            
                // Only include fields that have an explicit mapping and are not undefined
                for (const sourceKey in columnMapping) {
                    const destinationKey = columnMapping[sourceKey];
                    // Only add defined values - skip undefined or null values
                    if (sourceRecord[sourceKey] !== undefined) {
                        // Special handling for boolean conversion if necessary (e.g., 'True'/'False' to boolean)
                        if (destinationKey === 'is_active' && typeof sourceRecord[sourceKey] === 'string') {
                            destinationRecord[destinationKey] = (sourceRecord[sourceKey].toLowerCase() === 'true' || sourceRecord[sourceKey] === '1');
                        } else {
                            destinationRecord[destinationKey] = sourceRecord[sourceKey];
                        }
                    } else {
                        console.log(`Warning: Source field ${sourceKey} is undefined in record`, sourceRecord);
                    }
                }

                // Generate UUID if needed - make sure the ID field is always set
                // This logic is now inside the loop for each record
                if (useUuid && !destinationRecord[idField]) { // Only generate if UUID is desired AND idField is not already populated by mapping
                    destinationRecord[idField] = uuidv4();
                }


                // Debug - log what we're about to insert/update
                console.log('Destination record to be processed:', destinationRecord);

                // Skip processing if we don't have a valid ID (especially for serial types where ID isn't mapped from source)
                // For tables with serial PKs, `idField` shouldn't be mapped in `columnMapping`
                // and `useUuid` should be false. The DB will assign the ID on insert.
                // We'll proceed with insert if the ID is not explicitly set from source and not using UUID.
                if (!destinationRecord[idField] && !useUuid && idField === 'id' && destinationTable !== 'promo_item') {
                  // This condition handles cases where the ID is auto-generated in the destination
                  // For promo_item, its ID is also serial, so we won't have it here.
                  // We'll proceed to attempt an insert/update.
                } else if (!destinationRecord[idField]) { // If ID is expected (mapped or UUID) but missing
                    console.error(`Error: Missing ID field (${idField}) for record:`, sourceRecord);
                    continue; // Skip this record and continue with the next
                }

                // 3. Check if the record exists in the destination table.
                const checkQuery = `SELECT ${idField} FROM ${destinationTable} WHERE ${idField} = $1`;
                const checkValue = destinationRecord[idField];

                let existingRecords = { rows: [] };
                // Only attempt to check existence if the idField has a value (i.e., not a new serial ID)
                if (checkValue !== undefined && checkValue !== null) {
                    console.log(`Checking if record exists with ${idField} = ${checkValue}`);
                    existingRecords = await db.query(checkQuery, [checkValue]);
                }


                if (existingRecords.rows.length > 0) {
                    // 4a. Update the existing record.
                    const updateFields = Object.keys(destinationRecord).filter(key => key !== idField);

                    // Skip update if there are no fields to update
                    if (updateFields.length === 0) {
                        console.log(`No fields to update for record with ${idField} = ${checkValue}`);
                        continue;
                    }

                    const updateColumns = updateFields
                        .map((key, index) => `${key} = $${index + 1}`)
                        .join(', ');

                    const updateValues = updateFields.map(key => destinationRecord[key]);
                    updateValues.push(checkValue); // Add the ID value for the WHERE clause

                    const updateQuery = `
                        UPDATE ${destinationTable}
                        SET ${updateColumns}, updated_at = CURRENT_TIMESTAMP
                        WHERE ${idField} = $${updateValues.length}
                        RETURNING *
                    `;

                    try {
                        console.log('Executing UPDATE query:', updateQuery);
                        console.log('With values:', updateValues);

                        const { rows: updatedRows } = await db.query(updateQuery, updateValues);
                        console.log(`Updated record in ${destinationTable}:`, updatedRows[0]);
                    } catch (updateError) {
                        console.error(`Error updating record in ${destinationTable}:`, updateError);
                        throw updateError; // rethrow
                    }
                } else {
                    // 4b. Insert the new record.
                    // Filter out the idField if it's a serial primary key and useUuid is false,
                    // allowing the database to generate it.
                    let insertColumns = Object.keys(destinationRecord);
                    let insertValues = Object.values(destinationRecord);
                    let insertValuesTemplate = Object.keys(destinationRecord).map((_, i) => `$${i + 1}`);

                    // Adjust for serial primary keys where ID is auto-generated
                    if (!useUuid && idField === 'id' && (destinationTable === 'promo_item' || destinationTable === 'menu_item_variants')) {
                      const idFieldIndex = insertColumns.indexOf(idField);
                      if (idFieldIndex > -1) {
                        insertColumns.splice(idFieldIndex, 1);
                        insertValues.splice(idFieldIndex, 1);
                        insertValuesTemplate.splice(idFieldIndex, 1);
                        // Re-adjust parameter indices for the template
                        insertValuesTemplate = insertValuesTemplate.map((_, i) => `$${i + 1}`);
                      }
                    }

                    const insertQuery = `
                        INSERT INTO ${destinationTable} (${insertColumns.join(', ')}, created_at, updated_at)
                        VALUES (${insertValuesTemplate.join(', ')}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING *
                    `;

                    try {
                        console.log('Executing INSERT query:', insertQuery);
                        console.log('With values:', insertValues);

                        const { rows: insertedRows } = await db.query(insertQuery, insertValues);
                        console.log(`Inserted record into ${destinationTable}:`, insertedRows[0]);
                    } catch(insertError){
                        console.error(`Error inserting into ${destinationTable}:`, insertError);
                        throw insertError;
                    }
                }
            }
            console.log(`Synchronization of ${sourceTable} to ${destinationTable} complete.`);
        } catch (error) {
            console.error(`Error synchronizing ${sourceTable} to ${destinationTable}:`, error);
            throw error; // rethrow
        }
    }

    /**
     * Synchronizes item categories from komuni40_cafeserendipity.item_category to komuni40.menu_categories.
     * @returns {Promise<void>}
     */
    static async syncItemCategories() {
        await DataSyncService.syncTable(
            'item_category',
            'menu_categories',
            {
                columnMapping: {
                    item_category_id: 'id',
                    item_category_description: 'name'
                    // Only map columns that exist in destination table
                },
                includeColumns: [
                    'item_category_id',
                    'item_category_description'
                    // Only select these columns from the source
                ],
                useUuid: true // Assuming 'id' in menu_categories uses UUID
            }
        );
    }

   /**
     * Synchronizes items from komuni40_cafeserendipity.item to komuni40.menu_items.
     * @returns {Promise<void>}
     */
    static async syncMenuItems() {
      await DataSyncService.syncTable(
          'item',
          'menu_items',
          {
              columnMapping: {
                  item_id: 'id',
                  item_name: 'name',
                  item_description: 'description',
                  item_price: 'price',
                  is_active: 'is_active',
                  item_photo1: 'image_path',
                  item_category: 'category_id' // Assuming this maps correctly
              },
              useUuid: true // Assuming 'id' in menu_items uses UUID
          }
      );
    }

    /**
     * Synchronizes item variants from komuni40_cafeserendipity.item_variant to komuni40.menu_item_variants.
     * @returns {Promise<void>}
     */
    static async syncItemVariants() {
        await DataSyncService.syncTable(
            'item_variant',
            'menu_item_variants',
            {
                columnMapping: {
                    variant_id: 'id', // Source variant_id to destination id
                    item_id: 'menu_item_id',
                    variant_name: 'name',
                    variant_price: 'price',
                    is_active: 'is_active'
                },
                // idField: 'id' (default, explicitly for clarity)
                // useUuid: false because destination 'id' is serial4
            }
        );
    }

    /**
     * Synchronizes promos from `source_db.promo` to `destination_db.promo`.
     * @returns {Promise<void>}
     */
    static async syncPromos() {
        await DataSyncService.syncTable(
            'promo', // Source table
            'promo', // Destination table (assuming same name)
            {
                columnMapping: {
                    // VERIFY THESE SOURCE_KEY (left side) NAMES AGAINST YOUR ACTUAL SOURCE DB SCHEMA AND QUERY RESULT.
                    // Pay attention to case. If source has 'Promo_id' it must be mapped as 'Promo_id' here.
                    promo_id: 'promo_id',
                    promo_name: 'promo_name',
                    promo_description: 'promo_description',
                    start_date: 'start_date',
                    end_date: 'end_date',
                    term_and_condition: 'term_and_condition',
                    picture: 'picture',
                    type: 'type',
                    discount_type: 'discount_type',
                    discount_amount: 'discount_amount',
                    is_active: 'is_active'
                },
                idField: 'promo_id', // Primary key for promos in destination
                useUuid: false // Correct for serial4
            }
        );
    }

    /**
     * Synchronizes promo items from `source_db.promo_item` to `destination_db.promo_item`.
     * This must run AFTER syncPromos and syncMenuItems because of foreign key dependencies.
     * @returns {Promise<void>}
     */
    static async syncPromoItems() {
        await DataSyncService.syncTable(
            'promo_item', // Source table
            'promo_item', // Destination table (assuming same name)
            {
                columnMapping: {
                    id: 'id', // Assuming 'id' is the primary key in both, and serial in destination
                    promo_id: 'promo_id',
                    item_id: 'item_id'
                },
                idField: 'id', // Primary key for promo_item
                useUuid: false // 'id' in promo_item is serial4, let the DB handle it
            }
        );
    }

    /**
     * Performs full synchronization of all data.
     * @returns {Promise<void>}
     */
    static async fullSync() {
        try {
            console.log('Starting full data synchronization...');
            await DataSyncService.syncItemCategories();
            await DataSyncService.syncMenuItems();
            await DataSyncService.syncItemVariants();
            await DataSyncService.syncPromos(); // NEW: Sync promos first
            await DataSyncService.syncPromoItems(); // NEW: Sync promo items after promos and menu items
            console.log('Full data synchronization complete.');
        } catch (error) {
            console.error('Error during full data synchronization:', error);
            throw error; // rethrow
        }
    }
}

module.exports = DataSyncService;