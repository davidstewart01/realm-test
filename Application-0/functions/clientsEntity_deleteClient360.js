/**
 * Deletes client360 entity when corresponding client entity has been deleted.
 * 
 * @param databaseName
 *   The view service database name.
 * @param dataSourceName
 *   The data source that the database belongs to.
 * @param clientId
 *   The id of the client entity being deleted.
 */
 exports = async function(databaseName, dataSourceName, clientId) {
  const client360Collection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('360_Client_v1');
  
  return await client360Collection.deleteOne(
    { _id: clientId },
  );
};