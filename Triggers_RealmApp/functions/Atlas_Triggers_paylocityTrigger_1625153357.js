/**
 * When the workersEntity collection contains a document that has a reference to the 
 * updated document's paylocity ID, add the updated document to the 360 worker collection
 * along with the universal ID.
 * 
 * @param {Object} changeEvent
 *   Contains details about the updated document. The fullDocument property of this Object
 *   contains all document's fields with their existing and updated values.
 */
exports = async function(changeEvent) {
  console.log('Updating Paylocity...');
  
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
    await workersEntityCollection.findOne(
      { 'references.paylocity': { $elemMatch: { id: { $eq: `${updatedDocument.companyId}.${updatedDocument.employeeId}` } } } }
    );

  if (workersEntity) {
    const result = await update360WorkerWithPaylocity(worker360Collection, workersEntity, updatedDocument);
  } else {
    console.log(`Universal ID does not exist for Paylocity entity: ${updatedDocument.companyId}.${updatedDocument.employeeId}`);
  }
  
  return true;
}

/**
 * Update the 360 worker collection with paylocity data.
 * 
 * @param {Object} worker360Collection
 *   The worker 360 collection to be updated.
 * @param {Object} workersEntity
 *   The workers entity collection contains a reference to the updated paylocity document.
 * @param {Object} updatedPaylocityDocument
 *   The paylocity document that contains updates.
 */
async function update360WorkerWithPaylocity(worker360Collection, workersEntity, updatedPaylocityDocument) {
  const worker360 = await worker360Collection.findOne({ uid: workersEntity.id });

  // The paylocity data that will be added/updated in the paylocity array.
  const { _id, ...paylocityEmployeeData } = updatedPaylocityDocument;
  
  let updatedPaylocity;
  
  if (worker360 && worker360.paylocity) {
    const paylocityArr = [...worker360.paylocity];
    
    const paylocityWorker = paylocityArr.filter(ref =>
      `${ref.companyId}.${ref.employeeId}` === `${updatedPaylocityDocument.companyId}.${updatedPaylocityDocument.employeeId}`
    );
    
    if (!paylocityWorker || paylocityWorker.length === 0) {
      // Add the new paylocity worker to the existing array.
      updatedPaylocity = paylocityArr;
      updatedPaylocity.push(paylocityEmployeeData);
    }
    else {
      // Update an existing paylocity worker in the array.
      updatedPaylocity = paylocityArr.map(existingPaylocityWorker => {
        if (existingPaylocityWorker.companyId === updatedPaylocityDocument.companyId && 
            existingPaylocityWorker.employeeId === updatedPaylocityDocument.employeeId) {
          return paylocityEmployeeData;
        }
        
        return existingPaylocityWorker;
      });
    }
  }
  else {
    // Create a brand new paylocity array.
    updatedPaylocity = [paylocityEmployeeData];
  }
  
  return await worker360Collection.updateOne(
    { uid: workersEntity.id },
    { 
      $set: {
        uid: workersEntity.id,
        firstName: workersEntity.firstName,
        middleName: workersEntity.middleName,
        lastName: workersEntity.lastName,
        dob: workersEntity.dob,
        email: workersEntity.email,
        phone: workersEntity.phone,
        paylocity: updatedPaylocity
      }
    },
    {
      upsert: true
    }
  );
}
