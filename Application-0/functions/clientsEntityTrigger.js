exports = async function(changeEvent) {
  console.log('In clientsEntity trigger...');
  
  const databaseName = 'view-service';
  const dataSourceName = 'mongodb-atlas';

  const client360Collection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('360_Client_v1');
  
  // Each entity type will be processed asynchronously. For example, one or many bullhornCandidates would
  // be processed in one promise and one or many paylocityEmployees would processed in another.
  const promises = [];
  
  if (!changeEvent.fullDocument) {
    console.log(`clientsEntity document with id '${changeEvent.documentKey._id}' has been deleted.`);
    const processDeleteClient360 = new Promise(async (response) => {
      await context.functions.execute(
        "clientsEntity_deleteClient360",
        databaseName,
        dataSourceName,
        changeEvent.fullDocumentBeforeChange.after.id
      );

      response(true);
    });
    
    promises.push(processDeleteClient360);
  }
  
  else {
    const updatedDocument = changeEvent.fullDocument;
    
    if (updatedDocument.after.bullhorn_client_references) {
      console.log(`Processing bullhorn client corporations.`);
      const processBullhornClientCorporations = new Promise(async (response) => {
        await context.functions.execute(
          "clientsEntity_bullhornClientCorporationProcessor",
          databaseName,
          dataSourceName,
          updatedDocument,
          updatedDocument.after.bullhorn_client_references.map(idInt => {
            return { id: idInt };
          })
        );

        response(true);
      });
      
      promises.push(processBullhornClientCorporations);
    }

    if (!updatedDocument.after.bullhorn_client_references) {
      console.log(`Updating 360_Worker with empty bullhornClientCorporations array.`);
      const emptyBullhornClientCorporations = new Promise(async (response) => {
        await context.functions.execute(
          "util_update360Client",
          client360Collection,
          updatedDocument,
          { bullhornClientCorporations: [] }
        ); 
        
        response(true);
      });

      promises.push(emptyBullhornClientCorporations);
    }

    if (updatedDocument.after.salesforce_client_references) {
      console.log(`Processing salesforce account.`);
      const processSalesforceAccounts = new Promise(async (response) => {
        await context.functions.execute(
          "clientsEntity_salesforceAccountProcessor",
          databaseName,
          dataSourceName,
          updatedDocument,
          updatedDocument.after.salesforce_client_references.map(idString => {
            return { id: idString };
          })
        );

        response(true);
      });
      
      promises.push(processSalesforceAccounts);
    }

    if (!updatedDocument.after.salesforce_client_references) {
      console.log(`Updating 360_Worker with empty salesforceAccounts array.`);
      const emptySalesforceAccounts = new Promise(async (response) => {
        await context.functions.execute(
          "util_update360Client",
          client360Collection,
          updatedDocument,
          { salesforceAccounts: [] }
        ); 

        response(true);
      });

      promises.push(emptySalesforceAccounts);
    }

    if (updatedDocument.after.netsuite_client_references) {
      console.log(`Processing netsuite customer.`);
      const processNetsuiteCustomers = new Promise(async (response) => {
        await context.functions.execute(
          "clientsEntity_netsuiteCustomerProcessor",
          databaseName,
          dataSourceName,
          updatedDocument,
          updatedDocument.after.netsuite_client_references.map(idInt => {
            return { id: idInt };
          })
        );

        response(true);
      });

      promises.push(processNetsuiteCustomers);
    }

    if (!updatedDocument.after.netsuite_client_references) {
      console.log(`Updating 360_Worker with empty netsuiteCustomers array.`);
      const emptyNetsuiteCustomers = new Promise(async (response) => {
          await context.functions.execute(
          "util_update360Client",
          client360Collection,
          updatedDocument,
          { netsuiteCustomers: [] }
        ); 

        response(true);
      });

      promises.push(emptyNetsuiteCustomers);
    }
  }

  if (promises.length) {
    Promise.all(promises);
  }
  
  return true;
};
