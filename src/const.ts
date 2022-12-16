import type { Task } from "./Task";

/**
 * Events emitted on the Queue instance.
 * @example import { Queue, EVENTS } from "queue-system";
 * const q = new Queue();
 * q.on(EVENTS.TASK_ADD, () => sendNotification("New task just got added"));
 */
enum EVENTS {
    /**
     * Emitted when a task is added to the queue (no matter of position)
     */
    TASK_ADD = "task-add",
    /**
     * Emitted when a task is removed from the queue
     */
    TASK_REMOVE = "task-remove",
    /**
     * Emitted when a task is run
     */
    TASK_START = "task-start",
    /**
     * Emitted when a task finishes its run
     */
    TASK_END = "task-end",
    /**
     * Emitted when a task finishes its run with a success (Promise resolves or simply no reject for synchronous task)
     */
    TASK_SUCCESS = "task-success",
    /**
     * Emitted when an async task finishes its run with an error (Promise rejects)
     */
    TASK_ERROR = "task-error",
    /**
     * Emitted when an sync task throws an error
     */
    TASK_THROWN = "task-thrown",
    /**
     * Emitted when the queue size is changed (task is added or removed from the queue), with a number of tasks in it as
     * a parameter
     */
    QUEUE_SIZE = "queue-size",
    /**
     * Emitted when the queue size is changed (task is added or removed from the queue), with a tasks list as a
     * parameter
     */
    QUEUE_ORDER = "queue-order",
}

type EventsTypes = {
    [EVENTS.TASK_ADD]: (task: Task<unknown>) => void;
    [EVENTS.TASK_REMOVE]: (task: Task<unknown>) => void;
    [EVENTS.TASK_START]: (task: Task<unknown>) => void;
    [EVENTS.TASK_END]: (task: Task<unknown>, result: unknown) => void;
    [EVENTS.TASK_SUCCESS]: (task: Task<unknown>, result: unknown) => void;
    [EVENTS.TASK_ERROR]: (task: Task<unknown>, error: Error) => void;
    [EVENTS.TASK_THROWN]: (task: Task<unknown>, error: Error) => void;
    [EVENTS.QUEUE_SIZE]: (size: number) => void;
    [EVENTS.QUEUE_ORDER]: (order: Task<unknown>[]) => void;
};

export { EVENTS };

export type { EventsTypes };
