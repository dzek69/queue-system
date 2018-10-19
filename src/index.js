import Task from "./Task";

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
    }

    _runNext() {
        console.log(this._tasks.map(t => t.id));
        console.log(this._runningTasks.map(t => t.id));
        const taskToRun = this._tasks.find((task) => {
            return !this._runningTasks.includes(task)
        });
        if (taskToRun) {
            taskToRun.run();
        }
    }

    createTask(taskFn) {
        const check = () => {
            console.log("check", task.id, this._runningTasks < this._concurrency);
            return this._runningTasks.length < this._concurrency;
        };
        const run = () => {
            console.log("running task", task.id); // eslint-disable-line no-use-before-define
            this._runningTasks.push(task); // eslint-disable-line no-use-before-define
            return taskFn().finally(() => {
                console.log("task done", task.id); // eslint-disable-line no-use-before-define
                this.remove(task); // eslint-disable-line no-use-before-define
                this._removeRunning(task); // eslint-disable-line no-use-before-define
                this._runNext();
            });
        };
        const task = new Task(this, run, check);
        return task;
    }

    add(taskFn) {
        const task = this.createTask(taskFn);
        this._tasks.push(task);
        this._runNext();
        return task;
    }

    prepend(taskFn) {
        const task = this.createTask(taskFn);
        this._tasks.unshift(task);
        this._runNext();
        return task;
    }

    insertAt(taskFn, index) {
        const task = this.createTask(taskFn);
        console.log("***")
        console.log(">", this._tasks.map(t => t.id));
        this._tasks.splice(index, 0, task);
        console.log(">", this._tasks.map(t => t.id));
        this._runNext();
        return task;
    }

    remove(taskInstance) {
        console.log("removing", taskInstance.id)
        remove(this._tasks, taskInstance);
    }

    _removeRunning(taskInstance) {
        console.log("removing running", taskInstance.id)
        remove(this._runningTasks, taskInstance);
    }
}

export default Queue;
