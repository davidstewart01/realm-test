/**
 * Uses the Primary Paylocity Reference and updates the 360 worker collection
 * with the corresponding paylocity Pay Statements. The process will create a new payments array
 * containing only payments for the latest primary reference, removing any previously linked statements
 * if the value changes.
 * 
 * @param databaseName
 *   The view service database name.
 * @param dataSourceName
 *   The data source that the database belongs to.
 * @param updatedWorkersEntity
 *   The updated workersEntity document.
 * @param paylocityId
 *   The the paylocity ID to be processed
 */
 exports = async function(databaseName, dataSourceName, updatedWorkersEntity, paylocityId) {

  const worker360Collection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('360_Worker_v1');
  
  const paylocityPayStatementCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('paylocityPayStatement');

  let updatedPaylocityPayStatements = [];
    
  // paylocity employee ID is represented as "companyId.employeeId"
  const paylocityEmployeeIds = paylocityId.split('.');
    
  const paylocityPayStatements = 
    await paylocityPayStatementCollection.find(
      { $and: [{ companyId: paylocityEmployeeIds[0] }, { employeeId: paylocityEmployeeIds[1] }] }
    ).toArray();
    
  if (paylocityPayStatements) {
    for (let i = 0; i < paylocityPayStatements.length; i++) {
      const {
        _id,
        ...paylocityPayStatementData
      } = paylocityPayStatements[i];
      updatedPaylocityPayStatements.push(paylocityPayStatementData);
    }
  }
  else {
    console.log(`No Paylocity PayStatements data was available for id: ${paylocityId}`);
  }

  return await context.functions.execute(
    "util_update360Worker",
    worker360Collection,
    updatedWorkersEntity,
    {
      paylocityPayStatements: updatedPaylocityPayStatements
    },
  );
}
