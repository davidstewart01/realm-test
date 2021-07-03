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
  console.log('Updating Bullhorn Candiate...');

  console.log('>>> ', JSON.stringify(changeEvent));
  
  if (!changeEvent.fullDocument) {
    console.log('Full document not available. This indicates that the document has been deleted.');
    return true;
  }
  
  const databaseName = 'view-service';
  const dataSourceName = 'mernShopping';

  const updatedDocument = changeEvent.fullDocument;

  const worker360Collection = context.services.get(dataSourceName)
  .db(databaseName)
  .collection('360_Worker_v1');
  
  const workersEntityCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('workersEntity');

  const workersEntity =
    await workersEntityCollection.findOne({ 'references.bullhornTest': { $elemMatch: { id: { $eq: updatedDocument.id } } } });

  if (workersEntity) {
    const result = await update360WorkerWithBullhornCandidate(worker360Collection, workersEntity, updatedDocument);
  } else {
    console.log(`Universal ID does not exist for Bullhorn entity: ${updatedDocument.id}`);
  }
  
  return true;
}

/**
 * Update the 360 worker collection with bullhornCandidate data.
 * 
 * @param {Object} worker360Collection
 *   The worker 360 collection to be updated.
 * @param {Object} workersEntity
 *   The workers entity collection contains a reference to the updated bullhornCandidate document.
 * @param {Object} updatedBullhornCandidateDocument
 *   The bullhornCandidate document that contains updates.
 */
async function update360WorkerWithBullhornCandidate(collection, workersEntity, updatedBullhornCandidateDocument) {
  const worker360 = await collection.findOne({ uid: workersEntity.id });

  // The bullhornCandidate data that will be added/updated in the worker 360 bullhornCandidate array.
  const { _id, ...candidateData } = updatedBullhornCandidateDocument;
  
  let updatedBullhornCandidate;
  
  if (worker360 && worker360.bullhornCandidate) {
    const bullhornCandidateArr = [...worker360.bullhornCandidate];
    
    const candidate = bullhornCandidateArr.filter(ref => ref.id === updatedBullhornCandidateDocument.id);
    
    if (!candidate || candidate.length === 0) {
      // Add the new bullhornCandidate to the existing array.
      updatedBullhornCandidate = bullhornCandidateArr;
      updatedBullhornCandidate.push(candidateData);
    }
    else {
      // Update an existing bullhornCandidate in the array.
      updatedBullhornCandidate = bullhornCandidateArr.map(existingCandidate => {
        if (existingCandidate.id === updatedBullhornCandidateDocument.id) {
          return candidateData;
        }
        
        return existingCandidate;
      });
    }
  }
  else {
    // Create a brand new bullhornCandidate array.
    updatedBullhornCandidate = [candidateData];
  }
  
  const { _id: __id, ...workersEntityData } = workersEntity;
  
  return await collection.updateOne(
    { uid: workersEntity.id },
    { 
      $set: {
        ...workersEntityData,
        bullhornCandidate: updatedBullhornCandidate
      }
    },
    {
      upsert: true
    }
  );
}
