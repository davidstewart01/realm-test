/**
 * Refresh all client360 entities by re-processing all clientsEntities and their linked/referenced data
 */
 exports = async function() {
  console.log("In refreshClient360Trigger.");

  const databaseName = 'view-service';
  const dataSourceName = 'mongodb-atlas';

  const clientsEntityCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('clientsEntity');

  const clientDocuments = await clientsEntityCollection.find().toArray();

  console.log(`Found ${clientDocuments.length} clients`);
  
  const bulkUpdates = [];

  clientDocuments.forEach((client) => {
    bulkUpdates.push(
      { 
        updateOne: {
          "filter": { 
            _id: client._id
          },
          "update": {
            $set: {
              ...client,
              refreshClient: new Date().getTime()
            }
          },
          upsert: true
        }
      });
  });

  await clientsEntityCollection.bulkWrite(bulkUpdates); 
}