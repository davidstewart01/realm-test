/**
 * When the workersEntity collection contains a document that has a reference to the
 * paylocity companyId.employeeId that is referenced within an updated/inserted pay
 * statement (_id: companyId.employeeId.year), add/update the pay statement 
 * document in the 360 worker collection along with the universal ID.
 * 
 * @param {Object} changeEvent
 *   Contains details about the updated document. The fullDocument property of this Object
 *   contains all document's fields with their existing and updated values.
 */
 exports = async function(changeEvent) {
  console.log('In paylocityPayStatementTrigger.');

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
    console.log(`paylocityPayStatement document with id '${changeEvent.documentKey._id}' has been deleted.`);
    const payStatementToRemove = changeEvent.fullDocumentBeforeChange;
    const workersEntities =
    await workersEntityCollection.find(
      { 'after.primary_paylocity_reference': `${payStatementToRemove.companyId}.${payStatementToRemove.employeeId}` }
    ).toArray();

    if (workersEntities && workersEntities.length > 0) {
      console.log('Removing Paylocity Pay Statement from 360_Worker.');
      await update360WorkersRemovePaylocityPayStatement(worker360Collection, workersEntities, payStatementToRemove);
    } else {
      console.log(`Universal ID does not exist for Paylocity PayStatement entity: ${payStatementToRemove.companyId}.${payStatementToRemove.employeeId}`);
    }

    return true;
  }
  
  // handle other events
  const updatedDocument = changeEvent.fullDocument;

  const workersEntities =
    await workersEntityCollection.find(
      { 'after.primary_paylocity_reference': `${updatedDocument.companyId}.${updatedDocument.employeeId}` }
    ).toArray();

  if (workersEntities && workersEntities.length > 0) {
    console.log(`Updating 360_Worker with Paylocity Pay Statement: ${updatedDocument.id}`);
    await update360WorkersWithPaylocityPayStatement(worker360Collection, workersEntities, updatedDocument);
  } else {
    console.log(`Universal ID does not exist for Paylocity pay statement entity: ${updatedDocument.companyId}.${updatedDocument.employeeId}`);
  }
  
  return true;
}

/**
 * Update the 360 worker collection with paylocityPayStatement data.
 * 
 * @param {Object} worker360Collection
 *   The worker 360 collection to be updated.
 * @param {Object} workersEntities
 *   The workers entity collections containing a reference to the updated paylocityPayStatement document.
 * @param {Object} updatedPaylocityPayStatementDocument
 *   The paylocityPayStatement document that contains updates.
 */
async function update360WorkersWithPaylocityPayStatement(worker360Collection, workersEntities, updatedPaylocityPayStatementDocument) {
  for (let i = 0; i < workersEntities.length; i++) {
    const workersEntity = workersEntities[i];
    const worker360 = await worker360Collection.findOne({ _id: workersEntity.after.id });

    // The paylocityPayStatement data that will be added/updated in the paylocityPayStatement array.
    const { _id, ...paylocityPayStatementData } = updatedPaylocityPayStatementDocument;
    
    let updatedPaylocityPayStatements;
    
    if (worker360 && worker360.paylocityPayStatements) {
      const paylocityPayStatementArr = [...worker360.paylocityPayStatements];
      const paylocityPayStatement = paylocityPayStatementArr.filter(ps =>
        ps.transactionNumber === updatedPaylocityPayStatementDocument.transactionNumber
        && ps.detCode === updatedPaylocityPayStatementDocument.detCode
        && ps.detType === updatedPaylocityPayStatementDocument.detType
      );

      if (!paylocityPayStatement || paylocityPayStatement.length === 0) {
        console.log(`Adding new paylocityPayStatement reference to existing 360_Worker document.`);
        updatedPaylocityPayStatements = paylocityPayStatementArr;
        updatedPaylocityPayStatements.push(paylocityPayStatementData);
      }
      else {
        console.log(`Updating paylocityPayStatement in existing 360_Worker document.`);
        updatedPaylocityPayStatements = paylocityPayStatementArr.map(existingPaylocityPayStatement => {
          if (existingPaylocityPayStatement.transactionNumber === updatedPaylocityPayStatementDocument.transactionNumber
            && existingPaylocityPayStatement.detCode === updatedPaylocityPayStatementDocument.detCode
            && existingPaylocityPayStatement.detType === updatedPaylocityPayStatementDocument.detType) {
            return paylocityPayStatementData;
          }
          return existingPaylocityPayStatement;
        });
      }
    }
    else {
      console.log(`Adding new paylocityPayStatement to 360_Worker document.`);
      updatedPaylocityPayStatements = [paylocityPayStatementData];
    }

    await context.functions.execute(
      "util_update360Worker",
      worker360Collection,
      workersEntity,
      {
        paylocityPayStatements: updatedPaylocityPayStatements
      }
    );
  }
}

/**
 * Update the 360 worker collection removing the deleted paylocityPayStatement data.
 * 
 * @param {Object} worker360Collection
 *   The worker 360 collection to be updated.
 * @param {Object} workersEntities
 *   Array of the workers entity collections containing a reference to the deleted paylocityPayStatement document.
 * @param {Object} payStatementToRemove
 *   The paylocityPayStatement to be removed from the worker 360 entities
 */
 async function update360WorkersRemovePaylocityPayStatement(worker360Collection, workersEntities, payStatementToRemove) {
  for (let i = 0; i < workersEntities.length; i++) {
    const workersEntity = workersEntities[i];
    const worker360 = await worker360Collection.findOne({ _id: workersEntity.after.id });

    if (worker360 && worker360.paylocityPayStatements) {
      const paylocityPayStatementArr = [...worker360.paylocityPayStatements];
      const elementToRemove = paylocityPayStatementArr.filter(ref => 
        ref.companyId === payStatementToRemove.companyId
        && ref.employeeId === payStatementToRemove.employeeId
        && ref.year === payStatementToRemove.year
        && ref.amount === payStatementToRemove.amount
        && ref.checkDate === payStatementToRemove.checkDate
        && ref.det === payStatementToRemove.det
        && ref.detCode === payStatementToRemove.detCode
        && ref.detType === payStatementToRemove.detType
        && ref.eligibleCompensation === payStatementToRemove.eligibleCompensation
        && ref.hours === payStatementToRemove.hours
        && ref.rate === payStatementToRemove.rate
        && ref.transactionNumber === payStatementToRemove.transactionNumber
        && ref.transactionType === payStatementToRemove.transactionType
      );

      if (elementToRemove && elementToRemove.length > 0) {
        const indexToRemove = paylocityPayStatementArr.indexOf(elementToRemove[0]);
        if (indexToRemove !== -1 ) {
          paylocityPayStatementArr.splice(indexToRemove, 1);
        }
      }

      await context.functions.execute(
        "util_update360Worker",
        worker360Collection,
        workersEntity,
        {
          paylocityPayStatements: paylocityPayStatementArr
        }
      );
    }
  }
}
