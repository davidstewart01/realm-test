exports = async function(changeEvent) {
  console.log('In workersEntity trigger...');
  
  const updatedDocument = changeEvent.fullDocument
  
  const databaseName = 'view-service';
  const dataSourceName = 'mernShopping';

  let result;
  
  // Each entity type will be processed asynchronously. For example, one or many bullhornCandidates would
  // be processed in one promise and one or many paylocityEmployees would processed in another.
  const promises = [];
  
  const worker360Collection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('360_Worker_v1');
  
  for (const [key, value] of Object.entries(updatedDocument.references)) {
    switch (key) {
      case 'bullhornCandidate':
        // TODO: Eventually all bullhorn specific collections will be processed here.
        // TODO: Change from bullhornTest to bullhornCandidate.
        
        const processBullhornCandidates = new Promise(async (response) => {
          const bullhornTestCollection = context.services.get(dataSourceName)
            .db(databaseName)
            .collection('bullhornTest');
          
          for (let i = 0; i < value.length; i++) {
            const candidate = value[i];
            const bullhornTest = await bullhornTestCollection.findOne({ id: candidate.id });
            
            if (bullhornTest) {
              await update360WorkerWithBullhornCandidate(worker360Collection, updatedDocument, bullhornTest);
            }
            else {
              console.log(`No bullhornCandidate data was available for id: ${candidate.id}`);
            }
          }
          
          response(true);
        });
        
        promises.push(processBullhornCandidates);
        
        break;
      case 'paylocity':
        const processPaylocityWorkers = new Promise(async (response) => {
          const paylocityCollection = context.services.get(dataSourceName)
            .db(databaseName)
            .collection('paylocity');
          
          for (let i = 0; i < value.length; i++) {
            const paylocityWorker = value[i];
            
            // paylocity ID is represented as "companyId.employeeId"
            const paylocityIds = paylocityWorker.id.split('.');
            
            const paylocity = 
              await paylocityCollection.findOne({ $and: [{ companyId: paylocityIds[0] }, { employeeId: paylocityIds[1] }] });
            
            if (paylocity) {
              await update360WorkerWithPaylocity(worker360Collection, updatedDocument, paylocity);
            }
            else {
              console.log(`No Paylocity data was available for id: ${value}`);
            }
          }
          
          response(true);
        });
        
        promises.push(processPaylocityWorkers);
        
        break;
      default:
        console.log(`Unknown entity reference - ${key}: ${value}`)
    }
  }
  
  if (promises.length) {
    Promise.all(promises);
  }
  
  return true;
};


/**
 * Update the 360 worker collection with bullhornCandidate data.
 * 
 * @param {Object} worker360Collection
 *   The worker 360 collection to be updated.
 * @param {Object} updatedWorkersEntity
 *   The workers entity collection that updated.
 * @param {Object} bullhornCandidateDocument
 *   The bullhornCandidate document that corresponds to a bullhornCandidate id in the given updatedWorkersEntity.
 */
async function update360WorkerWithBullhornCandidate(worker360Collection, updatedWorkersEntity, bullhornCandidateDocument) {
  const worker360 = await worker360Collection.findOne({ uid: updatedWorkersEntity.id });

  // The bullhornCandidate data that will be added/updated in the bullhornCandidate array.
  const { _id, ...candidateData } = bullhornCandidateDocument;
  
  let updatedBullhornCandidate;
  
  if (worker360 && worker360.bullhornCandidate) {
    const bullhornCandidateArr = [...worker360.bullhornCandidate];
    
    const candidate = bullhornCandidateArr.filter(ref => ref.id === bullhornCandidateDocument.id);
    
    if (!candidate || candidate.length === 0) {
      // Add the new bullhornCandidate to the existing array.
      updatedBullhornCandidate = bullhornCandidateArr;
      updatedBullhornCandidate.push(candidateData);
    }
    else {
      // Update an existing bullhornCandidate in the array.
      updatedBullhornCandidate = bullhornCandidateArr.map(existingCandidate => {
        if (existingCandidate.id === bullhornCandidateDocument.id) {
          return candidateData;
        }
        
        return existingCandidate;
      });
    }
  }
  else {
    // Create a brand new bullhornCandidate array.
    updatedBullhornCandidate = [candidateData];
  }
  
  return await update360Worker(worker360Collection, updatedWorkersEntity,
    {
      bullhornCandidate: updatedBullhornCandidate
    }
  );
  
  // return await collection.updateOne(
  //   { uid: updatedWorkersEntity.id },
  //   { 
  //     $set: {
  //       uid: updatedWorkersEntity.id,
  //       firstName: updatedWorkersEntity.firstName,
  //       middleName: updatedWorkersEntity.middleName,
  //       lastName: updatedWorkersEntity.lastName,
  //       dob: updatedWorkersEntity.dob,
  //       email: updatedWorkersEntity.email,
  //       phone: updatedWorkersEntity.phone,
  //       bullhornCandidate: updatedBullhornCandidate
  //     }
  //   },
  //   {
  //     upsert: true
  //   }
  // );
}

