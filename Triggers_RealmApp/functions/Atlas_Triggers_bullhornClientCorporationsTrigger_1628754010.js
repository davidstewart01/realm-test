/**
 * When the clientsEntity collection contains a document that has a reference to the 
 * updated document's bullhorn ID, add the updated document to the 360 client collection
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

  const client360Collection = context.services.get(dataSourceName)
  .db(databaseName)
  .collection('360_Client_v1');
  
  const clientsEntityCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('clientsEntity');
  
  // handle delete event
  if (!changeEvent.fullDocument) {
    console.log('>>>> idOfDeletedDocument', JSON.stringify(changeEvent))
    const idOfDeletedDocument = changeEvent.fullDocumentBeforeChange.id;
    
    

    const clientsEntities =
      await clientsEntityCollection.find(
        { 'after.bullhorn_client_corporations_references': { $elemMatch: { $eq: idOfDeletedDocument } } }
      ).toArray();

    if (clientsEntities && clientsEntities.length > 0) {
      await update360ClientsRemoveBullhornClientCorporations(client360Collection, clientsEntities, idOfDeletedDocument);
    } else {
      console.log(`Universal ID does not exist for bullhorn client corporations entity: ${idOfDeletedDocument}`);
    }

    return true;
  }

  // handle other events
  const updatedDocument = changeEvent.fullDocument;

  const clientsEntities =
    await clientsEntityCollection.find(
      { 'after.bullhorn_client_corporations_references': { $elemMatch: { $eq: updatedDocument.id } } }
    ).toArray();

  if (clientsEntities && clientsEntities.length > 0) {
    await update360ClientsWithBullhornClientCorporations(client360Collection, clientsEntities, updatedDocument);
  } else {
    console.log(`Universal ID does not exist for bullhorn client corporations entity: ${updatedDocument.id}`);
  }
  
  return true;
}

/**
 * Update the 360 client collection with bullhornClientCorporations data.
 * 
 * @param {Object} client360Collection
 *   The client 360 collection to be updated.
 * @param {Object} clientsEntities
 *   The clients entity collections containing a reference to the updated bullhornClientCorporations document.
 * @param {Object} updatedBullhornClientCorporationsDocument
 *   The bullhornClientCorporations document that contains updates.
 */
 async function update360ClientsWithBullhornClientCorporations(
   client360Collection, clientsEntities, updatedBullhornClientCorporationsDocument) {
  
  for (let i = 0; i < clientsEntities.length; i++) {
    const clientsEntity = clientsEntities[i];
    const client360 = await client360Collection.findOne({ _id: clientsEntity.after.id });

    // The bullhornClientCorporations data that will be added/updated in the client 360 bullhornClientCorporations array.
    const { _id, ...bullhornClientCorporationsData } = updatedBullhornClientCorporationsDocument;
  
    let updatedBullhornClientCorporations;
  
    if (client360 && client360.bullhornClientCorporations) {
      const bullhornClientCorporationsArr = [...client360.bullhornClientCorporations];
    
      const candidate = bullhornClientCorporationsArr.filter(ref => ref.id === updatedBullhornClientCorporationsDocument.id);
    
      if (!candidate || candidate.length === 0) {
        // Add the new bullhornClientCorporations to the existing array.
        updatedBullhornClientCorporations = bullhornClientCorporationsArr;
        updatedBullhornClientCorporations.push(bullhornClientCorporationsData);
      }
      else {
        // Update an existing bullhornClientCorporations in the array.
        updatedBullhornClientCorporations = bullhornClientCorporationsArr.map(existingCandidate => {
          if (existingCandidate.id === updatedBullhornClientCorporationsDocument.id) {
            return bullhornClientCorporationsData;
          }
        
          return existingCandidate;
        });
      }
    }
    else {
      // Create a brand new bullhornClientCorporations array.
      updatedBullhornClientCorporations = [bullhornClientCorporationsData];
    }
    
    await context.functions.execute(
      "util_update360Client",
      client360Collection,
      clientsEntity,
      {
        bullhornClientCorporations: updatedBullhornClientCorporations
      }
    );
  }
}

/**
 * Update the 360 client collection removing the deleted bullhornClientCorporations data.
 * 
 * @param {Object} client360Collection
 *   The client 360 collection to be updated.
 * @param {Object} clientsEntities
 *   Array of the clients entity collections containing a reference to the deleted bullhornClientCorporations document.
 * @param {Object} idOfDeletedDocument
 *   The bullhornClientCorporations id to be removed from the client 360 entities.
 */
 async function update360ClientsRemoveBullhornClientCorporations(
   client360Collection, clientsEntities, idOfDeletedDocument) {
  
  for (let i = 0; i < clientsEntities.length; i++) {
    const clientsEntity = clientsEntities[i];
    const client360 = await client360Collection.findOne({ _id: clientsEntity.after.id });

    if (client360 && client360.bullhornClientCorporations) {
      const bullhornClientCorporationsArr = [...client360.bullhornClientCorporations];
      
      const updatedBullhornClientCorporations = 
        bullhornClientCorporationsArr.filter(ref => ref.id !== idOfDeletedDocument);

      await context.functions.execute(
        "util_update360Client",
        client360Collection,
        client360.bullhornClientCorporations,
        {
          bullhornClientCorporations: updatedBullhornClientCorporations
        }
      );
    }
  }
}
