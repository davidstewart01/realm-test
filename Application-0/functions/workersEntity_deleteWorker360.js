/**
 * Deletes worker360 entity when corresponding worker entity has been deleted.
 * 
 * @param databaseName
 *   The view service database name.
 * @param dataSourceName
 *   The data source that the database belongs to.
 * @param workerId
 *   The id of the worker entity being deleted.
 */
 exports = async function(databaseName, dataSourceName, workerId) {
  const worker360Collection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('360_Worker_v1');
  
  return await worker360Collection.deleteOne(
    { _id: workerId },
  );
};