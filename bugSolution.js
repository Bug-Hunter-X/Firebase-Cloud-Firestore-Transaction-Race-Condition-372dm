The solution uses a retry mechanism with exponential backoff to handle potential race conditions.  The function attempts the transaction, and if it fails due to a race condition (indicated by a specific error code from Firestore), it waits a short period before retrying. The retry strategy makes it more likely that the condition in the transaction accurately reflects the document's state at the moment of execution.

```javascript
function updateDocumentWithRetry(db, docRef, updateData, condition) {
  return new Promise((resolve, reject) => {
    const maxRetries = 5;
    let retries = 0;
    const retryDelay = (retries) => 2 ** retries * 100; //Exponential backoff

    function attemptTransaction() {
      db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists || !condition(doc)) {
          return; //Condition not met
        }
        transaction.update(docRef, updateData);
      }).then(resolve).catch((error) => {
        if (error.code === 'failed-precondition' && retries < maxRetries) { 
          //Retry on race condition
          retries++;
          setTimeout(() => attemptTransaction(), retryDelay(retries));
        } else {
          reject(error); //Reject on other errors
        }
      });
    }

    attemptTransaction();
  });
}
```