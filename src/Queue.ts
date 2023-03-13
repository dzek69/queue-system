/* eslint-disable max-lines */
import EventEmitter from "eventemitter3";
import { ensureError, pull } from "@ezez/utils";

import type TypedEmitter from "typed-emitter";
import type { FilterFn, QueueOptions, TaskFn, QueueDestroyInfo, PromisedTaskFn } from "./types";
import type { EventsTypes } from "./const.js";

import { Task } from "./Task.js";
import { EVENTS } from "./const.js";
import { isThenable } from "./isThenable.js";

const knownEvents = Object.values(EVENTS);

type Emitter = TypedEmitter<EventsTypes>;

class Queue {
    private _concurrency: number;

    private readonly _tasks: Task<any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

    private readonly _runningTasks: Task<any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

    private readonly _ee: Emitter;

    private _destroyed: boolean = false;

    private _paused: boolean = false;

    /**
     * @hidden
     */
    public push: typeof Queue.prototype.add;

    /**
     * @hidden
     */
    public unshift: typeof Queue.prototype.prepend;

    /**
     * @hidden
     */
    public readonly on: typeof Queue.prototype.addEventListener;

    /**
     * @hidden
     */
    public readonly off: typeof Queue.prototype.removeEventListener;

    /**
     * @hidden
     */
    public readonly once: typeof Queue.prototype.addEventListenerOnce;

