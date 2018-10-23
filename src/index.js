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
        console.log(this._tasks.map(t => t.id));
        console.log(this._runningTasks.map(t => t.id));
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
            console.log("check", task.id, this._runningTasks < this._concurrency);
            return this._isConcurrencySlotFree();
        };
        const run = () => {
            console.log("running task", task.id); // eslint-disable-line no-use-before-define
            this._ee.emit("task-start", task.id);
            this._runningTasks.push(task); // eslint-disable-line no-use-before-define

            const end = () => {
                this._ee.emit("task-end", task.id);
                console.log("task done", task.id); // eslint-disable-line no-use-before-define
                this.remove(task); // eslint-disable-line no-use-before-define
                this._removeRunning(task); // eslint-disable-line no-use-before-define
                this._runNext();
            };

            try {
                return taskFn().then((result) => {
                    end();
                    return result;
                }, (error) => {
                    end();
                    throw error;
                });
            }
            catch (e) {
                end();
                return Promise.reject(e);
            }
        };
        const task = new Task(this, run, check);
        return task;
    }

    addEventListener(eventName, fn) {
        this._ee.on(eventName, fn);
    }

    removeEventListener(eventName, fn) {
        this._ee.off(eventName, fn);
    }

    setConcurrency(concurrency) {
        this._concurrency = concurrency;
        this._runNext();
    }

    add(taskFn) {
        const task = this._createTask(taskFn);
        this._tasks.push(task);
        this._ee.emit("task-add", task.id);
        this._ee.emit("queue-size", this._tasks.length);
        this._runNext();
        return task;
    }

    prepend(taskFn) {
        const task = this._createTask(taskFn);
        this._tasks.unshift(task);
        this._ee.emit("task-add", task.id);
        this._ee.emit("queue-size", this._tasks.length);
        this._runNext();
        return task;
    }

    insertAt(taskFn, index) {
        const task = this._createTask(taskFn);
        console.log("***");
        console.log(">", this._tasks.map(t => t.id));
        this._tasks.splice(index, 0, task);
        console.log(">", this._tasks.map(t => t.id));
        this._ee.emit("task-add", task.id);
        this._ee.emit("queue-size", this._tasks.length);
        this._runNext();
        return task;
    }

    remove(task) {
        console.log("removing", task.id);
        remove(this._tasks, task);
        this._ee.emit("task-remove", task.id);
        this._ee.emit("queue-size", this._tasks.length);
    }

    _removeRunning(task) {
        console.log("removing running", task.id);
        remove(this._runningTasks, task);
    }
}

export default Queue;
