/* eslint-disable max-lines */
import EventEmitter from "eventemitter3";

import { Task } from "./Task.js";
import { EVENTS } from "./const.js";
import { isThenable } from "./isThenable.js";
import type { FilterFn, QueueOptions, TaskFn, QueueDestroyInfo, PromisedTaskFn } from "./types";

const NOT_FOUND = -1;

const remove = (array: unknown[], searchItem: unknown) => {
    const index = array.findIndex(item => item === searchItem);
    if (index === NOT_FOUND) {
        return;
    }

    array.splice(index, 1);
};

/**
 * @typedef {string} EventName
 */
// @todo add typedef for events list and use it on EVENTS object

const knownEvents = Object.values(EVENTS);

class Queue {
    private _concurrency: number;

    private readonly _tasks: Task<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any

    private readonly _runningTasks: Task<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any

    private readonly _ee: EventEmitter;

    private _destroyed: boolean;

    public push: typeof Queue.prototype.add;

    public unshift: typeof Queue.prototype.prepend;

    public on: typeof Queue.prototype.addEventListener;

    public off: typeof Queue.prototype.removeEventListener;

    public once: typeof Queue.prototype.addEventListenerOnce;

    /**
     * @param {QueueOptions} options
     * @class Queue
     */
    public constructor(options: QueueOptions = {}) {
        /* eslint-disable @typescript-eslint/unbound-method */
        this._concurrency = (options.concurrency! > 0) ? options.concurrency! : 1;

        this._tasks = [];
        this._runningTasks = [];

        this.push = this.add;
        this.unshift = this.prepend;

        this._ee = new EventEmitter();

        this._destroyed = false;

        this.on = this.addEventListener;
        this.off = this.removeEventListener;
        this.once = this.addEventListenerOnce;
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    private _destroyedCheck() {
        if (this._destroyed) {
            throw new Error("This queue is destroyed");
        }
    }

    /**
     * Destroys queue.
     * Destroying removes waiting tasks, ongoing tasks are continued. You may manually cancel them.
     * Destroyed instance won't allow you to do anything with it anymore.
     * @returns {QueueDestroyInfo} - list of removed and ongoing tasks
     */
    public destroy(): QueueDestroyInfo {
        this._destroyedCheck();
        this._destroyed = true;

        this._ee.removeAllListeners();

        const tasksToRemove = this._tasks.filter((task) => {
            return !this.isTaskRunning(task);
        });
        tasksToRemove.forEach(task => { this._remove(task); });

        return {
            removed: tasksToRemove,
            inProgress: [...this._runningTasks],
        };
    }

    private _runNext() {
        const taskToRun = this._tasks.find((task) => {
            return !this.isTaskRunning(task);
        });
        if (taskToRun) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            taskToRun.run();
            if (this._isConcurrencySlotFree()) {
                this._runNext();
            }
        }
    }

    private _isConcurrencySlotFree() {
        return this._runningTasks.length < this._concurrency;
    }

    private _createTask<V>(taskFn: TaskFn<V>, data?: { [key: string]: unknown }) {
        const check = () => {
            return this._isConcurrencySlotFree();
        };

        const run: PromisedTaskFn<V> = async (
            isCancelled: () => Promise<void>,
            cancelPromise: Promise<never>,
        ) => {
            /* eslint-disable @typescript-eslint/no-use-before-define */
            this._ee.emit(EVENTS.TASK_START, task);
            this._runningTasks.push(task);

            const end = (event: EVENTS) => {
                this._ee.emit(EVENTS.TASK_END, task);
                this._ee.emit(event, task);
                this._remove(task);
                this._removeRunning(task);
                this._runNext();
            };

            try {
                const taskPromise = taskFn(isCancelled, cancelPromise);
                if (isThenable(taskPromise)) {
                    // eslint-disable-next-line no-warning-comments
                    // @FIXME this typecast shouldn't be needed. TypeScript bug?
                    return (taskPromise).then((result) => {
                        end(EVENTS.TASK_SUCCESS);
                        return result;
                    }, (error) => {
                        end(EVENTS.TASK_ERROR);
                        throw error;
                    });
                }
                end(EVENTS.TASK_SUCCESS);
                return Promise.resolve(taskPromise);
            }
            catch (e: unknown) {
                end(EVENTS.TASK_THROWN);
                return Promise.reject(e);
            }
        };
        if (taskFn.id) {
            run.id = taskFn.id;
        }
        /* eslint-enable @typescript-eslint/no-use-before-define */
        const task = new Task(this, run, check, () => this._destroyed);
        task.data = data;
        return task;
    }

    /**
     * Adds specified queue event listener.
     * @param {EVENTS} eventName - event name
     * @param {function} fn - listener
     * @returns {function} - unsubscribe function, call it to remove event listener
     * @throws Error - when queue is destroyed or unknown event name is given
     */
    public addEventListener(eventName: EVENTS, fn: () => void) {
        this._destroyedCheck();
        if (!knownEvents.includes(eventName)) {
            throw new Error("Unknown event");
        }
        this._ee.on(eventName, fn);
        return () => {
            this.removeEventListener(eventName, fn);
        };
    }

