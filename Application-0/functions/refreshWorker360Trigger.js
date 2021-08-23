/**
 * Refresh all worker360 entities by re-processing all workersEntities and their linked/referenced data
 */
 exports = async function() {
  console.log("In refreshWorker360Trigger.");

  const databaseName = 'view-service';
  const dataSourceName = 'mongodb-atlas';

  const workersEntityCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('workersEntity');

  const workerDocuments = await workersEntityCollection.find().toArray();

  console.log(`Found ${workerDocuments.length} workers`);
  
  const bulkUpdates = [];

  workerDocuments.forEach((worker) => {
    bulkUpdates.push(
      { 
        updateOne: {
          "filter": { 
            _id: worker._id
          },
          "update": {
            $set: {
              ...worker,
              refreshWorker: new Date().getTime()
            }
          },
          upsert: true
        }
      });
  });

  await workersEntityCollection.bulkWrite(bulkUpdates); 
}