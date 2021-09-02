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
  let bullhornCandidateIds = [];
  let paylocityEmployeeIds = [];
  let paylocityCompanyIds = [];

  if (workersEntity.after.bullhorn_candidate_references && workersEntity.after.bullhorn_candidate_references.length) {
    bullhornCandidateIds = workersEntity.after.bullhorn_candidate_references.map(id => {
      return `${id}`;
    });
  }

  if (workersEntity.after.paylocity_candidate_references && workersEntity.after.paylocity_candidate_references.length) {
    workersEntity.after.paylocity_candidate_references.forEach(id => {
      const ids = id.split('.');
      paylocityCompanyIds.push(ids[0]);
      paylocityEmployeeIds.push(ids[1]);
    });
  }

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
      bullhornCandidateIds,
      paylocityEmployeeIds,
      paylocityCompanyIds,
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