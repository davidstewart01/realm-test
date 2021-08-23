/**
 * When the workersEntity collection contains a document that has a reference to the 
 * updated document's paylocity employee ID (companyId.employeeId), add the updated 
 * document to the 360 worker collection along with the universal ID.
 * 
 * @param {Object} changeEvent
 *   Contains details about the updated document. The fullDocument property of this Object
 *   contains all document's fields with their existing and updated values.
 */
 exports = async function(changeEvent) {
  console.log('In paylocityEmployeeTrigger.');

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
    console.log(`paylocityEmployee document with id '${changeEvent.documentKey._id}' has been deleted.`);
    const { companyId, employeeId } = changeEvent.fullDocumentBeforeChange;
    const idOfDeletedDocument = `${companyId}.${employeeId}`;
    
    const workersEntities =
    await workersEntityCollection.find(
      { 'after.paylocity_candidate_references': { $elemMatch: { $eq: idOfDeletedDocument } } }
    ).toArray();

    if (workersEntities && workersEntities.length > 0) {
      console.log('Removing Paylocity Employee from 360_Worker.');
      await update360WorkersRemovePaylocityEmployee(worker360Collection, workersEntities, companyId, employeeId);
    } else {
      console.log(`Universal ID does not exist for Paylocity Employee entity: ${idOfDeletedDocument}`);
    }

    return true;
  }

  // handle other events
  const updatedDocument = changeEvent.fullDocument;

  const workersEntities =
    await workersEntityCollection.find(
      { 'after.paylocity_candidate_references': { $elemMatch: { $eq: `${updatedDocument.companyId}.${updatedDocument.employeeId}` } } }
    ).toArray();

  if (workersEntities && workersEntities.length > 0) {
    console.log(`Updating 360_Worker with Paylocity Employee: ${updatedDocument.id}`);
    await update360WorkersWithPaylocityEmployee(worker360Collection, workersEntities, updatedDocument);
  } else {
    console.log(`Universal ID does not exist for Paylocity Employee entity: ${updatedDocument.companyId}.${updatedDocument.employeeId}`);
  }
  
  return true;
}

/**
 * Update the 360 worker collection with paylocityEmployee data.
 * 
 * @param {Object} worker360Collection
 *   The worker 360 collection to be updated.
 * @param {Object} workersEntities
 *   The workers entity collections containing a reference to the updated paylocityEmployee document.
 * @param {Object} updatedPaylocityEmployeeDocument
 *   The paylocityEmployee document that contains updates.
 */
async function update360WorkersWithPaylocityEmployee(worker360Collection, workersEntities, updatedPaylocityEmployeeDocument) {
  for (let i = 0; i < workersEntities.length; i++) {
    const workersEntity = workersEntities[i];
    const worker360 = await worker360Collection.findOne({ _id: workersEntity.after.id });

    // The paylocityEmployee data that will be added/updated in the paylocityEmployee array.
    const { _id, ...paylocityEmployeeData } = updatedPaylocityEmployeeDocument;
    
    let updatedPaylocityEmployee;
    
    if (worker360 && worker360.paylocityEmployee) {
      const paylocityEmployeeArr = [...worker360.paylocityEmployee];
      
      const paylocityEmployee = paylocityEmployeeArr.filter(ref =>
        `${ref.companyId}.${ref.employeeId}` === `${updatedPaylocityEmployeeDocument.companyId}.${updatedPaylocityEmployeeDocument.employeeId}`
      );
      
      if (!paylocityEmployee || paylocityEmployee.length === 0) {
        console.log(`Adding new paylocityEmployee reference to existing 360_Worker document.`);
        updatedPaylocityEmployee = paylocityEmployeeArr;
        updatedPaylocityEmployee.push(paylocityEmployeeData);
      }
      else {
        console.log(`Updating paylocityEmployee in existing 360_Worker document.`);
        updatedPaylocityEmployee = paylocityEmployeeArr.map(existingPaylocityEmployee => {
          if (existingPaylocityEmployee.companyId === updatedPaylocityEmployeeDocument.companyId && 
              existingPaylocityEmployee.employeeId === updatedPaylocityEmployeeDocument.employeeId) {
            return paylocityEmployeeData;
          }
          
          return existingPaylocityEmployee;
        });
      }
    }
    else {
      console.log(`Adding new paylocityEmployee to 360_Worker document.`);
      updatedPaylocityEmployee = [paylocityEmployeeData];
    }
    await context.functions.execute(
      "util_update360Worker",
      worker360Collection,
      workersEntity,
      {
        paylocityEmployee: updatedPaylocityEmployee
      }
    );
  }
}

/**
 * Update the 360 worker collection removing the deleted paylocityEmployee data.
 * 
 * @param {Object} worker360Collection
 *   The worker 360 collection to be updated.
 * @param {Object} workersEntities
 *   Array of the workers entity collections containing a reference to the deleted paylocityEmployee document.
 * @param {Object} companyId
 *   The paylocityEmployee company id to be removed from the worker 360 entities
 * @param {Object} emplpyeeId
 *   The paylocityEmployee employee id to be removed from the worker 360 entities
 */
 async function update360WorkersRemovePaylocityEmployee(worker360Collection, workersEntities, companyId, employeeId) {
  for (let i = 0; i < workersEntities.length; i++) {
    const workersEntity = workersEntities[i];
    const worker360 = await worker360Collection.findOne({ _id: workersEntity.after.id });

    if (worker360 && worker360.paylocityEmployee) {
      const paylocityEmployeeArr = [...worker360.paylocityEmployee];
      const updatedPaylocityEmployee = paylocityEmployeeArr.filter(ref => ref.companyId !== companyId && ref.employeeId !== employeeId);

      await context.functions.execute(
        "util_update360Worker",
        worker360Collection,
        workersEntity,
        {
          paylocityEmployee: updatedPaylocityEmployee,
        }
      );
    }
  }
}

