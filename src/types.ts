import type { Task } from "./Task";

interface TaskFn {
    (isCancelled: () => Promise<void>, cancelPromise: Promise<never>): Promise<unknown>;
    id?: number;
}

type VerifyFn = () => boolean;

type FilterFn = (data: Record<string, unknown> | undefined, isRunning: boolean, isCancelled: boolean) => boolean;

type IsDestroyed = () => boolean;

/**
 * @typedef {Object} QueueOptions
 * @property {number} concurrency - how many tasks should be executed at once
 */
interface QueueOptions {
    concurrency?: number;
}

/**
 * @typedef {Object} QueueDestroyInfo
 * @property {Array<Task>} removed - list of removed tasks, that hadn't had a chance to start
 * @property {Array<Task>} inProgress - list of ongoing tasks
 */
interface QueueDestroyInfo {
    removed: Task[];
    inProgress: Task[];
}

/**
 * @typedef {function} QueueFilterFunction
 * @param {*} data - task related data
 * @param {boolean} isRunning - is the task running
 * @param {boolean} isCancelled - is the task cancelled
 * @returns {boolean}
 */

type QueueFilterFunction = (data: unknown, isRunning: boolean, isCancelled: boolean) => boolean;

export type { TaskFn, VerifyFn, FilterFn, IsDestroyed, QueueOptions, QueueDestroyInfo, QueueFilterFunction };
