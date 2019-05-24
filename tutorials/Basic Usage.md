## Importing
There is just one export you'll need:
```javascript
import Queue from "queue-system";
```

For transpiled CommonJS code import from `dist` directory:
```javascript
const Queue = require("queue-system/dist").default;
```

## Creating and destroying the queue
A {@link Queue} is internally holding {@link Task}s list. Task is a function that works synchronously or returns a
Promise. Each task stays in the queue until it is fulfilled (resolved or rejected, just like Promises).

To create an empty queue just create new instance:
```javascript
const q = new Queue(); 
```

Each instance of Queue is separate queue that works independently. Queue constructor takes options parameter,
{@link QueueOptions}.

By default each queue will run one task at once, but you can define concurrency at construct or later with
{@link Queue#setConcurrency}. 

## Adding a task

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
