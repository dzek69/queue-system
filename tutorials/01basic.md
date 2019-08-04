## Importing
There is just one export you'll need:
```javascript
import Queue from "queue-system";
```

For transpiled CommonJS code import from `dist` directory:
```javascript
const Queue = require("queue-system/dist").default;
```

## What is a Task?

{@link Task} instance is constructed with task function given to one of the queue methods that's for adding a new task.
Task behaves like a wrapper for given method, it doesn't instantly call it but waits until it's time to run it.

Task "promisifies" synchronous methods too, it means that even if your method is synchronous - Task will still wrap it
with a Promise to unify its API that is used to dealing with tasks.

To get access to actual result of a task being run - you need to get `promise` property from a task.

> Note: It is important to attach `catch` listener to a task promise because Unhandled Rejection error may appear when
async task function rejects or when both sync or async task function throws before returning a value.

## What is a Queue? Creating and destroying the queue

A {@link Queue} is internally holding a {@link Task}s list. Each task stays in the queue until it is fulfilled
(resolved or rejected, just like Promises), which means that running tasks are still kept in the queue.

To create an empty queue just create new instance:
```javascript
const q = new Queue(); 
```

Each instance of a Queue is separate queue that works independently. Queue constructor takes options parameter,
{@link QueueOptions}.

By default each queue will run one task at once, but you can define concurrency at construct or later with
{@link Queue#setConcurrency}.

To destroy a queue use:
```javascript
const info = q.destroy();
````

The info returned is a {@link QueueDestroyInfo} object. It returns two lists of tasks:
- `removed` - array of tasks that was queued but never had a change to start
- `inProgress` - array of tasks that was queued and their job were ongoing

> Keep in mind that although there is a way to cancel an ongoing task - this won't be done automatically on destroy.

Destroying a queue makes its instance unuseable. You cannot add new tasks or do anything else.

## Adding a task to a queue

When adding a task you will get a {@link Task} instance in return. You can use that instance to control the task.

To add a task at the end of the queue:
```javascript
const taskFunction = () => {}; // sync or async method
const task = q.add(taskFunction);
```

You can also put a task at the beginning of the queue (so it will be first to run) or at specified position (where 0 is
the first element):
```javascript
q.prepend(taskFunction);
q.insertAt(taskFunction, 3);
```

## Force-start a task

At anytime you can force-start a task. Task will be started ignoring concurrency limit and regardless of its position
in the queue.

```javascript
task.run(true);
```

> Currently you need to pass `true` as an argument to force-start a task.
