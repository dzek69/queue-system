import type { Queue } from "./Queue.js";
import type { IsDestroyed, PromisedTaskFn } from "./types";

let id: number;
id = 1;

const noop = () => undefined;

class Task<Val> {
    private readonly _queue: Queue;

    private readonly _fn: PromisedTaskFn<Val>;

    private _cancelled: boolean;

    private _started: boolean;

    public id: number; // @TODO make private? remove?

    public data?: { [key: string]: unknown };

    public promise: Promise<Val>;

    private readonly _cancelPromise: Promise<never>;

    private _cancelReject?: (error: Error) => void;

    private _cancelError?: Error;

    private _resolve?: (value: Val) => void;

    private _reject?: (reason?: unknown) => void;

    private readonly _isQueueDestroyed: IsDestroyed;

    public start: typeof Task.prototype.run;

    /**
     * Tasks instances should only be created by Queue instance. Do not use directly.
     * @param {Queue} queue - queue instance
     * @param {function} fn - task function
     * @param {function} isQueueDestroyed - function that verifies if task can be started
     * @class Task
     */
    public constructor(queue: Queue, fn: PromisedTaskFn<Val>, isQueueDestroyed: IsDestroyed) {
        this._queue = queue;
        this._fn = fn;

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
            this._cancelReject = (error: Error) => {
                this._cancelError = error;
                _reject(error);
            };
        });

        this._isQueueDestroyed = isQueueDestroyed;

        this._cancelPromise.catch(noop); // prevent unhandled rejection if catch isn't registered (isCancelled is used)

        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.start = this.run;
        this.cancel = this.cancel.bind(this);
    }

    private async _isCancelled() {
        if (this._cancelled) {
            return Promise.reject(this._cancelError);
        }
        return Promise.resolve();
    }

    /**
     * Checks if task was requested to be cancelled.
     * @returns {boolean} - true if task was cancelled, false otherwise
     */
    public isCancelled() {
        return this._cancelled;
    }

    /**
     * Requests task cancellation.
     */
    public cancel() {
        if (this._cancelled) {
            return;
        }
        this._cancelled = true;
        this._cancelReject!(new Error("Task cancelled"));
        if (!this._started) {
            this.remove();
        }
    }

    /**
     * Starts task.
     * @returns {void|Promise}
     * @throws Error - when task is already started or task belongs to queue that is destroyed
     */
    public run(): undefined | Promise<unknown> {
        if (this._cancelled) {
            throw new Error("Task was cancelled.");
        }
        if (this._started) {
            throw new Error("Task already started.");
        }
        if (this._isQueueDestroyed()) {
            throw new Error("Task belongs to destroyed queue.");
        }

        this._started = true;

        return this._fn(this._isCancelled.bind(this), this._cancelPromise)
            .then(this._resolve, this._reject);
    }

    /**
     * Removes task from list without cancelling it.
     * @deprecated use cancel instead
     */
    public remove() {
        this._queue.remove(this);
    }

    /**
     * Gets task position in the queue.
     * @returns {number} task index or -1 if not found in the queue
     */
    public getPosition() {
        return this._queue.getTaskPosition(this);
    }

    /**
     * Checks if task is currently running.
     * @returns {boolean} - true if task is running, false otherwise
     */
    public isRunning() {
        return this._queue.isTaskRunning(this);
    }
}

export { Task };
