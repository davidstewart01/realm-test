/**
 * Iterates through all salesforceAccount reference IDs and updates the 360 client collection
 * with the corresponding salesforceAccount entities. The process creates a new array of entities
 * for the iteration, so any previous entities linked that are no longer referenced will be removed.
 * 
 * @param databaseName
 *   The view service database name.
 * @param dataSourceName
 *   The data source that the database belongs to.
 * @param {Object} updatedClientsEntity
 *   The clients entity collection that updated.
 * @param entityArray
 *   The salesforceAccount array to to be processed.
 */
 exports = async function(databaseName, dataSourceName, updatedClientsEntity, entityArray) {
  
  const client360Collection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('360_Client_v1');

  const salesforceAccountCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('salesforceAccount');
  
  let updatedSalesforceAccounts = [];
  
  for (let i = 0; i < entityArray.length; i++) {
    const account = entityArray[i];
    const salesforceAccount = await salesforceAccountCollection.findOne({ _id: account.id });
    
    if (salesforceAccount) {
        const {
          _id,
          ...accountData
        } = salesforceAccount;
        updatedSalesforceAccounts.push(accountData);
    }
    else {
      console.log(`No salesforceAccount data was available for id: ${account.id}`);
    }
  }
  
  return await context.functions.execute(
    "util_update360Client",
    client360Collection,
    updatedClientsEntity,
    {
      salesforceAccounts: updatedSalesforceAccounts
    }
  );
}
