let id;
id = 1;

const noop = () => {}; // eslint-disable-line no-empty-function

class Task {
    constructor(queue, fn, check) {
        this._queue = queue;
        this._fn = fn;
        this._check = check;

        this._cancelled = false;
        this._started = false;
        this.id = id++;
        if (fn.id) {
            this.id = fn.id;
        }

        this.promise = new Promise((_resolve, _reject) => {
            this._resolve = _resolve;
            this._reject = _reject;
        });
        this._cancelPromise = new Promise((_resolve, _reject) => {
            this._cancelReject = (error) => {
                this._cancelError = error;
                _reject(error);
            };
        });
        this._cancelPromise.catch(noop); // prevent unhandled rejection if catch isn't registered (isCancelled is used)

        this.start = this.run;
        this.cancel = this.cancel.bind(this);
    }

    isCancelled() {
        if (this._cancelled) {
            return Promise.reject(this._cancelError);
        }
        return Promise.resolve();
    }

    cancel() {
        if (!this._cancelled) {
            this._cancelled = true;
            this._cancelReject(new Error("Task cancelled"));
        }
    }

    run(force) {
        if (!force && !this._check()) {
            return;
        }
        if (this._started) {
            throw new Error("Task already started.");
        }
        if (this._queue._destroyed) {
            throw new Error("Task belongs to destroyed queue.");
        }

        this._started = true;

        return this._fn(this.isCancelled.bind(this), this._cancelPromise).then(this._resolve, this._reject);
    }

    remove() {
        this._queue.remove(this);
    }
}

export default Task;
