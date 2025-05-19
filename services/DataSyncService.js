const db = require('../config/db'); // Main database connection
const db_serendipity = require('../config/db_serendipity'); // Source database connection
const { v4: uuidv4 } = require('uuid');

class DataSyncService {
    /**
     * Synchronizes data from the source table to the destination table.
     * @param {string} sourceTable - The name of the table in the source database.
     * @param {string} destinationTable - The name of the table in the destination database.
     * @param {object} [options] - Additional options for the synchronization process.
     * @param {object} [options.columnMapping] - An object mapping source column names to destination column names.  If not provided, assumes same names.
     * @param {string} [options.idField] - The primary key field in the destination table. Defaults to 'id'.
     * @param {boolean} [options.useUuid] - Whether to use UUIDs for new records in the destination table.  Defaults to false.
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
            console.log(`Fetched ${sourceData.length} records from ${sourceTable}.`);
    
            // Debug - log the first record to see what we're working with
            if (sourceData.length > 0) {
                console.log('Sample source record:', sourceData[0]);
            }
    
            // 2. Process each record from the source
            for (const sourceRecord of sourceData) {
                const destinationRecord = {};
                
                // Only include fields that have an explicit mapping and are not undefined
                for (const sourceKey in columnMapping) {
                    const destinationKey = columnMapping[sourceKey];
                    // Only add defined values - skip undefined or null values
                    if (sourceRecord[sourceKey] !== undefined) {
                        destinationRecord[destinationKey] = sourceRecord[sourceKey];
                    } else {
                        console.log(`Warning: Source field ${sourceKey} is undefined in record`, sourceRecord);
                    }
                }
                
                // Generate UUID if needed - make sure the ID field is always set
                if (useUuid) {
                    destinationRecord[idField] = destinationRecord[idField] || uuidv4();
                }
                
                // Debug - log what we're about to insert/update
                console.log('Destination record to be processed:', destinationRecord);
    
                // Skip processing if we don't have a valid ID
                if (!destinationRecord[idField]) {
                    console.error(`Error: Missing ID field (${idField}) for record:`, sourceRecord);
                    continue; // Skip this record and continue with the next
                }
    
                // 3. Check if the record exists in the destination table.
                const checkQuery = `SELECT ${idField} FROM ${destinationTable} WHERE ${idField} = $1`;
                const checkValue = destinationRecord[idField];
                
                console.log(`Checking if record exists with ${idField} = ${checkValue}`);
                
                const { rows: existingRecords } = await db.query(checkQuery, [checkValue]);
    
                if (existingRecords.length > 0) {
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
                    const insertColumns = Object.keys(destinationRecord).join(', ');
                    const insertValuesTemplate = Object.keys(destinationRecord).map((_, i) => `$${i + 1}`).join(', ');
                    const insertValues = Object.values(destinationRecord);
    
                    // Add created_at and updated_at fields
                    const insertQuery = `
                        INSERT INTO ${destinationTable} (${insertColumns}, created_at, updated_at)
                        VALUES (${insertValuesTemplate}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
                useUuid: true
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
                  item_category: 'category_id'
              },
              useUuid: true
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
            console.log('Full data synchronization complete.');
        } catch (error) {
            console.error('Error during full data synchronization:', error);
            throw error; // rethrow
        }
    }
}

module.exports = DataSyncService;
