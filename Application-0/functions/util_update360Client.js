/**
 * Update the 360 client collection with the updated clientsEntity and
 * upstream entity (salesforce account etc.) data.
 * 
 * @param {Object} client360Collection
 *   The client 360 collection to be updated.
 * @param {Object} updatedClientsEntity
 *   The clients entity collection that updated.
 * @param {Object} entity
 *   An object containing an entity's array of items. For example:
 *   {
 *     salesforceAccount: [
 *       {
 *         id: 1234,
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
      name: clientsEntity.after.name,
      email: clientsEntity.after.email,
      phone: clientsEntity.after.phone,
      address: {
        address1: clientsEntity.after.address1,
        address2: clientsEntity.after.address2,
        city: clientsEntity.after.city,
        state: clientsEntity.after.state,
        zip: clientsEntity.after.zip,
      },
      deleted: clientsEntity.after.deleted,
      primaryBullhornReference: clientsEntity.after.primary_bullhorn_reference,
      primarySalesforceReference: clientsEntity.after.primary_salesforce_reference,
      primaryNetsuiteReference: clientsEntity.after.primary_netsuite_reference,
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