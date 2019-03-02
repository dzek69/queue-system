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

const knownEvents = [
    "task-add",
    "task-remove",
    "task-start",
    "task-end",
    "task-success",
    "task-error",
    "task-thrown",
    "queue-size",
];

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
 * Defines a queue of tasks
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
            return !this._runningTasks.includes(task);
        });
        tasksToRemove.forEach(task => this._remove(task));

        return {
            removed: tasksToRemove,
            inProgress: [...this._runningTasks],
        };
    }

    _runNext() {
        const taskToRun = this._tasks.find((task) => {
            return !this._runningTasks.includes(task);
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
            this._ee.emit("task-start", task);
            this._runningTasks.push(task);

            const end = (event) => {
                this._ee.emit("task-end", task);
                this._ee.emit("task-" + event, task);
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
     * @param {function} taskFn - task function
     * @param {*} [data] - data related to task, used for filtering tasks in the queue
     * @returns {Task}
     */
    add(taskFn, data) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.push(task);
        this._ee.emit("task-add", task);
        this._ee.emit("queue-size", this.getQueueSize());
        this._runNext();
        return task;
    }

    /**
     * Adds a task to beginning of the queue.
     * Adds a task to the queue.
     * @param {function} taskFn - task function
     * @param {*} [data] - data related to task, used for filtering tasks in the queue
     * @returns {Task}
     */
    prepend(taskFn, data) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.unshift(task);
        this._ee.emit("task-add", task);
        this._ee.emit("queue-size", this.getQueueSize());
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
     */
    insertAt(taskFn, index, data) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.splice(index, 0, task);
        this._ee.emit("task-add", task);
        this._ee.emit("queue-size", this.getQueueSize());
        this._runNext();
        return task;
    }

    /**
     * Removes queue from task. This won't cancel ongoing task.
     * @param {Task} task
     * @throws {Error} - when task isn't in the queue
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
        this._ee.emit("task-remove", task);
        this._ee.emit("queue-size", this.getQueueSize());
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
     * Returns current tasks (ongoing and waiting)
     * @returns {Array<Task>}
     */
    getTasks() {
        return [...this._tasks];
    }

    /**
     * Returns tasks by filtering function
     * @param {QueueFilterFunction} fn - filtering function
     * @returns {Array<Task>}
     */
    filter(fn) {
        return this._tasks.filter(task => {
            const isRunning = this._runningTasks.includes(task);
            const isCancelled = task.isCancelled();
            return fn(task.data, isRunning, isCancelled);
        });
    }
}

export default Queue;
