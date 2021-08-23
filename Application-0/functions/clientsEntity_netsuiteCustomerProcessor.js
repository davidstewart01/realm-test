/**
 * Iterates through all netsuiteCustomer reference IDs and updates the 360 client collection
 * with the corresponding netsuiteCustomer entities. The process creates a new array of entities
 * for the iteration, so any previous entities linked that are no longer referenced will be removed.
 * 
 * @param databaseName
 *   The view service database name.
 * @param dataSourceName
 *   The data source that the database belongs to.
 * @param {Object} updatedClientsEntity
 *   The clients entity collection that updated.
 * @param entityArray
 *   The netsuiteCustomer array to to be processed.
 */
 exports = async function(databaseName, dataSourceName, updatedClientsEntity, entityArray) {
  
  const client360Collection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('360_Client_v1');

  const netsuiteCustomerCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('netsuiteCustomer');
  
  let updatedNetsuiteCustomers = [];
  
  for (let i = 0; i < entityArray.length; i++) {
    const customer = entityArray[i];
    const netsuiteCustomer = await netsuiteCustomerCollection.findOne({ id: customer.id });
    
    if (netsuiteCustomer) {
        const {
          _id,
          ...customerData
        } = netsuiteCustomer;
        updatedNetsuiteCustomers.push(customerData);
    }
    else {
      console.log(`No netsuiteCustomer data was available for id: ${customer.id}`);
    }
  }
  
  return await context.functions.execute(
    "util_update360Client",
    client360Collection,
    updatedClientsEntity,
    {
      netsuiteCustomers: updatedNetsuiteCustomers
    }
  );
}
