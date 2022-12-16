## Tasks data

When your queue can get big and you often need to cancel your tasks - there is a way to attach additional data to a
task. This data isn't available to the task function, but can be used for filtering tasks, ie:. your app users can
assign a jobs to do, but they are able to cancel their jobs as they want. Or you may want to limit number of jobs for
a particular user in the queue.

To add additional data for your task just pass extra argument to task adding methods:
```javascript
const data = { user: "john" };
q.add(taskFunction, data);
q.prepend(taskFunction, data);
q.insertAt(taskFunction, 3, data);
```

Task data is exposed on its instance as `data` property.

```javascript
const data = { user: "john" };
const task = q.add(taskFunction, data);
console.log(task.data.user); // "john"
```

### Task ID

Each task is given basic auto-incrementing id. Use it when you need to differentiate tasks without keeping their
references. Notice these ids aren't unique, on Node.js apps they will restart each time a server is restart, so they are
not suitable to put into database. The IDs are read only.

```javascript
const task = q.add(taskFunction);
console.log(task.id); // i.e. 5
```

## Cancelling tasks

Both not started and ongoing tasks can be cancelled. Not started task will be simply removed from the queue, while
ongoing tasks will be notified about cancel request and will stay in the queue until it's completed. It's up to the task
function code to react on cancel request.

To cancel a task you can use a method on task instance:
```javascript
const data = { user: "john" };
const task = q.add(taskFn, data);
// later
task.cancel();
```

Or you can use filter-based cancelling method on the Queue instance:
```javascript
q.cancelBy((taskData, isRunning, isCancelled) => {
    return taskData && taskData.user === "john";
});
```

This code will cancel all John's tasks.

> Note: Make your filtering function safe when it comes to task data being defined or in different shape for some tasks.

You can check if task is cancelled using Task instance:

```javascript
task.isCancelled();
```

> For information about cancelling ongoing tasks see: {@page 04cancelling.md}.

## Getting tasks list from the queue

At anytime you can get a list of tasks from the queue.

To get all tasks use:
```javascript
const tasks = q.getTasks();
```

> Please take note that queue will list the tasks until they are finished. So already running tasks will still be listed.

To get some tasks use:
```javascript
const tasks = q.filter((data, isRunning, isCancelled) => {
    return !isRunning && data && data.name === "john";
});
```

This code will return all the tasks with `name` == "john" in data that are waiting for run.

> If you need to constantly track queue length you can use {@page 03events.md}.

## Getting task position

> Note that task positions are numbered from 0.

You can get given task position from the Task itself:

```javascript
const position = task.getPosition();
```

Or using Queue instance:

```javascript
const position = q.getTaskPosition(task);
```

Please note that running task isn't always first in the queue, because of two reasons:
- if a queue has concurrency set then few tasks can run at once, they can't be all first
- another task may be added at first position while others are running - this new task won't run until there is free concurrency slot, but it will still be listed as first

> When using `getTaskPosition`, but the task doesn't exist in the queue (it is finished or never had belonged to it)
> you will get -1 in return.

This method isn't really suitable to i.e. show a task position in the queue to users of your app, because they aren't
interested in amount of running tasks. See next section.

## Getting task position in a waiting queue

You can get given task waiting position from the Task itself:

```javascript
const position = task.getWaitingPosition();
```

Or using Queue instance:

```javascript
const position = q.getTaskWaitingPosition(task);
```

This list doesn't include running tasks, so this is a best choice to i.e. show user his task position in the queue.

## Checking if the task is running

You can check if given task is currently running using Task instance:

```javascript
const isRunnig = task.isRunning();
```

Or using Queue instance:

```javascript
const isRunning = q.isTaskRunning(task);
```

To track **when** task started or ended use {@page 03events.md}.

## Pausing the queue

At any time you can pause the queue. This will let current tasks continue but will prevent future tasks from starting
until queue is unpaused.

```javascript
const isRunning = q.pause();

setTimeout(() => {
    q.unpause()
}, 60000); // unpause after a minute
```
