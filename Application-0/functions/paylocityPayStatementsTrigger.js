/**
 * When a payStatements changeEvent is fired, unwind the pay statements into the payStatement collection,
 * replacing or upserting the individual pay statement documents as applicable.
 * 
 * @param {Object} changeEvent
 *   Contains details about the updated document. The fullDocument property of this Object
 *   contains all document's fields with their existing and updated values.
 */
 exports = async function(changeEvent) {
  console.log('In paylocityPayStatementsTrigger.');

  const databaseName = 'view-service';
  const dataSourceName = 'mongodb-atlas';

  const updatedDocument = changeEvent.fullDocument;

  const paylocityPayStatementCollection = context.services.get(dataSourceName)
  .db(databaseName)
  .collection('paylocityPayStatement');
  
  // handle delete event
  if (!changeEvent.fullDocument) {
    console.log(`paylocityPayStatements document with id '${changeEvent.documentKey._id}' has been deleted.`);
    const idOfDeletedDocument = changeEvent.fullDocumentBeforeChange._id;
    const ids = idOfDeletedDocument.split('.');
    await removeFromPaylocityPayStatementCollection(paylocityPayStatementCollection, ids);
  
    return true;
  }
  
  // handle other events
  await updatePaylocityPayStatementCollection(paylocityPayStatementCollection, updatedDocument);
  
  return true;
}

async function searchForPayStatements(paylocityPayStatementCollection, ids) {
  const pipeline =
  [
    {
      '$addFields': {
        'convertedYear': {
          '$toString': '$year'
        }
      }
    }, {
      '$match': {
        'companyId': ids[0],
        'employeeId': ids[1],
        'convertedYear': ids[2]
      }
    }
  ]

  const aggCursor = paylocityPayStatementCollection.aggregate(pipeline);
  const result = await aggCursor.toArray();
  return result;
}

/**
 * Update the paylocity payStatement collection with paylocityPayStatements data.
 * 
 * @param {Object} paylocityPayStatementCollection
 *   The collection to be updated.
 * @param {Object} updatedPaylocityPayStatementsDocument
 *   The paylocityPayStatements document that contains updates.
 */
async function updatePaylocityPayStatementCollection(paylocityPayStatementCollection, updatedPaylocityPayStatementsDocument) {
  const ids = updatedPaylocityPayStatementsDocument._id.split('.');

  // delete any existing pay statements no longer in array
  const existingPaylocityPayStatements = await searchForPayStatements(paylocityPayStatementCollection, ids);
  if (existingPaylocityPayStatements && existingPaylocityPayStatements.length > 0){
    for (let i = 0; i < existingPaylocityPayStatements.length; i++) {
      const existingPS = existingPaylocityPayStatements[i];
      const matchedPS = await updatedPaylocityPayStatementsDocument.payStatement.filter(ref => 
        ref.detCode === existingPS.detCode
        && ref.detType === existingPS.detType
        && ref.transactionNumber === existingPS.transactionNumber
      );
      if (!matchedPS || matchedPS.length === 0) {
        await paylocityPayStatementCollection.deleteOne(
          {
            _id: existingPS._id,
          }
        );
      }
    }
  }

  // add/update pay statements from array
  await updatedPaylocityPayStatementsDocument.payStatement.forEach(ps => {
    ps.companyId = ids[0];
    ps.employeeId = ids[1];
    paylocityPayStatementCollection.updateOne(
      { 
        companyId: ps.companyId,
        employeeId: ps.employeeId,
        transactionNumber: ps.transactionNumber,
        detCode: ps.detCode,
        detType: ps.detType,
      },
      ps,
      { upsert: true }
    );
  });
}

/**
 * Update the paylocity payStatement collection removing deleted paylocityPayStatements data.
 * 
 * @param {Object} paylocityPayStatementCollection
 *   The collection to be updated.
 * @param {Object} ids
 *   The id info to remove pay statements for
 */
 async function removeFromPaylocityPayStatementCollection(paylocityPayStatementCollection, ids) {
  const payStatementsToRemove = await searchForPayStatements(paylocityPayStatementCollection, ids);
  for (let i = 0; i < payStatementsToRemove.length; i++) {
    const payStatement = payStatementsToRemove[i];
    await paylocityPayStatementCollection.deleteOne(
      {
        _id: payStatement._id,
      }
    );
  }
}
