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
  console.log('In bullhornCandidateTrigger.');

  const databaseName = 'view-service';
  const dataSourceName = 'mongodb-atlas';

  const worker360Collection = context.services.get(dataSourceName)
  .db(databaseName)
  .collection('360_Worker_v1');
  
  const workersEntityCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('workersEntity');
  
  // handle delete event
  if (!changeEvent.fullDocument) {
    console.log(`bullhornCandidate document with id '${changeEvent.documentKey._id}' has been deleted.`);
    const idOfDeletedDocument = changeEvent.fullDocumentBeforeChange.id;
    
    const workersEntities =
    await workersEntityCollection.find(
      { 'after.bullhorn_candidate_references': { $elemMatch: { $eq: idOfDeletedDocument } } }
    ).toArray();

    if (workersEntities && workersEntities.length > 0) {
      console.log('Removing Bullhorn Candidate from 360_Worker.');
      await update360WorkersRemoveBullhornCandidate(worker360Collection, workersEntities, idOfDeletedDocument);
    } else {
      console.log(`Universal ID does not exist for Bullhorn entity: ${idOfDeletedDocument}`);
    }

    return true;
  }
  
  // handle other events
  const updatedDocument = changeEvent.fullDocument;

  const workersEntities =
    await workersEntityCollection.find(
      { 'after.bullhorn_candidate_references': { $elemMatch: { $eq: updatedDocument.id } } }
    ).toArray();

  if (workersEntities && workersEntities.length > 0) {
    console.log(`Updating 360_Worker with bullhornCandidate: ${updatedDocument.id}`);
    await update360WorkersWithBullhornCandidate(worker360Collection, workersEntities, updatedDocument);
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
 * @param {Object} workersEntities
 *   The workers entity collections containing a reference to the updated bullhornCandidate document.
 * @param {Object} updatedBullhornCandidateDocument
 *   The bullhornCandidate document that contains updates.
 */
async function update360WorkersWithBullhornCandidate(worker360Collection, workersEntities, updatedBullhornCandidateDocument) {
  for (let i = 0; i < workersEntities.length; i++) {
    const workersEntity = workersEntities[i];
    const worker360 = await worker360Collection.findOne({ _id: workersEntity.after.id });

    // The bullhornCandidate data that will be added/updated in the worker 360 bullhornCandidate array.
    const { _id, ...candidateData } = updatedBullhornCandidateDocument;
  
    let updatedBullhornCandidate;
  
    if (worker360 && worker360.bullhornCandidate) {
      const bullhornCandidateArr = [...worker360.bullhornCandidate];
    
      const candidate = bullhornCandidateArr.filter(ref => ref.id === updatedBullhornCandidateDocument.id);
    
      if (!candidate || candidate.length === 0) {
        console.log(`Adding new bullhornCandidate reference to existing 360_Worker document.`);
        updatedBullhornCandidate = bullhornCandidateArr;
        updatedBullhornCandidate.push(candidateData);
      }
      else {
        console.log(`Updating bullhornCandidate in existing 360_Worker document.`);
        updatedBullhornCandidate = bullhornCandidateArr.map(existingCandidate => {
          if (existingCandidate.id === updatedBullhornCandidateDocument.id) {
            return candidateData;
          }
        
          return existingCandidate;
        });
      }
    }
    else {
      console.log(`Adding new bullhornCandidate to 360_Worker document.`);
      updatedBullhornCandidate = [candidateData];
    }
    
    await context.functions.execute(
      "util_update360Worker",
      worker360Collection,
      workersEntity,
      {
        bullhornCandidate: updatedBullhornCandidate
      }
    );
  }
}

/**
 * Update the 360 worker collection removing the deleted bullhornCandidate data.
 * 
 * @param {Object} worker360Collection
 *   The worker 360 collection to be updated.
 * @param {Object} workersEntities
 *   Array of the workers entity collections containing a reference to the deleted bullhornCandidate document.
 * @param {Object} idOfDeletedDocument
 *   The bullhornCandidate id to be removed from the worker 360 entities
 */
 async function update360WorkersRemoveBullhornCandidate(worker360Collection, workersEntities, idOfDeletedDocument) {
  for (let i = 0; i < workersEntities.length; i++) {
    const workersEntity = workersEntities[i];
    const worker360 = await worker360Collection.findOne({ _id: workersEntity.after.id });

    if (worker360 && worker360.bullhornCandidate) {
      const bullhornCandidateArr = [...worker360.bullhornCandidate];
      const updatedBullhornCandidate = bullhornCandidateArr.filter(ref => ref.id !== idOfDeletedDocument);

      await context.functions.execute(
        "util_update360Worker",
        worker360Collection,
        workersEntity,
        {
          bullhornCandidate: updatedBullhornCandidate
        }
      );
    }
  }
}

