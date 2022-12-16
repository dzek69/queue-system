import type { Queue } from "./Queue.js";
import type { IsDestroyed, PromisedTaskFn } from "./types";

let id: number;
id = 1;

const noop = () => undefined;

/**
 * Task instance, created when you call the {@link Queue.add}, {@link Queue.prepend}, {@link Queue.insertAt} methods of
 * {@link Queue} instance.
 *
 * @remarks Not exported and not intended to instantiate manually.
 */
class Task<ReturnValueType = unknown> {
    private readonly _queue: Queue;

    private readonly _fn: PromisedTaskFn<ReturnValueType>;

    private _cancelled: boolean;

    private _started: boolean;

    private readonly _id: number;

    /**
     * Data associated with this task, when added to the queue. Can be freely modified at any point.
     */
    public data?: { [key: string]: unknown };

    private readonly _promise: Promise<ReturnValueType>;

    private readonly _cancelPromise: Promise<never>;

    private _cancelReject?: (error: Error) => void;

    private _cancelError?: Error;

    private _resolve: Parameters<ConstructorParameters<typeof Promise<ReturnValueType>>[0]>[0] = noop;

    private _reject: Parameters<ConstructorParameters<typeof Promise<ReturnValueType>>[0]>[1] = noop;

    private readonly _isQueueDestroyed: IsDestroyed;

    /**
     * @hidden
     */
    public start: typeof Task.prototype.run;

    /**
     * @privateRemark Tasks instances should only be created by Queue instance. Do not use directly.
     * @param queue - queue instance
     * @param fn - task function
     * @param isQueueDestroyed - function that verifies if task can be started
     * @hidden
     */
    public constructor(queue: Queue, fn: PromisedTaskFn<ReturnValueType>, isQueueDestroyed: IsDestroyed) {
        this._queue = queue;
        this._fn = fn;

        this._cancelled = false;
        this._started = false;
        this._id = id++;

        this._promise = new Promise<ReturnValueType>((_resolve, _reject) => {
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
     * @returns `true` if task was cancelled, `false` otherwise
     */
    public isCancelled() {
        return this._cancelled;
    }

    /**
     * Requests task cancellation. It's up to task code to handle this cancellation.
     * @see {@page 04cancelling.md}.
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
     * Starts the task.
     * @throws Error - when task is already started or task belongs to queue that is destroyed
     * @returns A promise than resolves after task is resolved or rejected. This promise doesn't contain
     * resolved value or rejected error, for this use {@link Task.promise}
     */
    public run(): Promise<void> {
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
     * @returns task index or -1 if not found in the queue
     */
    public getPosition() {
        return this._queue.getTaskPosition(this);
    }

    /**
     * Gets task waiting position in the queue. 0 means the task is next one to be run. -1 means task is no longer
     * waiting (running or done).
     * @returns task wait index or -1 if not waiting
     */
    public getWaitingPosition() {
        return this._queue.getTaskWaitingPosition(this);
    }

    /**
     * Checks if task is currently running.
     * @returns `true` if task is running, `false` otherwise
     */
    public isRunning() {
        return this._queue.isTaskRunning(this);
    }

    /**
     * Gets you autogenerated task id.
     * @see {@page 02advanced.md} tutorial, `Task ID` section.
     */
    public get id() {
        return this._id;
    }

    /**
     * Gets you the promise which you can use to attach a `.then` and `.catch` callbacks if you are interested in result
     * of your task.
     *
     * @remark
     * You should actually always attach `.catch` callback to prevent UncaughtRejection errors from being thrown.
     */
    public get promise() {
        return this._promise;
    }
}

export { Task };
