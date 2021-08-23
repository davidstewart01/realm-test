/**
 * Update the 360 worker collection with the updated workersEntity and
 * upstream entity (bullhornCandidate, paylocityEmployee etc.) data.
 * 
 * @param {Object} worker360Collection
 *   The worker 360 collection to be updated.
 * @param {Object} updatedWorkersEntity
 *   The workers entity collection that updated.
 * @param {Object} entity
 *   An object containing an entity's array of items. For example:
 *   {
 *     bullhornCandidate: [
 *       {
 *         id: '1234',
 *         ...
 *       }
 *     ]
 *   }
 */ 
exports = async function(worker360Collection, workersEntity, entity) {
  const formattedWorkerData =
    {
      id: workersEntity.after.id,
      uid: workersEntity.after.id,
      firstName: workersEntity.after.firstname,
      lastName: workersEntity.after.lastname,
      email: workersEntity.after.email,
      phone: workersEntity.after.phone,
      dob: workersEntity.after.dob,
      deleted: workersEntity.after.deleted,
      primaryBullhornReference: workersEntity.after.primary_bullhorn_reference,
      primaryPaylocityReference: workersEntity.after.primary_paylocity_reference,
    };

  const { id, ...workersEntityData } = formattedWorkerData;
  const upsertData = { ...workersEntityData, ...entity }
  
  return await worker360Collection.updateOne(
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