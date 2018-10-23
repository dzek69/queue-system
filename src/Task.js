let id;
id = 1;

class Task {
    constructor(queue, fn, check) {
        this._queue = queue;
        this._fn = fn;
        this._check = check;
        this._started = false;
        this.id = id++;

        this.promise = new Promise((_resolve, _reject) => {
            this._resolve = _resolve;
            this._reject = _reject;
        });

        this.start = this.run;
    }

    run(force) {
        if (!force && !this._check()) {
            return;
        }
        if (this._started) {
            throw new Error("Task already started.");
        }

        this._started = true;

        return this._fn().then(this._resolve, this._reject);
    }

    remove() {
        console.log("remove self from queue", this.id);
        this._queue.remove(this);
    }
}

export default Task;