    /**
     * Adds specified queue event listener that will be called only on first occurrence of event after adding.
     * @param {EVENTS} eventName - event name
     * @param {function} fn - listener
     * @returns {function} - unsubscribe function, call it to remove event listener
     * @throws Error - when queue is destroyed or unknown event name is given
     */
    public addEventListenerOnce(eventName: EVENTS, fn: () => void) {
        this._destroyedCheck();
        if (!knownEvents.includes(eventName)) {
            throw new Error("Unknown event");
        }
        this._ee.once(eventName, fn);
        return () => {
            this.removeEventListener(eventName, fn);
        };
    }

    /**
     * Removes specified queue event listener.
     * @param {EVENTS} eventName - event name
     * @param {function} fn - listener
     * @throws Error - when queue is destroyed or unknown event name is given
     */
    public removeEventListener(eventName: EVENTS, fn: () => void) {
        this._destroyedCheck();
        if (!knownEvents.includes(eventName)) {
            throw new Error("Unknown event");
        }
        this._ee.off(eventName, fn);
    }

    /**
     * Changes how many tasks may run at once.
     * @param {number} concurrency - count of tasks to run at once
     */
    public setConcurrency(concurrency: number) {
        this._destroyedCheck();
        this._concurrency = concurrency;
        this._runNext();
    }

    /**
     * Adds a task to the queue.
     * @param {function} taskFn - task function
     * @param {*} [data] - data related to task, used for filtering tasks in the queue
     * @returns {Task}
     * @throws Error - when queue is destroyed
     */
    public add<V>(taskFn: TaskFn<V>, data?: { [key: string]: unknown }) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.push(task);
        this._ee.emit(EVENTS.TASK_ADD, task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
        this._ee.emit(EVENTS.QUEUE_ORDER, this.getTasks());
        this._runNext();
        return task;
    }

    /**
     * Adds a task to beginning of the queue.
     * @param {function} taskFn - task function
     * @param {*} [data] - data related to task, used for filtering tasks in the queue
     * @returns {Task}
     * @throws Error - when queue is destroyed
     */
    public prepend<V>(taskFn: TaskFn<V>, data?: { [key: string]: unknown }) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.unshift(task);
        this._ee.emit(EVENTS.TASK_ADD, task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
        this._ee.emit(EVENTS.QUEUE_ORDER, this.getTasks());
        this._runNext();
        return task;
    }

    /**
     * Adds a task to given point of the queue.
     * @param {function} taskFn - task function
     * @param {number} index - task position in the queue (starting from 0). Keep in mind that ongoing tasks are kept
     * in this list, ie: with concurrency of 2 adding task to index 2 will mean this task will be first to run, not
     * third.
     * @param {*} [data] - data related to task, used for filtering tasks in the queue
     * @returns {Task}
     * @throws Error - when queue is destroyed
     */
    public insertAt<V>(taskFn: TaskFn<V>, index: number, data?: { [key: string]: unknown }) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.splice(index, 0, task);
        this._ee.emit(EVENTS.TASK_ADD, task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
        this._ee.emit(EVENTS.QUEUE_ORDER, this.getTasks());
        this._runNext();
        return task;
    }

    /**
     * Removes queue from task. This won't cancel ongoing task.
     * @param {Task} task
     * @throws {Error} - when task isn't in the queue or queue is destroyed
     */
    public remove<V>(task: Task<V>) {
        this._destroyedCheck();
        this._remove(task);
    }

    private _remove<V>(task: Task<V>) {
        const lengthBefore = this._tasks.length;
        remove(this._tasks, task);
        if (this._tasks.length === lengthBefore) {
            throw new Error("Task not found in queue");
        }
        this._ee.emit(EVENTS.TASK_REMOVE, task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
        this._ee.emit(EVENTS.QUEUE_ORDER, this.getTasks());
    }

    private _removeRunning<V>(task: Task<V>) {
        remove(this._runningTasks, task);
    }

    /**
     * Returns queue size.
     * @returns {number}
     */
    public getQueueSize() {
        return this._tasks.length;
    }

    /**
     * Returns current tasks (ongoing and waiting).
     * @returns {Array<Task>}
     */
    public getTasks() {
        return [...this._tasks];
    }

    /**
     * Returns tasks by filtering function.
     * @param {QueueFilterFunction} fn - filtering function
     * @returns {Array<Task>}
     */
    public filter(fn: FilterFn) {
        return this._tasks.filter(task => {
            const isRunning = this.isTaskRunning(task);
            const isCancelled = task.isCancelled();
            return fn(task.data, isRunning, isCancelled);
        });
    }

    /**
     * Cancels tasks by predicate
     * @param {QueueFilterFunction} fn - filtering function
     * @returns {Array<Task>} - cancelled tasks
     */
    public cancelBy(fn: FilterFn) {
        const tasks = this.filter(fn);
        tasks.forEach(task => { task.cancel(); });
        return tasks;
    }

    /**
     * Returns given task position in the queue.
     * @param {Task} task - task to look for
     * @returns {number} - task index or -1 if not found
     */
    public getTaskPosition<V>(task: Task<V>) {
        return this._tasks.findIndex(t => t === task);
    }

    /**
     * Is given task running?
     * @param {Task} task - task to check
     * @returns {boolean} - true if task is running, false otherwise
     */
    public isTaskRunning<V>(task: Task<V>) {
        return this._runningTasks.includes(task);
    }
}

export {
    Queue,
};
