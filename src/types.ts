import type { Task } from "./Task";

interface TaskFn<T> {
    (isCancelled: () => Promise<void>, cancelPromise: Promise<never>): T | Promise<T>;
}

interface PromisedTaskFn<T> {
    (isCancelled: () => Promise<void>, cancelPromise: Promise<never>): Promise<T>;
}

type FilterFn = (data: { [key: string]: unknown } | undefined, isRunning: boolean, isCancelled: boolean) => boolean;

type IsDestroyed = () => boolean;

/**
 * @typedef {Object} QueueOptions
 * @property {number} concurrency - how many tasks should be executed at once
 */
interface QueueOptions {
    concurrency?: number;
    paused?: boolean;
}

/**
 * @typedef {Object} QueueDestroyInfo
 * @property {Array<Task>} removed - list of removed tasks, that hadn't had a chance to start
 * @property {Array<Task>} inProgress - list of ongoing tasks
 */
interface QueueDestroyInfo {
    removed: Task<unknown>[];
    inProgress: Task<unknown>[];
}

/**
 * @typedef {function} QueueFilterFunction
 * @param {*} data - task related data
 * @param {boolean} isRunning - is the task running
 * @param {boolean} isCancelled - is the task cancelled
 * @returns {boolean}
 */

type QueueFilterFunction = (data: unknown, isRunning: boolean, isCancelled: boolean) => boolean;

export type {
    TaskFn, PromisedTaskFn,
    FilterFn,
    IsDestroyed,
    QueueOptions, QueueDestroyInfo, QueueFilterFunction,
};
