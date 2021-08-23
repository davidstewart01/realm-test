exports = async function(changeEvent) {
  console.log('In workersEntityTrigger.');
  
  const databaseName = 'view-service';
  const dataSourceName = 'mongodb-atlas';

  const worker360Collection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('360_Worker_v1');
    
  // Each entity type will be processed asynchronously. For example, one or many bullhornCandidates would
  // be processed in one promise and one or many paylocityEmployees would processed in another.
  const promises = [];
  
  if (!changeEvent.fullDocument) {
    console.log(`workersEntity document with id '${changeEvent.documentKey._id}' has been deleted.`);
    const processDeleteWorker360 = new Promise(async (response) => {
      await context.functions.execute(
        "workersEntity_deleteWorker360",
        databaseName,
        dataSourceName,
        changeEvent.fullDocumentBeforeChange.after.id
      );

      response(true);
    });
    
    promises.push(processDeleteWorker360);
  }
  
  else {
    const updatedDocument = changeEvent.fullDocument;
    
    if (updatedDocument.after.bullhorn_candidate_references) {
      console.log(`Processing bullhorn candidates.`);
      const processBullhornCandidates = new Promise(async (response) => {
        await context.functions.execute(
          "workersEntity_bullhornCandidateProcessor",
          databaseName,
          dataSourceName,
          updatedDocument,
          updatedDocument.after.bullhorn_candidate_references.map(idInt => {
            return { id: idInt };
          })
        );

        response(true);
      });
      
      promises.push(processBullhornCandidates);
    }

    if (!updatedDocument.after.bullhorn_candidate_references) {
      console.log(`Updating 360_Worker with empty bullhornCandidate array.`);
      const emptyBullhornCandidate = new Promise(async (response) => {
       await context.functions.execute(
          "util_update360Worker",
          worker360Collection,
          updatedDocument,
          { bullhornCandidate: [] }
        ); 

        response(true);
      });

      promises.push(emptyBullhornCandidate);
    }

    if (updatedDocument.after.paylocity_candidate_references) {
      console.log(`Processing paylocity employees.`);
      const processPaylocityEmployees = new Promise(async (response) => {
        await context.functions.execute(
          "workersEntity_paylocityEmployeeProcessor",
          databaseName,
          dataSourceName,
          updatedDocument,
          updatedDocument.after.paylocity_candidate_references.map(idString => {
            return { id: idString };
          })
        );

        response(true);
      });
      
      promises.push(processPaylocityEmployees);
    }

    if (!updatedDocument.after.paylocity_candidate_references) {
      console.log(`Updating 360_Worker with empty paylocityEmployee array.`);
      const emptyPaylocityEmployee = new Promise(async (response) => {
        await context.functions.execute(
          "util_update360Worker",
          worker360Collection,
          updatedDocument,
          { paylocityEmployee: [] }
        ); 

        response(true);
      });

      promises.push(emptyPaylocityEmployee);
    }

    if (updatedDocument.after.primary_paylocity_reference) {
      console.log(`Processing paylocity pay statements.`);
      const processPaylocityPayStatements = new Promise(async (response) => {
        await context.functions.execute(
          "workersEntity_paylocityPayStatementProcessor",
          databaseName,
          dataSourceName,
          updatedDocument,
          updatedDocument.after.primary_paylocity_reference
        );

        response(true);
      });

      promises.push(processPaylocityPayStatements);
    }

    if (!updatedDocument.after.primary_paylocity_reference) {
      console.log(`Updating 360_Worker with empty paylocityPayStatements array.`);
      const emptyPaylocityPayStatements = new Promise(async (response) => {
        await context.functions.execute(
          "util_update360Worker",
          worker360Collection,
          updatedDocument,
          { paylocityPayStatements: [] }
        );

        response(true);
      });

      promises.push(emptyPaylocityPayStatements);
    }
  }

  if (promises.length) {
    Promise.all(promises);
  }
  
  return true;
};
