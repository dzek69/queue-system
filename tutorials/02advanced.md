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

Task data is also exposed on its instance as `data` property.

```javascript
const data = {};
const task = q.add(taskFunction, data);
task.data === data; // true
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

Of course in this example you will cancel all John's tasks if mutiple was added and keep in mind that this method is
slower for single tasks as it needs to loop and compare the whole queue.

> Note: Make your filtering function safe when it comes to task data being defined or in different shape for some tasks.

You can check if task is cancelled using Task instance:

```javascript
task.isCancelled();
```

> For information about cancelling ongoing tasks see: {@tutorial 04cancelling}.

## Getting tasks list from the queue

At anytime you can get a list of tasks from the queue.

To get all tasks use:
```javascript
const tasks = q.getTasks();
```

To get some tasks use:
```javascript
const tasks = q.filter((data, isRunning, isCancelled) => {});
```

> If you need to track queue length you can use {@tutorial 03events}.

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
- while running - a task may be added at first position - it won't run until there is free concurrency slot, but it will
still be listed as first

Don't rely on this too much to show your users their job queue position.

> When the task doesn't exist in the queue (it is finished or never had belonged to it (when using `getTaskPosition`))
> you will get -1 in return.

## Checking if task is in running

You can check if given task is currently running using Task instance:

```javascript
const isRunnig = task.isRunning();
```

Or using Queue instance:

```javascript
const isRunning = q.isTaskRunning(task);
```

To track **when** task started or ended use {@tutorial 03events}.
