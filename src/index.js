import Task from "./Task";
import EventEmitter from "eventemitter3";

const NOT_FOUND = -1;

const remove = (array, searchItem) => {
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

const EVENTS = {
    TASK_ADD: "task-add",
    TASK_REMOVE: "task-remove",
    TASK_START: "task-start",
    TASK_END: "task-end",
    TASK_SUCCESS: "task-success",
    TASK_ERROR: "task-error",
    TASK_THROWN: "task-thrown",
    QUEUE_SIZE: "queue-size",
};

const knownEvents = Object.values(EVENTS);

const isPromiseLike = (object) => {
    return object && typeof object.then === "function" && typeof object.catch === "function";
};

/**
 * @typedef {Object} QueueOptions
 * @property {number} concurrency - how many tasks should be executed at once
 */

/**
 * @typedef {Object} QueueDestroyInfo
 * @property {Array<Task>} removed - list of removed tasks, that hadn't had a chance to start
 * @property {Array<Task>} inProgress - list of ongoing tasks
 */

/**
 * @typedef {function} QueueFilterFunction
 * @param {*} data - task related data
 * @param {boolean} isRunning - is the task running
 * @param {boolean} isCancelled - is the task cancelled
 */

/**
 * @class Queue
 */
class Queue {
    /**
     * @param {QueueOptions} options
     */
    constructor(options = {}) {
        this._concurrency = options.concurrency || 1;

        this._tasks = [];
        this.push = this.add;
        this.unshift = this.prepend;

        this._runningTasks = [];

        this._ee = new EventEmitter();

        this._destroyed = false;

        this.on = this.addEventListener;
        this.off = this.removeEventListener;
        this.once = this.addEventListenerOnce;
    }

    _destroyedCheck() {
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
    destroy() {
        this._destroyedCheck();
        this._destroyed = true;

        this._ee.removeAllListeners();

        const tasksToRemove = this._tasks.filter((task) => {
            return !this.isTaskRunning(task);
        });
        tasksToRemove.forEach(task => this._remove(task));

        return {
            removed: tasksToRemove,
            inProgress: [...this._runningTasks],
        };
    }

    _runNext() {
        const taskToRun = this._tasks.find((task) => {
            return !this.isTaskRunning(task);
        });
        if (taskToRun) {
            taskToRun.run();
            if (this._isConcurrencySlotFree()) {
                this._runNext();
            }
        }
    }

    _isConcurrencySlotFree() {
        return this._runningTasks.length < this._concurrency;
    }

    _createTask(taskFn, data) {
        const check = () => {
            return this._isConcurrencySlotFree();
        };
        /* eslint-disable no-use-before-define */
        const run = (isCancelled, cancelPromise) => {
            this._ee.emit(EVENTS.TASK_START, task);
            this._runningTasks.push(task);

            const end = (event) => {
                this._ee.emit(EVENTS.TASK_END, task);
                this._ee.emit("task-" + event, task); // @todo fix to avoid event name concatenation
                this._remove(task);
                this._removeRunning(task);
                this._runNext();
            };

            try {
                const taskPromise = taskFn(isCancelled, cancelPromise);
                if (isPromiseLike(taskPromise)) {
                    return taskPromise.then((result) => {
                        end("success");
                        return result;
                    }, (error) => {
                        end("error");
                        throw error;
                    });
                }
                end("success");
                return Promise.resolve(taskPromise);
            }
            catch (e) {
                end("thrown");
                return Promise.reject(e);
            }
        };
        if (taskFn.id) {
            run.id = taskFn.id;
        }
        /* eslint-enable no-use-before-define */
        const task = new Task(this, run, check);
        task.data = data;
        return task;
    }

    /**
     * Adds specified queue event listener.
     * @alias on
     * @param {EventName} eventName - event name
     * @param {function} fn - listener
     * @returns {function} - unsubscribe function, call it to remove event listener
     * @throws Error - when queue is destroyed or unknown event name is given
     */
    addEventListener(eventName, fn) {
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
     * @alias once
     * @param {EventName} eventName - event name
     * @param {function} fn - listener
     * @returns {function} - unsubscribe function, call it to remove event listener
     * @throws Error - when queue is destroyed or unknown event name is given
     */
    addEventListenerOnce(eventName, fn) {
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
     * @alias off
     * @param {EventName} eventName - event name
     * @param {function} fn - listener
     * @throws Error - when queue is destroyed or unknown event name is given
     */
    removeEventListener(eventName, fn) {
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
    setConcurrency(concurrency) {
        this._destroyedCheck();
        this._concurrency = concurrency;
        this._runNext();
    }

    /**
     * Adds a task to the queue.
     * @alias push
     * @param {function} taskFn - task function
     * @param {*} [data] - data related to task, used for filtering tasks in the queue
     * @returns {Task}
     * @throws Error - when queue is destroyed
     */
    add(taskFn, data) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.push(task);
        this._ee.emit(EVENTS.TASK_ADD, task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
        this._runNext();
        return task;
    }

    /**
     * Adds a task to beginning of the queue.
     * @alias unshift
     * @param {function} taskFn - task function
     * @param {*} [data] - data related to task, used for filtering tasks in the queue
     * @returns {Task}
     * @throws Error - when queue is destroyed
     */
    prepend(taskFn, data) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.unshift(task);
        this._ee.emit(EVENTS.TASK_ADD, task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
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
    insertAt(taskFn, index, data) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.splice(index, 0, task);
        this._ee.emit(EVENTS.TASK_ADD, task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
        this._runNext();
        return task;
    }

    /**
     * Removes queue from task. This won't cancel ongoing task.
     * @param {Task} task
     * @throws {Error} - when task isn't in the queue or queue is destroyed
     */
    remove(task) {
        this._destroyedCheck();
        this._remove(task);
    }

    _remove(task) {
        const lengthBefore = this._tasks.length;
        remove(this._tasks, task);
        if (this._tasks.length === lengthBefore) {
            throw new Error("Task not found in queue");
        }
        this._ee.emit(EVENTS.TASK_REMOVE, task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
    }

    _removeRunning(task) {
        remove(this._runningTasks, task);
    }

    /**
     * Returns queue size.
     * @returns {number}
     */
    getQueueSize() {
        return this._tasks.length;
    }

    /**
     * Returns current tasks (ongoing and waiting).
     * @returns {Array<Task>}
     */
    getTasks() {
        return [...this._tasks];
    }

    /**
     * Returns tasks by filtering function.
     * @param {QueueFilterFunction} fn - filtering function
     * @returns {Array<Task>}
     */
    filter(fn) {
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
    cancelBy(fn) {
        const tasks = this.filter(fn);
        tasks.forEach(task => task.cancel());
        return tasks;
    }

    /**
     * Returns given task position in the queue.
     * @param {Task} task - task to look for
     * @returns {number} - task index or -1 if not found
     */
    getTaskPosition(task) {
        return this._tasks.findIndex(t => t === task);
    }

    /**
     * Is given task running?
     * @param {Task} task - task to check
     * @returns {boolean} - true if task is running, false otherwise
     */
    isTaskRunning(task) {
        return this._runningTasks.includes(task);
    }
}

export default Queue;
export {
    EVENTS,
};

