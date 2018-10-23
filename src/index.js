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

class Queue {
    constructor(options = {}) {
        this._concurrency = options.concurrency || 1;

        this._tasks = [];
        this.push = this.add;
        this.unshift = this.prepend;

        this._runningTasks = [];

        this._ee = new EventEmitter();
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

    _createTask(taskFn) {
        const check = () => {
            return this._isConcurrencySlotFree();
        };
        /* eslint-disable no-use-before-define */
        const run = () => {
            this._ee.emit("task-start", task);
            this._runningTasks.push(task);

            const end = (event) => {
                this._ee.emit("task-end", task);
                this._ee.emit("task-" + event, task);
                this.remove(task);
                this._removeRunning(task);
                this._runNext();
            };

            try {
                return taskFn().then((result) => {
                    end("success");
                    return result;
                }, (error) => {
                    end("error");
                    throw error;
                });
            }
            catch (e) {
                end("thrown");
                return Promise.reject(e);
            }
        };
        /* eslint-enable no-use-before-define */
        const task = new Task(this, run, check);
        return task;
    }

    addEventListener(eventName, fn) {
        if (!knownEvents.includes(eventName)) {
            throw new Error("Unknown event");
        }
        this._ee.on(eventName, fn);
    }

    removeEventListener(eventName, fn) {
        if (!knownEvents.includes(eventName)) {
            throw new Error("Unknown event");
        }
        this._ee.off(eventName, fn);
    }

    setConcurrency(concurrency) {
        this._concurrency = concurrency;
        this._runNext();
    }

    add(taskFn) {
        const task = this._createTask(taskFn);
        this._tasks.push(task);
        this._ee.emit("task-add", task);
        this._ee.emit("queue-size", this.getQueueSize());
        this._runNext();
        return task;
    }

    prepend(taskFn) {
        const task = this._createTask(taskFn);
        this._tasks.unshift(task);
        this._ee.emit("task-add", task);
        this._ee.emit("queue-size", this.getQueueSize());
        this._runNext();
        return task;
    }

    insertAt(taskFn, index) {
        const task = this._createTask(taskFn);
        this._tasks.splice(index, 0, task);
        this._ee.emit("task-add", task);
        this._ee.emit("queue-size", this.getQueueSize());
        this._runNext();
        return task;
    }

    remove(task) {
        remove(this._tasks, task);
        this._ee.emit("task-remove", task);
        this._ee.emit("queue-size", this.getQueueSize());
    }

    _removeRunning(task) {
        remove(this._runningTasks, task);
    }

    getQueueSize() {
        return this._tasks.length;
    }
}

export default Queue;