    /**
     * Creates an instance of Queue, optionally definint default options.
     * @param options
     */
    public constructor(options: QueueOptions = {}) {
        /* eslint-disable @typescript-eslint/unbound-method */
        this._concurrency = (options.concurrency! > 0) ? options.concurrency! : 1;

        this.push = this.add;
        this.unshift = this.prepend;
        this._paused = Boolean(options.paused);

        this._ee = (new EventEmitter()) as unknown as Emitter;

        this.on = this.addEventListener;
        this.off = this.removeEventListener;
        this.once = this.addEventListenerOnce;
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    private _destroyedCheck() {
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
    public destroy(): QueueDestroyInfo {
        this._destroyedCheck();
        this._destroyed = true;

        this._ee.removeAllListeners();

        const tasksToRemove = this._tasks.filter((task) => {
            return !this.isTaskRunning(task);
        });
        tasksToRemove.forEach(task => { this._remove(task); });

        return {
            removed: tasksToRemove,
            inProgress: [...this._runningTasks],
        };
    }

    private _runNext() {
        if (this._paused) {
            return;
        }

        while (this._isConcurrencySlotFree()) {
            const taskToRun = this._tasks.find((task) => {
                return !this.isTaskRunning(task);
            });
            if (taskToRun) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                taskToRun.run();
            }
            else {
                break;
            }
        }
    }

    private _isConcurrencySlotFree() {
        return this._runningTasks.length < this._concurrency;
    }

    private _createTask<V>(taskFn: TaskFn<V>, data?: { [key: string]: unknown }) {
        const run: PromisedTaskFn<V> = async (
            isCancelled: () => Promise<void>,
            cancelPromise: Promise<never>,
        ) => {
            /* eslint-disable @typescript-eslint/no-use-before-define */
            this._ee.emit(EVENTS.TASK_START, task as Task);
            this._runningTasks.push(task);

            const end = (event: EVENTS, result: unknown) => {
                this._ee.emit(EVENTS.TASK_END, task as Task, result);
                this._ee.emit(event, task as Task, result);
                this._remove(task);
                this._removeRunning(task);
                this._runNext();
            };

            try {
                const taskPromise = taskFn(isCancelled, cancelPromise);
                if (isThenable(taskPromise)) {
                    // eslint-disable-next-line @typescript-eslint/return-await
                    return taskPromise.then((result) => {
                        end(EVENTS.TASK_SUCCESS, result);
                        return result;
                    }, (error: unknown) => {
                        const err = ensureError(error);
                        end(EVENTS.TASK_ERROR, err);
                        throw err;
                    });
                }
                end(EVENTS.TASK_SUCCESS, taskPromise);
                // eslint-disable-next-line @typescript-eslint/return-await
                return Promise.resolve(taskPromise);
            }
            catch (e: unknown) {
                const err = ensureError(e);
                end(EVENTS.TASK_THROWN, err);
                return Promise.reject(err);
            }
        };
        /* eslint-enable @typescript-eslint/no-use-before-define */
        const task = new Task(this, run, () => this._destroyed);
        if (data != null) {
            task.data = data;
        }
        return task;
    }

    /**
     * Adds specified queue event listener.
     * @param {EVENTS} eventName
     * @param {function} fn - listener
     * @returns {function} - unsubscribe function, call it to remove event listener
     * @throws Error - when queue is destroyed or unknown event name is given
     */
    public addEventListener<T extends EVENTS>(eventName: T, fn: EventsTypes[T]) {
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
     * @param {EVENTS} eventName
     * @param {function} fn - listener
     * @returns {function} - unsubscribe function, call it to remove event listener
     * @throws Error - when queue is destroyed or unknown event name is given
     */
    public addEventListenerOnce<T extends EVENTS>(eventName: T, fn: EventsTypes[T]) {
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
     * @param {EVENTS} eventName
     * @param {function} fn - listener
     * @throws Error - when queue is destroyed or unknown event name is given
     */
    public removeEventListener<T extends EVENTS>(eventName: T, fn: EventsTypes[T]) {
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
    public setConcurrency(concurrency: number) {
        this._destroyedCheck();
        this._concurrency = concurrency;
        this._runNext();
    }

    /**
     * Adds a task to the queue.
     * @param taskFn - task function
     * @param data - data related to task, used for filtering tasks in the queue
     * @returns {Task} - a {@link Task} wrapper for your {@link TaskFn task function}
     * @throws Error - when queue is destroyed
     */
    public add<ReturnValue>(taskFn: TaskFn<ReturnValue>, data?: { [key: string]: unknown }) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.push(task);
        this._ee.emit(EVENTS.TASK_ADD, task as Task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
        this._ee.emit(EVENTS.QUEUE_ORDER, this.getTasks());
        this._runNext();
        return task;
    }

    /**
     * Adds a task to beginning of the queue.
     * @param {function} taskFn - task function
     * @param {*} [data] - data related to task, used for filtering tasks in the queue
     * @returns {Task}
     * @throws Error - when queue is destroyed
     */
    public prepend<V>(taskFn: TaskFn<V>, data?: { [key: string]: unknown }) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.unshift(task);
        this._ee.emit(EVENTS.TASK_ADD, task as Task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
        this._ee.emit(EVENTS.QUEUE_ORDER, this.getTasks());
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
    public insertAt<V>(taskFn: TaskFn<V>, index: number, data?: { [key: string]: unknown }) {
        this._destroyedCheck();
        const task = this._createTask(taskFn, data);
        this._tasks.splice(index, 0, task);
        this._ee.emit(EVENTS.TASK_ADD, task as Task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
        this._ee.emit(EVENTS.QUEUE_ORDER, this.getTasks());
        this._runNext();
        return task;
    }

    /**
     * Removes queue from task. This won't cancel ongoing task.
     * @param {Task} task
     * @throws {Error} - when task isn't in the queue or queue is destroyed
     */
    public remove<V>(task: Task<V>) {
        this._destroyedCheck();
        this._remove(task);
    }

    private _remove<V>(task: Task<V>) {
        const lengthBefore = this._tasks.length;
        pull(this._tasks, task);
        if (this._tasks.length === lengthBefore) {
            throw new Error("Task not found in queue");
        }
        this._ee.emit(EVENTS.TASK_REMOVE, task as Task);
        this._ee.emit(EVENTS.QUEUE_SIZE, this.getQueueSize());
        this._ee.emit(EVENTS.QUEUE_ORDER, this.getTasks());
    }

    private _removeRunning<V>(task: Task<V>) {
        pull(this._runningTasks, task);
    }

    /**
     * Returns queue size.
     */
    public getQueueSize() {
        return this._tasks.length;
    }

    /**
     * Returns current tasks (ongoing and waiting).
     * @returns {Array<Task>}
     */
    public getTasks() {
        return [...this._tasks];
    }

    /**
     * Returns tasks by filtering function.
     * @param {QueueFilterFunction} fn - filtering function
     * @returns {Array<Task>}
     */
    public filter(fn: FilterFn) {
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
    public cancelBy(fn: FilterFn) {
        const tasks = this.filter(fn);
        tasks.forEach(task => { task.cancel(); });
        return tasks;
    }

    /**
     * Returns given task position in the queue (this includes running tasks)
     * @param {Task} task - task to look for
     * @returns {number} - task index or -1 if not found
     */
    public getTaskPosition<V>(task: Task<V>) {
        return this._tasks.findIndex(t => t === task);
    }

    /**
     * Returns given task waiting position, 0 means the task will be first to run next time a free slot is ready
     * @param {Task} task - task to look for
     * @returns {number} - task index or -1 if not found (ie: already done, already running)
     */
    public getTaskWaitingPosition<V>(task: Task<V>) {
        return this._tasks.filter(t => !t.isRunning()).findIndex(t => t === task);
    }

    /**
     * Is given task running?
     * @param {Task} task - task to check
     * @returns {boolean} - true if task is running, false otherwise
     */
    public isTaskRunning<V>(task: Task<V>) {
        return this._runningTasks.includes(task);
    }

    /**
     * Pauses the queue, all running tasks will continue, but new ones won't start. Unpause queue with `.unpause()`.
     * @see {@link Queue.unpause unpause()}
     */
    public pause() {
        this._paused = true;
    }

    /**
     * Unpauses the queue, tasks will be started to fill up concurrency limit.
     * @see {@link Queue.pause pause()}
     */
    public unpause() {
        this._paused = false;
        this._runNext();
    }
}

export {
    Queue,
};
