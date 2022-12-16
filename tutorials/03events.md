Queue instance is a event emitter. To listen to event register a listener:
```javascript
const listener = () => {};
q.addEventListener("event name", listener);
```

To remove a listener call the function returned from `addEventListener` or use `removeEventListener`:
```javascript
const listener = () => {};
const unregister = q.addEventListener("event name", listener);
unregister();

// or:

q.addEventListener("event name", listener);
q.removeEventListener("event name", listener);
```

You can also attach your listener for single occurrence of event - it will be automatically removed after first event of
given name occurs.

```javascript
q.addEventListenerOnce("event name", listener);
```

You can remove `once` listeners the same way as standard listener.

When a queue is destroyed - all listeners are removed automatically.

### Aliases

You can use aliases for adding/removing events:

- `on` ➡ `addEventListener`
- `off` ➡ `removeEventListener`
- `once` ➡ `addEventListenerOnce`

## Events list

Events are exposed on named export:
```javascript
import { EVENTS } from "queue-system";

q.addEventListener(EVENTS.TASK_ADD, listener);
```

**Always use constants when adding/removing a listener.**

### TASK_ADD

Emitted when task is added into the queue.

Parameters:
```text
{Task} - newly added task instance
```

### TASK_REMOVE

Emitted when task is removed from the queue either by request or automatically when task is fulfilled.

Parameters:
```text
{Task} - removed task instance
```

### TASK_START

Emitted when task function is started.

Parameters:
```text
{Task} - started task instance
```

### TASK_END

Emitted when task function is finished.

Parameters:
```text
{Task} - finished task instance
```

### TASK_SUCCESS

Emitted when task function is finished and it was successful.

Parameters:
```text
{Task} - successful task instance
```

### TASK_ERROR

Emitted when task function is finished and it was unsuccessful.

Parameters:
```text
{Task} - unsuccessful task instance
```

### TASK_THROWN

Emitted when task function thrown an error before returning.

Parameters:
```text
{Task} - task instance that thrown
```

### QUEUE_SIZE

Emitted when queue size had changed (task is added or removed). Useful for tracking when queue is done/empty.

Parameters:
```text
{number} - queue size AFTER task is added or removed
```

### QUEUE_ORDER

Emitted when queue size had changed (task is added or removed).

Parameters:
```text
{Array<Task>} - array of tasks in order how they exists in the queue; keep in mind that tasks in progress are still listed on this array
```
