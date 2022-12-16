## Importing
```javascript
import { Queue } from "queue-system";
// or
const { Queue } = require("queue-system");
```

## What is a Queue? Creating and destroying the queue

A {@link Queue} instance holds a list of tasks to run and by default runs them one by one. You can define concurrency to
run multiple tasks at once.

To create an empty queue just create new instance:
```javascript
const q = new Queue();
```

Each instance of a Queue is separate queue that works independently. Queue constructor takes options parameter,
{@link QueueOptions}.

You can destroy a queue when needed, this will let run tasks to continue, but will stop future tasks from running:
```javascript
const info = q.destroy();
```

The info returned is a {@link QueueDestroyInfo} object. It returns two lists of tasks:
- `removed` - array of tasks that was queued but never had a chance to start
- `inProgress` - array of tasks that was queued and they are ongoing

> Keep in mind that although there is a way to cancel an ongoing task - this won't be done automatically on destroy.

Destroying a queue makes its instance unusable. You cannot add new tasks or do anything else.

## What is a Task?

Before we advance to adding first task let's say something about tasks.

When adding a task to a queue you call one of the methods like `add` and pass a standard javascript function -
{@link TaskFn}. In return you will get a **Task** instance, which is a wrapper for task function {@link TaskFn}.
You don't ever create these instances by yourself, they are created for you.

Task "promisifies" synchronous functions, it means that even if your function is synchronous - Task will still wrap it
with a Promise to unify return values.

To get access to actual result of a task being run - you need to access `promise` property from a task.

> Note: It is important to attach `catch` listener to a task promise because Unhandled Rejection error may appear when
async task function rejects or when both sync or async task function throws before returning a value.

## Adding a task to a queue

When adding a task you will get a **Task** instance in return. You can use that instance to control the task.

To add a task at the end of the queue:
```javascript
const taskFunction = () => {}; // sync or async function
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
task.run();
```
