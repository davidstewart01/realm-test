/**
 * Update the 360 client collection with the updated clientsEntity and
 * upstream entity (bullhornClientCorporations, salesforce, netsuite etc.) data.
 * 
 * @param {Object} client360Collection
 *   The client 360 collection to be updated.
 * @param {Object} updatedClientsEntity
 *   The clients entity collection that updated.
 * @param {Object} entity
 *   An object containing an entity's array of items. For example:
 *   {
 *     bullhornClientCorporations: [
 *       {
 *         id: '1234',
 *         ...
 *       }
 *     ]
 *   }
 */ 
 exports = async function(client360Collection, clientsEntity, entity) {
  const formattedClientData =
    {
      id: clientsEntity.after.id,
      uid: clientsEntity.after.id,
      firstName: clientsEntity.after.firstname,
      lastName: clientsEntity.after.lastname,
      email: clientsEntity.after.email,
      phone: clientsEntity.after.phone,
      dob: clientsEntity.after.dob,
      deleted: clientsEntity.after.deleted,
      primaryBullhornClientCorporationsReference: clientsEntity.after.primary_bullhorn_client_corporations_reference,
    };

  const { id, ...clientsEntityData } = formattedClientData;
  const upsertData = { ...clientsEntityData, ...entity }
  
  return await client360Collection.updateOne(
    { _id: id },
    { 
      $set: {
        ...upsertData
      }
    },
    {
      upsert: true
    }
  );
}