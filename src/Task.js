let id;
id = 1;

const noop = () => {}; // eslint-disable-line no-empty-function

class Task {
    /**
     * Tasks instances should only be created by Queue instance. Do not use directly.
     * @param {Queue} queue - queue instance
     * @param {function} fn - task function
     * @param {function} check - function that verifies if task can be started
     * @class Task
     */
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

    _isCancelled() {
        if (this._cancelled) {
            return Promise.reject(this._cancelError);
        }
        return Promise.resolve();
    }

    /**
     * Checks if task was requested to be cancelled.
     * @returns {boolean} - true if task was cancelled, false otherwise
     */
    isCancelled() {
        return this._cancelled;
    }

    /**
     * Requests task cancellation.
     */
    cancel() {
        if (this._cancelled) {
            return;
        }
        this._cancelled = true;
        this._cancelReject(new Error("Task cancelled"));
        if (!this._started) {
            this.remove();
        }
    }

    /**
     * Starts task.
     * @param {boolean} force - force start immediately
     * @returns {void|Promise}
     * @throws Error - when task is already started or task belongs to queue that is destroyed
     */
    run(force) {
        if (this._cancelled) {
            throw new Error("Task was cancelled.");
        }
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

        return this._fn(this._isCancelled.bind(this), this._cancelPromise).then(this._resolve, this._reject);
    }

    /**
     * Removes task from list without cancelling it.
     * @deprecated use cancel instead
     */
    remove() {
        this._queue.remove(this);
    }

    /**
     * Gets task position in the queue.
     * @returns {number} task index or -1 if not found in the queue
     */
    getPosition() {
        return this._queue.getTaskPosition(this);
    }

    /**
     * Checks if task is currently running.
     * @returns {boolean} - true if task is running, false otherwise
     */
    isRunning() {
        return this._queue.isTaskRunning(this);
    }
}

export default Task;
