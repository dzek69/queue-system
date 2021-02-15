/**
 * @typedef {string} EventName
 */
enum EVENTS {
    TASK_ADD = "task-add",
    TASK_REMOVE = "task-remove",
    TASK_START = "task-start",
    TASK_END = "task-end",
    TASK_SUCCESS = "task-success",
    TASK_ERROR = "task-error",
    TASK_THROWN = "task-thrown",
    QUEUE_SIZE = "queue-size",
    QUEUE_ORDER = "queue-order",
}

export {
    EVENTS,
};
