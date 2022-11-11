Ongoing tasks cannot be stopped automagically, because there is no way to stop async method in JavaScript. Therefore
it's up to task function code to detect task cancel request and react on it.

## Task method parameters

When task is run it gets two arguments, both can be used to detect if running task was requested to be cancelled.
- `isCancelled` - which is a function that returns resolving Promise when task isn't cancelled and rejecting Promise
when task was cancelled
- `cancelPromise` - a Promise that rejects when task was requested to be cancelled

## Using `isCancelled`

You can `await` `isCancelled` method between your async calls. This way it will throw and your task will end up being
rejected (make sure to catch it).

> This method isn't perfect if your async middle-jobs are long because it will take time to cancel a Task and free the
queue slot. But it's easy to use and implement into existing task function.

Example:

```javascript
const taskFn = async (isCancelled) => {
    const rawProducts = await fetch("/products").then(r => r.json());
    await isCancelled();
    const products = transformProducts(rawProducts); // this is heavy sync process, read tip below
    const comments = await fetch("/comments").then(r => r.json());
    await isCancelled();
    return {
        products, comments
    };
}

const task = q.add(taskFn);

// later, as a reaction to user input or timeout:

task.cancel();
```

> Tip: If you need a sync processing after async part of your task (like a request) - make sure to `await isCancelled()`
before that sync processing to save resources as the processing results will go to waste anyway.

## Using cancelPromise

You can use Promise.race with cancelPromise to stop the Task as soon as possible. Stopping task sooner means the queue
can start another task sooner.

Example:

```javascript
const taskFn = async (isCancelled, cancelPromise) => {
    const rawProducts = fetch("/products").then(r => r.json());
    const products = await Promise.race([rawProducts, cancelPromise]).then(transformProducts);

    // same for comments
}

const task = q.add(taskFn);

// later, as a reaction to user input or timeout:

task.cancel();
```

You can use this method to abort the actual async job if this is supported, see example with `fetch`:

```javascript
const taskFn = async (isCancelled, cancelPromise) => {
    const controller = new AbortController();
    const signal = controller.signal;

    const rawProducts = fetch("/products", { signal }).then(r => r.json());
    try {
        const products = await Promise.race([rawProducts, cancelPromise]).then(transformProducts);
        return { products };
    }
    catch (e) {
        if (e.message === "Task cancelled") {
            controller.abort();
        }
        throw e; // rethrow to keep task promise rejecting and allow proper handling outside
    }
}
```

## Which method to use?

Usually `cancelPromise()` is a better choice for performance but the code is more verbose. `isCancelled()` function is
simpler to implement and can be used where performance doesn't matter or as a starter for tasks that haven't supported
cancel at all, to be upgraded later.

You can of course mix both methods in your task functions.
