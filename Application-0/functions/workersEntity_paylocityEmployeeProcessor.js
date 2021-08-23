/**
 * Iterates through all paylocityEmployee reference IDs and updates the 360 worker collection
 * with the corresponding paylocityEmployee entities. The process creates a new array of entities
 * for the iteration, so any previous entities linked that are no longer referenced will be removed.
 * 
 * @param databaseName
 *   The view service database name.
 * @param dataSourceName
 *   The data source that the database belongs to.
 * @param updatedWorkersEntity
 *   The updated workersEntity document.
 * @param entityArray
 *   The the paylocityEmployee array to to be processed.
 */
 exports = async function(databaseName, dataSourceName, updatedWorkersEntity, entityArray) {

  const worker360Collection = context.services.get(dataSourceName)
  .db(databaseName)
  .collection('360_Worker_v1');

  const paylocityEmployeeCollection = context.services.get(dataSourceName)
    .db(databaseName)
    .collection('paylocityEmployee');
  
  let updatedPaylocityEmployee = [];
  
  for (let i = 0; i < entityArray.length; i++) {
    const employee = entityArray[i];
    
    // paylocity employee ID is represented as "companyId.employeeId"
    const paylocityEmployeeIds = employee.id.split('.');
    
    const paylocityEmployee = 
      await paylocityEmployeeCollection.findOne(
        { $and: [{ companyId: paylocityEmployeeIds[0] }, { employeeId: paylocityEmployeeIds[1] }] }
      );
    
    if (paylocityEmployee) {
      const {
        _id,
        ...paylocityEmployeeData
      } = paylocityEmployee;
      updatedPaylocityEmployee.push(paylocityEmployeeData);
    }
    else {
      console.log(`No Paylocity Employee data was available for id: ${employee.id}`);
    }
  }
  
  return await context.functions.execute(
    "util_update360Worker",
    worker360Collection,
    updatedWorkersEntity,
    {
      paylocityEmployee: updatedPaylocityEmployee
    }
  );
}
