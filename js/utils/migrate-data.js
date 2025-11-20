// Data migration script to populate initial data in Supabase
// Run this script once to set up the database with initial items and prices

const MIGRATION_DATA = {
  items: [
    {
      model_key: 'table1',
      name: 'Center Table',
      category: 'Tables',
      model_file_path: 'table1.obj' // Still using local file for table
    },
    {
      model_key: 'wardrobe1',
      name: 'Wardrobe Modern',
      category: 'Bedroom',
      model_file_path: 'wardrobe_modern.obj'
    },
    {
      model_key: 'wardrobe2',
      name: 'Wardrobe Traditional',
      category: 'Bedroom',
      model_file_path: 'wardrobe_traditional.obj'
    },
    {
      model_key: 'wardrobe3',
      name: 'Wardrobe Open Frame',
      category: 'Bedroom',
      model_file_path: 'wardrobe_openframe.obj'
    }
  ],
  prices: {
    wardrobe1: {
      name: 'Wardrobe Modern',
      stores: {
        'All-Home': 11500,
        'Wilcon Depot': 12500,
        'Gaisano': 12000,
        'Local suppliers': 11800
      }
    },
    wardrobe2: {
      name: 'Wardrobe Traditional',
      stores: {
        'All-Home': 14500,
        'Wilcon Depot': 15500,
        'Gaisano': 15000,
        'Local suppliers': 14800
      }
    },
    wardrobe3: {
      name: 'Wardrobe Open Frame',
      stores: {
        'All-Home': 17500,
        'Wilcon Depot': 18500,
        'Gaisano': 18000,
        'Local suppliers': 17800
      }
    },
    table1: {
      name: 'Center Table',
      stores: {
        'Default': 8500
      }
    }
  }
};

/**
 * Run migration to populate database
 */
async function runMigration() {
  try {
    console.log('Starting data migration...');

    // Step 1: Insert items
    console.log('Step 1: Inserting items...');
    const { data: insertedItems, error: itemsError } = await supabase
      .from('items')
      .upsert(MIGRATION_DATA.items, { onConflict: 'model_key' })
      .select();

    if (itemsError) {
      throw new Error(`Error inserting items: ${itemsError.message}`);
    }

    console.log(`Inserted ${insertedItems.length} items`);

    // Step 2: Insert prices
    console.log('Step 2: Inserting prices...');
    const priceInserts = [];

    for (const [modelKey, priceData] of Object.entries(MIGRATION_DATA.prices)) {
      const item = insertedItems.find(i => i.model_key === modelKey);
      if (!item) {
        console.warn(`Item not found for model_key: ${modelKey}`);
        continue;
      }

      for (const [storeName, price] of Object.entries(priceData.stores)) {
        priceInserts.push({
          item_id: item.id,
          store_name: storeName,
          price: price
        });
      }
    }

    if (priceInserts.length > 0) {
      // Delete existing prices for these items first
      const itemIds = insertedItems.map(i => i.id);
      await supabase
        .from('item_prices')
        .delete()
        .in('item_id', itemIds);

      // Insert new prices
      const { data: insertedPrices, error: pricesError } = await supabase
        .from('item_prices')
        .insert(priceInserts)
        .select();

      if (pricesError) {
        throw new Error(`Error inserting prices: ${pricesError.message}`);
      }

      console.log(`Inserted ${insertedPrices.length} prices`);
    }

    console.log('Migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize migration (can be called from browser console)
 */
async function initMigration() {
  // Check if user is authenticated and admin
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    console.error('Migration requires admin privileges');
    if (typeof showDialog === 'function') {
      await showDialog('Migration requires admin privileges', 'Access Denied');
    } else {
      alert('Migration requires admin privileges');
    }
    return;
  }

  const result = await runMigration();
  if (result.success) {
    if (typeof showDialog === 'function') {
      await showDialog('Migration completed successfully!', 'Success');
    } else {
      alert('Migration completed successfully!');
    }
  } else {
    if (typeof showDialog === 'function') {
      await showDialog('Migration failed: ' + result.error, 'Error');
    } else {
      alert('Migration failed: ' + result.error);
    }
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runMigration = initMigration;
}

