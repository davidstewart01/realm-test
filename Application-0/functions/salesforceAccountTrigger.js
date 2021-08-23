/**
 * When the clientsEntity collection contains a document that has a reference to the 
 * updated document's salesforce account ID, add the updated document to the 360 client collection
 * along with the universal ID.
 * 
 * @param {Object} changeEvent
 *   Contains details about the updated document. The fullDocument property of this Object
 *   contains all document's fields with their existing and updated values.
 */
 exports = async function(changeEvent) {
  console.log('In salesforceAccountTrigger.');

  const databaseName = 'view-service';
  const dataSourceName = 'mongodb-atlas';

  const client360Collection = context.services.get(dataSourceName)
  .db(databaseName)
  .collection('360_Client_v1');
  
  const clientsEntityCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('clientsEntity');
  
  // handle delete event
  if (!changeEvent.fullDocument) {
    console.log(`salesforceAccount document with id '${changeEvent.documentKey._id}' has been deleted.`);
    const idOfDeletedDocument = changeEvent.fullDocumentBeforeChange.id;
    
    const clientsEntities =
    await clientsEntityCollection.find(
      { 'after.salesforce_client_references': { $elemMatch: { $eq: idOfDeletedDocument } } }
    ).toArray();

    if (clientsEntities && clientsEntities.length > 0) {
      console.log('Removing Salesforce Account from 360_Worker.');
      await update360ClientsRemoveSalesforceAccount(client360Collection, clientsEntities, idOfDeletedDocument);
    } else {
      console.log(`Universal ID does not exist for Salesforce Account entity: ${idOfDeletedDocument}`);
    }

    return true;
  }
  
  // handle other events
  const updatedDocument = changeEvent.fullDocument;

  const clientsEntities =
    await clientsEntityCollection.find(
      { 'after.salesforce_client_references': { $elemMatch: { $eq: updatedDocument.id } } }
    ).toArray();

  if (clientsEntities && clientsEntities.length > 0) {
    console.log(`Updating 360_Worker with Salesforce Account: ${updatedDocument.id}`);
    await update360ClientsWithSalesforceAccount(client360Collection, clientsEntities, updatedDocument);
  } else {
    console.log(`Universal ID does not exist for Salesforce Account entity: ${updatedDocument.id}`);
  }
  
  return true;
}

/**
 * Update the 360 client collection with salesforceAccount data.
 * 
 * @param {Object} client360Collection
 *   The client 360 collection to be updated.
 * @param {Object} clientsEntities
 *   The clients entity collections containing a reference to the updated salesforceAccount document.
 * @param {Object} updatedSalesforceAccountDocument
 *   The salesforceAccount document that contains updates.
 */
async function update360ClientsWithSalesforceAccount(client360Collection, clientsEntities, updatedSalesforceAccountDocument) {
  for (let i = 0; i < clientsEntities.length; i++) {
    const clientsEntity = clientsEntities[i];
    const client360 = await client360Collection.findOne({ _id: clientsEntity.after.id });

    // The salesforceAccount data that will be added/updated in the client 360 salesforceAccount array.
    const { _id, ...accountData } = updatedSalesforceAccountDocument;
  
    let updatedSalesforceAccounts;
  
    if (client360 && client360.salesforceAccounts) {
      const salesforceAccountArr = [...client360.salesforceAccounts];
    
      const account = salesforceAccountArr.filter(ref => ref.id === updatedSalesforceAccountDocument.id);
    
      if (!account || account.length === 0) {
        console.log(`Adding new salesforceAccount reference to existing 360_Worker document.`);
        updatedSalesforceAccounts = salesforceAccountArr;
        updatedSalesforceAccounts.push(accountData);
      }
      else {
        console.log(`Updating salesforceAccount in existing 360_Worker document.`);
        updatedSalesforceAccounts = salesforceAccountArr.map(existingAccount => {
          if (existingAccount.id === updatedSalesforceAccountDocument.id) {
            return accountData;
          }
        
          return existingAccount;
        });
      }
    }
    else {
      console.log(`Adding new salesforceAccount to 360_Worker document.`);
      updatedSalesforceAccounts = [accountData];
    }
    
    await context.functions.execute(
      "util_update360Client",
      client360Collection,
      clientsEntity,
      {
        salesforceAccounts: updatedSalesforceAccounts
      }
    );
  }
}

/**
 * Update the 360 client collection removing the deleted salesforceAccount data.
 * 
 * @param {Object} client360Collection
 *   The client 360 collection to be updated.
 * @param {Object} clientsEntities
 *   Array of the clients entity collections containing a reference to the deleted salesforceAccount document.
 * @param {Object} idOfDeletedDocument
 *   The salesforceAccount id to be removed from the client 360 entities
 */
 async function update360ClientsRemoveSalesforceAccount(client360Collection, clientsEntities, idOfDeletedDocument) {
  for (let i = 0; i < clientsEntities.length; i++) {
    const clientsEntity = clientsEntities[i];
    const client360 = await client360Collection.findOne({ _id: clientsEntity.after.id });

    if (client360 && client360.salesforceAccounts) {
      const salesforceAccountArr = [...client360.salesforceAccounts];
      const updatedSalesforceAccounts = salesforceAccountArr.filter(ref => ref.id !== idOfDeletedDocument);

      await context.functions.execute(
        "util_update360Client",
        client360Collection,
        clientsEntity,
        {
          salesforceAccounts: updatedSalesforceAccounts
        }
      );
    }
  }
}

