/**
 * When the workersEntity collection contains a document that has a reference to the 
 * updated document's bullhorn ID, add the updated document to the 360 worker collection
 * along with the universal ID.
 * 
 * @param {Object} changeEvent
 *   Contains details about the updated document. The fullDocument property of this Object
 *   contains all document's fields with their existing and updated values.
 */
 exports = async function(changeEvent) {
  console.log('Updating Bullhorn Client Corporations...');

  const databaseName = 'view-service';
  const dataSourceName = 'mernShopping';

  // const worker360Collection = context.services.get(dataSourceName)
  // .db(databaseName)
  // .collection('360_Worker_v1');
  
  // const workersEntityCollection = context.services.get(dataSourceName)
  //   .db(databaseName)
  //   .collection('workersEntity');
  
  // // handle delete event
  // if (!changeEvent.fullDocument) {
  //   const idOfDeletedDocument = changeEvent.fullDocumentBeforeChange.id;
    
  //   const workersEntities =
  //   await workersEntityCollection.find(
  //     { 'after.bullhorn_candidate_references': { $elemMatch: { $eq: idOfDeletedDocument } } }
  //   ).toArray();

  //   if (workersEntities && workersEntities.length > 0) {
  //     await update360WorkersRemoveBullhornCandidate(worker360Collection, workersEntities, idOfDeletedDocument);
  //   } else {
  //     console.log(`Universal ID does not exist for Bullhorn entity: ${idOfDeletedDocument}`);
  //   }

    return true;
}
