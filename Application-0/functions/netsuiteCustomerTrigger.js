/**
 * When the clientsEntity collection contains a document that has a reference to the 
 * updated document's netsuite ID, add the updated document to the 360 client collection
 * along with the universal ID.
 * 
 * @param {Object} changeEvent
 *   Contains details about the updated document. The fullDocument property of this Object
 *   contains all document's fields with their existing and updated values.
 */
 exports = async function(changeEvent) {
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
    console.log(`Deleting Netsuite Customer...`);
    const idOfDeletedDocument = changeEvent.fullDocumentBeforeChange.id;
    
    const clientsEntities =
      await clientsEntityCollection.find(
        { 'after.netsuite_client_references': { $elemMatch: { $eq: idOfDeletedDocument } } }
      ).toArray();

    if (clientsEntities && clientsEntities.length > 0) {
      await update360ClientsRemoveNetsuiteCustomer(client360Collection, clientsEntities, idOfDeletedDocument);
    } else {
      console.log(`Universal ID does not exist for netsuite client entity: ${idOfDeletedDocument}`);
    }

    return true;
  }

  console.log('Updating Netsuite Customer Corporations...');

  // handle other events
  const updatedDocument = changeEvent.fullDocument;

  const clientsEntities =
    await clientsEntityCollection.find(
      { 'after.netsuite_client_references': { $elemMatch: { $eq: updatedDocument.id } } }
    ).toArray();

  if (clientsEntities && clientsEntities.length > 0) {
    await update360ClientsWithNetsuiteCustomer(client360Collection, clientsEntities, updatedDocument);
  } else {
    console.log(`Universal ID does not exist for netsuite client entity: ${updatedDocument.id}`);
  }
  
  return true;
}

/**
 * Update the 360 client collection with netsuiteCustomer data.
 * 
 * @param {Object} client360Collection
 *   The client 360 collection to be updated.
 * @param {Object} clientsEntities
 *   The clients entity collections containing a reference to the updated netsuiteCustomer document.
 * @param {Object} updatedNetsuiteCustomerDocument
 *   The netsuiteCustomer document that contains updates.
 */
 async function update360ClientsWithNetsuiteCustomer(
   client360Collection, clientsEntities, updatedNetsuiteCustomerDocument) {
  
  for (let i = 0; i < clientsEntities.length; i++) {
    const clientsEntity = clientsEntities[i];
    const client360 = await client360Collection.findOne({ _id: clientsEntity.after.id });

    // The netsuiteClient data to be added/updated in the client 360 netsuiteCustomer array.
    const { _id, ...netsuiteCustomerClientData } = updatedNetsuiteCustomerDocument;
  
    let updatedNetsuiteCustomer;
  
    if (client360 && client360.netsuiteCustomer) {
      const netsuiteCustomerArr = [...client360.netsuiteCustomer];
    
      const candidate = 
        netsuiteCustomerArr.filter(ref => ref.id === updatedNetsuiteCustomerDocument.id);
    
      if (!candidate || candidate.length === 0) {
        // Add the new netsuiteCustomer to the existing array.
        updatedNetsuiteCustomer = netsuiteCustomerArr;
        updatedNetsuiteCustomer.push(netsuiteCustomerClientData);
      }
      else {
        // Update an existing netsuiteCustomer in the array.
        updatedNetsuiteCustomer = netsuiteCustomerArr.map(existingNetsuiteCustomer => {
          if (existingNetsuiteCustomer.id === updatedNetsuiteCustomerDocument.id) {
            return netsuiteCustomerClientData;
          }
        
          return existingNetsuiteCustomer;
        });
      }
    }
    else {
      // Create a brand new netsuiteCustomer array.
      updatedNetsuiteCustomer = [netsuiteCustomerClientData];
    }
    
    await context.functions.execute(
      "util_update360Client",
      client360Collection,
      clientsEntity,
      {
        netsuiteCustomer: updatedNetsuiteCustomer
      }
    );
  }
}

/**
 * Update the 360 client collection removing the deleted netsuiteCustomer data.
 * 
 * @param {Object} client360Collection
 *   The client 360 collection to be updated.
 * @param {Object} clientsEntities
 *   Array of the clients entity collections containing a reference to the deleted netsuiteCustomer document.
 * @param {Object} idOfDeletedDocument
 *   The netsuiteCustomer id to be removed from the client 360 entities.
 */
 async function update360ClientsRemoveNetsuiteCustomer(
   client360Collection, clientsEntities, idOfDeletedDocument) {
  
  for (let i = 0; i < clientsEntities.length; i++) {
    const clientsEntity = clientsEntities[i];
    const client360 = await client360Collection.findOne({ _id: clientsEntity.after.id });

    if (client360 && client360.netsuiteCustomer) {
      const netsuiteCustomerArr = [...client360.netsuiteCustomer];
      
      const updatedNetsuiteCustomer = 
        netsuiteCustomerArr.filter(ref => ref.id !== idOfDeletedDocument);

      await context.functions.execute(
        "util_update360Client",
        client360Collection,
        clientsEntity,
        {
          netsuiteCustomer: updatedNetsuiteCustomer
        }
      );
    }
  }
}