/**
 * Update the 360 worker collection with paylocity data.
 * 
 * @param {Object} worker360Collection
 *   The worker 360 collection to be updated.
 * @param {Object} updatedWorkersEntity
 *   The workers entity collection that updated.
 * @param {Object} paylocityDocument
 *   The paylocity document that corresponds to a paylocity id in the given updatedWorkersEntity.
 */
async function update360WorkerWithPaylocity(worker360Collection, updatedWorkersEntity, paylocityDocument) {
  const worker360 = await worker360Collection.findOne({ uid: updatedWorkersEntity.id });

  // The bullhornCandidate data that will be added/updated in the bullhornCandidate array.
  const { _id, ...paylocityEmployeeData } = paylocityDocument;
  
  let updatedPaylocity;
  
  if (worker360 && worker360.paylocity) {
    const paylocityArr = [...worker360.paylocity];
    
    const paylocityEmployee = paylocityArr.filter(ref =>
      `${ref.companyId}.${ref.employeeId}` === `${paylocityDocument.companyId}.${paylocityDocument.employeeId}`
    );
    
    if (!paylocityEmployee || paylocityEmployee.length === 0) {
      // Add the new paylocityEmployee to the existing array.
      updatedPaylocity = paylocityArr;
      updatedPaylocity.push(paylocityEmployeeData);
    }
    else {
      // Update an existing bullhornCandidate in the array.
      updatedPaylocity = paylocityArr.map(existingPaylocityWorker => {
        if (existingPaylocityWorker.companyId === paylocityDocument.companyId && 
            existingPaylocityWorker.employeeId === paylocityDocument.employeeId) {
          return paylocityEmployeeData;
        }
        
        return existingPaylocityWorker;
      });
    }
  }
  else {
    // Create a brand new bullhornCandidate array.
    updatedPaylocity = [paylocityEmployeeData];
  }
  
  return await update360Worker(worker360Collection, updatedWorkersEntity,
    {
      paylocityEmployee: updatedPaylocity
    }
  );
  
  // return await worker360Collection.updateOne(
  //   { uid: updatedWorkersEntity.id },
  //   { 
  //     $set: {
  //       uid: updatedWorkersEntity.id,
  //       firstName: updatedWorkersEntity.firstName,
  //       middleName: updatedWorkersEntity.middleName,
  //       lastName: updatedWorkersEntity.lastName,
  //       dob: updatedWorkersEntity.dob,
  //       email: updatedWorkersEntity.email,
  //       phone: updatedWorkersEntity.phone,
  //       paylocityEmployee: updatedPaylocity
  //     }
  //   },
  //   {
  //     upsert: true
  //   }
  // );
}


async function update360Worker(worker360Collection, updatedWorkersEntity, entity) {
  const { _id, id, references, ...workersEntityData } = updatedWorkersEntity;
  const upsertData = { ...workersEntityData, ...entity }
  
  return await worker360Collection.updateOne(
    { uid: updatedWorkersEntity.id },
    { 
      $set: {
        uid: id,
        ...upsertData
      }
    },
    {
      upsert: true
    }
  );
}

