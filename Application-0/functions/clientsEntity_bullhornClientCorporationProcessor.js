/**
 * Iterates through all bullhornClientCorporation reference IDs and updates the 360 client collection
 * with the corresponding bullhornClientCorporation entities. The process creates a new array of entities
 * for the iteration, so any previous entities linked that are no longer referenced will be removed.
 * 
 * @param databaseName
 *   The view service database name.
 * @param dataSourceName
 *   The data source that the database belongs to.
 * @param {Object} updatedClientsEntity
 *   The clients entity collection that updated.
 * @param entityArray
 *   The bullhornClientCorporation array to to be processed.
 */
 exports = async function(databaseName, dataSourceName, updatedClientsEntity, entityArray) {
  
  const client360Collection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('360_Client_v1');

  const bullhornClientCorporationCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('bullhornClientCorporation');
  
  let updatedBullhornClientCorporations = [];
  
  for (let i = 0; i < entityArray.length; i++) {
    const clientCorporation = entityArray[i];
    const bullhornClientCorporation = await bullhornClientCorporationCollection.findOne({ id: clientCorporation.id });
    
    if (bullhornClientCorporation) {
        const {
          _id,
          ...clientCorporationData
        } = bullhornClientCorporation;
        updatedBullhornClientCorporations.push(clientCorporationData);
    }
    else {
      console.log(`No bullhornClientCorporations data was available for id: ${clientCorporation.id}`);
    }
  }
  
  return await context.functions.execute(
    "util_update360Client",
    client360Collection,
    updatedClientsEntity,
    {
      bullhornClientCorporations: updatedBullhornClientCorporations
    }
  );
}
