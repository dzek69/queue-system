/* eslint-disable */
// @TODO remove
import PromiseAlternative from "promise";
import {waitFor} from "@ezez/utils";

import type {Task, TaskFn} from "./index.js";
import {EVENTS, Queue} from "./index.js";

const noop = () => {};

enum ACTIONS {
    RESOLVE = "RESOLVE",
    REJECT = "REJECT",
    THROW = "THROW",
}

const TIME = {
    INSTANT: "INSTANT" as "INSTANT",
};

const createTestTask = (action: ACTIONS, value: string, time: number | "INSTANT") => {
    const fn = () => {
        if (action === ACTIONS.THROW) {
            const doAction = () => {
                throw new Error(value);
            };
            if (time === "INSTANT") {
                doAction();
            }
            else {
                setTimeout(doAction, time);
            }
            return undefined;
        }

        return new Promise((resolve, reject) => {
            const doAction = () => {
                if (action === ACTIONS.RESOLVE) {
                    resolve(value);
                }
                else {
                    reject(new Error(value));
                }
            };

            if (time === "INSTANT") {
                doAction();
            }
            else {
                setTimeout(doAction, time);
            }
        });
    };
    return fn;
};

const knownEvents = [
    "task-add",
    "task-remove",
    "task-start",
    "task-end",
    "task-success",
    "task-error",
    "task-thrown",
    "queue-size",
];

describe("Queue", () => {
    it("basic queuing works", async () => {
        const q = new Queue();

        const result: number[] = [];
        const task = async () => new Promise<void>((resolve) => {
            result.push(1);
            setTimeout(() => {
                result.push(2);
                resolve();
            }, 100);
        });

        const taskAnother = async () => new Promise<void>((resolve) => {
            result.push(3);
            setTimeout(() => {
                result.push(4);
                resolve();
            }, 100);
        });

        const yetAnother = async () => new Promise<void>((resolve) => {
            result.push(5);
            setTimeout(() => {
                result.push(6);
                resolve();
            }, 100);
        });

        const taskInstance1 = q.push(task);
        const taskInstance2 = q.push(taskAnother);
        const taskInstance3 = q.push(yetAnother);

        await Promise.all([
            taskInstance1.promise,
            taskInstance2.promise,
            taskInstance3.promise,
        ]);

        result.must.eql([
            1, 2, 3, 4, 5, 6,
        ]);

        q.destroy();
    });

    it("controlling order works", async () => {
        const q = new Queue();

        const result: number[] = [];
        const task = async () => new Promise<void>((resolve) => {
            result.push(1);
            setTimeout(() => {
                result.push(2);
                resolve();
            }, 100);
        });

        const taskAnother = async () => new Promise<void>((resolve) => {
            result.push(3);
            setTimeout(() => {
                result.push(4);
                resolve();
            }, 100);
        });

        const yetAnother = async () => new Promise<void>((resolve) => {
            result.push(5);
            setTimeout(() => {
                result.push(6);
                resolve();
            }, 100);
        });

        // comments shows how queue will look like, s = started, w = waiting
        const taskInstance1 = q.push(task); // s12
        const taskInstance2 = q.push(task); // s12, w12
        const taskInstance3 = q.prepend(taskAnother); // w34, s12, w12
        const taskInstance4 = q.insertAt(yetAnother, 1); // w34, w56, s12, w12

        await Promise.all([
            taskInstance1.promise,
            taskInstance2.promise,
            taskInstance3.promise,
            taskInstance4.promise,
        ]);

        result.must.eql([
            1, 2, 3, 4, 5, 6, 1, 2,
        ]);

        q.destroy();
    });

    it("concurrency works", async () => {
        const q = new Queue({
            concurrency: 2,
        });

        const result: string[] = [];
        const task = async () => new Promise<void>((resolve) => {
            result.push("a");
            setTimeout(() => {
                result.push("aa");
                resolve();
            }, 100);
        });

        const taskAnother = async () => new Promise<void>((resolve) => {
            result.push("b");
            setTimeout(() => {
                result.push("bb");
                resolve();
            }, 50);
        });

        const yetAnother = async () => new Promise<void>((resolve) => {
            result.push("c");
            setTimeout(() => {
                result.push("cc");
                resolve();
            }, 100);
        });

        const taskInstance1 = q.push(task);
        const taskInstance2 = q.push(taskAnother);
        const taskInstance3 = q.push(yetAnother);

        await Promise.all([
            taskInstance1.promise,
            taskInstance2.promise,
            taskInstance3.promise,
        ]);

        result.must.eql([
            "a", "b", "bb", "c", "aa", "cc",
        ]);

        q.destroy();
    });

    it("concurrency works with thenables/alternative Promise libraries", async () => {
        const q = new Queue({
            concurrency: 2,
        });

        const result: string[] = [];
        const task = () => new PromiseAlternative((resolve) => {
            result.push("a");
            setTimeout(() => {
                result.push("aa");
                resolve();
            }, 100);
        });

        const taskAnother = () => new PromiseAlternative((resolve) => {
            result.push("b");
            setTimeout(() => {
                result.push("bb");
                resolve();
            }, 50);
        });

        const yetAnother = () => new PromiseAlternative((resolve) => {
            result.push("c");
            setTimeout(() => {
                result.push("cc");
                resolve();
            }, 100);
        });

        const taskInstance1 = q.push(task);
        const taskInstance2 = q.push(taskAnother);
        const taskInstance3 = q.push(yetAnother);

        await Promise.all([
            taskInstance1.promise,
            taskInstance2.promise,
            taskInstance3.promise,
        ]);

        result.must.eql([
            "a", "b", "bb", "c", "aa", "cc",
        ]);

        q.destroy();
    });

    it("allows to remove task with method on task", async () => {
        const q = new Queue();

        const result = [];
        const task = async () => new Promise((resolve) => {
            result.push(1);
            setTimeout(() => {
                result.push(2);
                resolve();
            }, 100);
        });

        const taskAnother = async () => new Promise((resolve) => {
            result.push(3);
            setTimeout(() => {
                result.push(4);
                resolve();
            }, 100);
        });

        q.push(task);
        const taskInstance2 = q.push(taskAnother);

        taskInstance2.remove();

        await new Promise((resolve, reject) => {
            setTimeout(resolve, 600);
        });

        result.must.eql([
            1, 2,
        ]);

        q.destroy();
    });

    it("allows to remove task with method on queue", async () => {
        const q = new Queue();

        const result = [];
        const task = async () => new Promise((resolve) => {
            result.push(1);
            setTimeout(() => {
                result.push(2);
                resolve();
            }, 100);
        });

        const taskAnother = async () => new Promise((resolve) => {
            result.push(3);
            setTimeout(() => {
                result.push(4);
                resolve();
            }, 100);
        });

        q.push(task);
        const taskInstance2 = q.push(taskAnother);

        q.remove(taskInstance2);

        await new Promise((resolve, reject) => {
            setTimeout(resolve, 600);
        });

        result.must.eql([
            1, 2,
        ]);

        q.destroy();
    });

    it("allows to force-start task, ignoring concurrency limit", async () => {
        const q = new Queue();

        const result = [];
        const task = async () => new Promise((resolve) => {
            result.push(1);
            setTimeout(() => {
                result.push(2);
                resolve();
            }, 100);
        });

        const taskAnother = async () => new Promise((resolve) => {
            result.push(3);
            setTimeout(() => {
                result.push(4);
                resolve();
            }, 100);
        });

        const taskInstance1 = q.push(task);
        const taskInstance2 = q.push(taskAnother);
        const taskInstance3 = q.push(task);
        const taskInstance4 = q.push(task);

        taskInstance2.start();

        await Promise.all([
            taskInstance1.promise,
            taskInstance2.promise,
            taskInstance3.promise,
            taskInstance4.promise,
        ]);
        result.must.eql([
            1, 3, 2, 4, 1, 2, 1, 2,
        ]);

        q.destroy();
    });

    it("allows to update concurrency", async () => {
        const q = new Queue();

        const runningTasks = {
            max: 0,
            current: 0,
            reset() {
                this.max = 0;
            },
            start() {
                this.current++;
                if (this.max < this.current) {
                    this.max = this.current;
                }
            },
            stop() {
                this.current--;
            },
        };

        const task = async () => new Promise((resolve) => {
            runningTasks.start();
            setTimeout(() => {
                runningTasks.stop();
                resolve();
            }, 10);
        });

        const pushTasks = (count) => {
            const tasks = [];
            for (let i = 0; i < count; i++) {
                tasks.push(q.push(task).promise);
            }
            return tasks;
        };

        runningTasks.max.must.equal(0);

        q.setConcurrency(2);

        runningTasks.max.must.equal(0);

        const tasksPack1 = pushTasks(10);
        await Promise.all(tasksPack1);

        runningTasks.current.must.equal(0);
        runningTasks.max.must.equal(2);

        runningTasks.reset();
        q.setConcurrency(1);

        const tasksPack2 = pushTasks(10);
        await Promise.all(tasksPack2);

        runningTasks.current.must.equal(0);
        runningTasks.max.must.equal(1);

        runningTasks.reset();
        q.setConcurrency(5);

        const tasksPack3 = pushTasks(20);
        await Promise.all(tasksPack3);

        runningTasks.current.must.equal(0);
        runningTasks.max.must.equal(5);

        q.destroy();
    });

    it("works with rejecting tasks", async () => {
        const result = [];
        const q = new Queue();

        const delayedTask = async () => new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("delayed"));
            }, 100);
        });

        const instantTask = async () => new Promise((resolve, reject) => {
            reject(new Error("instant"));
        });

        const okTask = async () => new Promise((resolve) => {
            setTimeout(() => {
                resolve("ok");
            }, 100);
        });

        const taskInstance1 = q.push(delayedTask);
        const taskInstance2 = q.push(instantTask);
        const taskInstance3 = q.push(okTask);

        const handleSuccess = data => result.push(data);
        const handleError = error => result.push("E:" + error.message);

        await Promise.all([
            taskInstance1.promise.then(handleSuccess, handleError),
            taskInstance2.promise.then(handleSuccess, handleError),
            taskInstance3.promise.then(handleSuccess, handleError),
        ]);

        result.must.eql([
            "E:delayed", "E:instant", "ok",
        ]);

        q.destroy();
    });

    it("works with rejecting tasks (concurrency)", async () => {
        const result = [];
        const q = new Queue({
            concurrency: 2,
        });

        const delayedTask = async () => new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("delayed"));
            }, 100);
        });

        const instantTask = async () => new Promise((resolve, reject) => {
            reject(new Error("instant"));
        });

        const okTask = async () => new Promise((resolve) => {
            setTimeout(() => {
                resolve("ok");
            }, 100);
        });

        const taskInstance1 = q.push(delayedTask);
        const taskInstance2 = q.push(instantTask);
        const taskInstance3 = q.push(okTask);

        const handleSuccess = data => result.push(data);
        const handleError = error => result.push("E:" + error.message);

        await Promise.all([
            taskInstance1.promise.then(handleSuccess, handleError),
            taskInstance2.promise.then(handleSuccess, handleError),
            taskInstance3.promise.then(handleSuccess, handleError),
        ]);

        result.must.eql([
            "E:instant", "E:delayed", "ok",
        ]);

        q.destroy();
    });

    it("works with tasks throwing an error", async () => {
        const result = [];
        const q = new Queue();

        const throwingTask = () => {
            throw new Error("throw");
        };

        const okTask = async () => new Promise((resolve) => {
            setTimeout(() => {
                resolve("ok");
            }, 100);
        });

        const taskInstance1 = q.push(throwingTask);
        const taskInstance2 = q.push(okTask);

        const handleSuccess = data => result.push(data);
        const handleError = error => result.push("E:" + error.message);

        await Promise.all([
            taskInstance1.promise.then(handleSuccess, handleError),
            taskInstance2.promise.then(handleSuccess, handleError),
        ]);

        result.must.eql([
            "E:throw", "ok",
        ]);

        q.destroy();
    });

    it("emits right events", async () => {
        const q = new Queue({
            concurrency: 2,
        });

        const events: unknown[] = [];

        const handleEvent = (name, task: Task<unknown>, ...more: unknown[]) => {
            const secondArg = name.includes("task-") ? task.data?.id : task;

            events.push([
                name, secondArg, ...more
            ]);
        };

        knownEvents.forEach(eventName => {
            q.addEventListener(eventName, handleEvent.bind(null, eventName));
        });

        const taskInstance1 = q.push(createTestTask(
            ACTIONS.RESOLVE, "ok1", 100,
        ), { id: 1 });
        const taskInstance2 = q.push(createTestTask(
            ACTIONS.RESOLVE, "ok2", 100,
        ), { id: 2 });

        await Promise.all([
            taskInstance1.promise.catch(noop),
            taskInstance2.promise.catch(noop),
        ]);

        const taskInstance3 = q.push(createTestTask(
            ACTIONS.REJECT, "err3", 100,
        ), { id: 3 });
        const taskInstance4 = q.push(createTestTask(
            ACTIONS.REJECT, "err4", 100,
        ), { id: 4 });
        const taskInstance5 = q.push(createTestTask(
            ACTIONS.REJECT, "err5", TIME.INSTANT,
        ), { id: 5 });
        const taskInstance6 = q.push(createTestTask(
            ACTIONS.THROW, "thr6", TIME.INSTANT,
        ), { id: 6 });
        const taskInstance7 = q.prepend(createTestTask( // note prepend here
            ACTIONS.RESOLVE, "ok7", TIME.INSTANT,
        ), { id: 7 });
        const taskInstance8 = q.insertAt(createTestTask(
            ACTIONS.RESOLVE, "ok8", 100,
        ), 1, { id: 8 });

        await Promise.all([
            taskInstance3.promise.catch(noop),
            taskInstance4.promise.catch(noop),
            taskInstance5.promise.catch(noop),
            taskInstance6.promise.catch(noop),
            taskInstance7.promise.catch(noop),
            taskInstance8.promise.catch(noop),
        ]);

        events.must.eql([
            ["task-add", 1], // async task
            ["queue-size", 1],
            ["task-start", 1],

            ["task-add", 2], // async task
            ["queue-size", 2],
            ["task-start", 2],
            // awaiting here for two first before adding more

            ["task-end", 1, "ok1"],
            ["task-success", 1, "ok1"],
            ["task-remove", 1],
            ["queue-size", 1],

            ["task-end", 2, "ok2"],
            ["task-success", 2, "ok2"],
            ["task-remove", 2],
            ["queue-size", 0],

            ["task-add", 3], // async error task
            ["queue-size", 1],
            ["task-start", 3],

            ["task-add", 4], // async error task
            ["queue-size", 2],
            ["task-start", 4],

            ["task-add", 5], // instant error, queue full
            ["queue-size", 3],

            ["task-add", 6], // instant throw, queue full
            ["queue-size", 4],

            ["task-add", 7], // instant resolve, prepend, queue full
            ["queue-size", 5],

            ["task-add", 8], // instant resolve, insert at 1, queue full
            // current position: [7, 8, 3, 4, 5, 6]
            // expected end order: [3, 4, (already started), 7, 8, 5, 6]
            // expected start order: [7, 8, 5, 6]
            ["queue-size", 6],

            ["task-end", 3, new Error("err3")],
            ["task-error", 3, new Error("err3")],
            ["task-remove", 3],
            ["queue-size", 5],

            ["task-start", 7],
            ["task-end", 7, "ok7"], // after task 3 is over, task 7 (prepend) will start and end instantly (because it's sync)
            ["task-success", 7, "ok7"],
            ["task-remove", 7],
            ["queue-size", 4],

            ["task-start", 8], // async

            ["task-end", 4, new Error("err4")],
            ["task-error", 4, new Error("err4")],
            ["task-remove", 4],
            ["queue-size", 3],

            ["task-start", 5],
            ["task-end", 5, new Error("err5")],
            ["task-error", 5, new Error("err5")],
            ["task-remove", 5],
            ["queue-size", 2],

            ["task-start", 6],
            ["task-end", 6, new Error("thr6")],
            ["task-thrown", 6, new Error("thr6")],
            ["task-remove", 6],
            ["queue-size", 1],

            ["task-end", 8, "ok8"],
            ["task-success", 8, "ok8"],
            ["task-remove", 8],
            ["queue-size", 0],
        ]);

        q.destroy();
    });

    it("throws when adding unknown events", () => {
        const q = new Queue({
            concurrency: 2,
        });

        (() => q.addEventListener("aaa")).must.throw("Unknown event");
        (() => { q.removeEventListener("aaa"); }).must.throw("Unknown event");
        (() => { q.removeEventListener("task-end"); }).must.not.throw();

        q.destroy();
    });

    it("allow to destroy instance which removes listeners and clears not-finished tasks", async () => {
        const q = new Queue({
            concurrency: 2,
        });

        const events = [];

        const handleEvent = (name, task: Task) => {
            const secondArg = name.includes("task-") ? task.data?.id : task;

            events.push([
                name, secondArg,
            ]);
        };

        knownEvents.forEach(eventName => {
            q.addEventListener(eventName, handleEvent.bind(null, eventName));
        });

        const results = [];

        const handleTask = (result) => {
            if (result instanceof Error) {
                results.push("E:" + result.message);
                return;
            }
            results.push("OK:" + result);
        };

        const taskInstance1 = q.add(createTestTask(ACTIONS.RESOLVE, "ok1", 100), { id: 1 });
        const taskInstance2 = q.add(createTestTask(ACTIONS.REJECT, "err2", 100), { id: 2 });
        const taskInstance3 = q.prepend(createTestTask(ACTIONS.REJECT, "err3", 100), { id: 3 });
        const taskInstance4 = q.prepend(createTestTask(ACTIONS.RESOLVE, "ok4", 100), { id: 4 });

        taskInstance1.promise.then(handleTask, handleTask);
        taskInstance2.promise.then(handleTask, handleTask);
        taskInstance3.promise.then(handleTask, handleTask);
        taskInstance4.promise.then(handleTask, handleTask);

        const destroyResult = q.destroy();

        await new Promise(resolve => setTimeout(resolve, 500));

        results.must.eql([
            "OK:ok1",
            "E:err2",
        ]);

        events.must.eql([
            ["task-add", 1],
            ["queue-size", 1],
            ["task-start", 1],

            ["task-add", 2],
            ["queue-size", 2],
            ["task-start", 2],

            ["task-add", 3],
            ["queue-size", 3],

            ["task-add", 4],
            ["queue-size", 4],
        ]);

        destroyResult.must.eql({
            removed: [taskInstance4, taskInstance3], // 4, 3 because prepend was used
            inProgress: [taskInstance1, taskInstance2],
        });
    });

    it("doesn't allow to do anything beside queue size query on destroyed instance", () => {
        const q = new Queue({
            concurrency: 2,
        });

        q.destroy();

        (() => q.destroy()).must.throw("This queue is destroyed");
        (() => q.addEventListener()).must.throw("This queue is destroyed");
        (() => { q.removeEventListener(); }).must.throw("This queue is destroyed");
        (() => { q.setConcurrency(); }).must.throw("This queue is destroyed");
        (() => q.add()).must.throw("This queue is destroyed");
        (() => q.push()).must.throw("This queue is destroyed");
        (() => q.prepend()).must.throw("This queue is destroyed");
        (() => q.unshift()).must.throw("This queue is destroyed");
        (() => { q.remove(); }).must.throw("This queue is destroyed");

        q.getQueueSize().must.equal(0);
    });

    it("throws when trying to remove task/value that doesn't exist", async () => {
        const q = new Queue();

        const taskInstance = q.add(createTestTask(ACTIONS.RESOLVE, "ok", TIME.INSTANT));

        await taskInstance.promise;

        (() => { q.remove(taskInstance); }).must.throw("Task not found in queue");

        q.destroy();
    });

    it("allows to listen for event once", () => {
        const q = new Queue();

        let c;
        c = 0;

        q.addEventListenerOnce("task-add", () => {
            c++;
        });

        q.add(noop);
        q.add(noop);

        c.must.equal(1);

        q.destroy();
    });

    it("returns unsubscribe method on event register", () => {
        const q = new Queue();

        let c, d;
        c = 0;
        d = 0;

        const unsubscribe = q.addEventListener("task-add", () => {
            c++;
            unsubscribe();
        });

        const unsubcribeOnce = q.addEventListenerOnce("task-add", () => {
            d++;
        });
        unsubcribeOnce();

        q.add(noop);
        q.add(noop);

        c.must.equal(1);
        d.must.equal(0);

        q.destroy();
    });

    it("provides aliases for event listening", () => {
        const q = new Queue();

        q.on.must.equal(q.addEventListener);
        q.off.must.equal(q.removeEventListener);
        q.once.must.equal(q.addEventListenerOnce);

        q.destroy();
    });

    it("provides a way to cancel the task and racing for cancel", async () => {
        const q = new Queue();

        let caught;

        const task = async (isCancelled, cancelPromise) => {
            await Promise.race([
                new Promise(resolve => setTimeout(() => { resolve(666); }, 300)),
                cancelPromise,
            ]);
        };

        const myTask = q.add(task);
        myTask.promise.catch((error) => {
            caught = true;
            error.message.must.equal("Task cancelled");
        });

        setTimeout(myTask.cancel, 200);
        await new Promise(resolve => setTimeout(resolve, 200));

        caught.must.be.true();

        q.destroy();
    });

    it("provides a way to cancel the task and checking for cancel each step", async () => {
        const q = new Queue();

        let caught: boolean | undefined = undefined;

        const task: TaskFn<number> = async (isCancelled) => {
            await new Promise(resolve => setTimeout(resolve, 50));
            await isCancelled();
            await new Promise(resolve => setTimeout(resolve, 50));
            await isCancelled();
            await new Promise(resolve => setTimeout(resolve, 50));
            await isCancelled();
            await new Promise(resolve => setTimeout(resolve, 50));
            await isCancelled();
            await new Promise(resolve => setTimeout(resolve, 50));
            await isCancelled();
            await new Promise(resolve => setTimeout(resolve, 50));
            await isCancelled();
            return 666; // end task with success;
        };

        const myTask = q.add(task);
        myTask.promise.then(() => {
            caught = false;
        }).catch((error) => {
            caught = true;
            error.message.must.equal("Task cancelled");
        });

        setTimeout(myTask.cancel, 200);
        await new Promise(resolve => setTimeout(resolve, 300)); // 300, because check happens every ~50ms and it's
        // not instant like in previous example, we need to give time for task to become aware that cancelling happened
        // some extra

        await waitFor(() => typeof caught === "boolean", 5);

        caught.must.be.true();

        q.destroy();
    });

    it("disallows starting a task twice", async () => {
        const q = new Queue();

        const task = async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        const myTask = q.add(task);
        (() => myTask.start(true)).must.throw("Task already started.");

        await myTask.promise;

        q.destroy();
    });

    it("disallows starting a task from a destroyed queue", async () => {
        const q = new Queue();

        const results = [];

        const task = async (isCancelled) => {
            await isCancelled();
            results.push(1);
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        q.add(task);
        const myTask2 = q.add(task);

        q.destroy();

        await new Promise(resolve => setTimeout(resolve, 150));

        // task 2 didn't had a chance to start

        (() => myTask2.start()).must.throw("Task belongs to destroyed queue.");

        results.must.have.length(1);
    });

    it("has method to get list of tasks that is safe to modify", async () => {
        const q = new Queue();

        const results = [];

        const task = async (isCancelled) => {
            await isCancelled();
            results.push(1);
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        const task1 = q.add(task);
        const task2 = q.add(task);

        const tasks = q.getTasks();
        tasks.must.eql([
            task1,
            task2,
        ]);

        tasks.length = 1;
        tasks.must.eql([
            task1,
        ]);

        await new Promise(resolve => setTimeout(resolve, 150));

        // if returned array was internal array of queue this would stop task2 from running
        results.must.have.length(2);

        q.destroy();
    });

    it("removes cancelled tasks from queue, so their method is never called", () => {
        const q = new Queue();

        const results = [];

        const task = async () => {
            // without explicit check for cancelling this would (and was previously) be executed anyway
            results.push(1);
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        const task1 = q.add(task);
        const task2 = q.add(task);

        task1.cancel();
        task2.cancel();

        const tasks = q.getTasks();
        tasks.must.eql([
            task1,
        ]);

        q.destroy();
    });

    it("allows to add custom data to tasks", () => {
        const q = new Queue();

        const task = async () => {};

        const task1 = q.add(task, { x: 5 });
        task1.data.must.eql({ x: 5 });

        const task2 = q.add(task);
        task2.must.not.have.property("data");
        (task2.data === undefined).must.be.true();

        q.destroy();
    });

    it("allows to filter tasks", async () => {
        const q = new Queue();

        const task = async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        const task1 = q.add(task, { x: 5 });
        const task2 = q.add(task);
        const task3 = q.add(task);

        const calls = [];

        const filteringFn = (...args) => {
            calls.push(args);
            return args[1] === true;
        };

        task3.cancel();

        const list = q.filter(filteringFn);
        list.must.eql([
            task1,
        ]);

        calls.must.eql([
            [{ x: 5 }, true, false],
            [undefined, false, false],
        ]);

        await task2.promise;

        calls.length = 0;

        const nextList = q.filter(filteringFn);
        nextList.must.eql([]);

        calls.must.eql([]);

        q.destroy();
    });

    it("allows to cancel tasks by predicate", () => {
        const q = new Queue();

        const task = async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        const task1 = q.add(task, { cancelMe: true });
        const task2 = q.add(task, { cancelMe: false });
        const task3 = q.add(task);
        const task4 = q.add(task, { cancelMe: true });
        const task5 = q.add(task, { cancelMe: false });
        const task6 = q.add(task);

        const filteringFn = (data = {}) => {
            return Boolean(data.cancelMe);
        };

        const cancelledList = q.cancelBy(filteringFn);

        cancelledList.must.eql([
            task1,
            task4,
        ]);

        const inQueue = q.getTasks();

        inQueue.must.eql([
            task1, // 1 is in progress so it must stay here until done
            task2,
            task3,
            task5,
            task6,
        ]);

        q.destroy();
    });

    it("allows to get task position in the queue", async () => {
        const q = new Queue();

        const task = async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        q.add(task);
        const task2 = q.add(task);
        q.add(task);
        const task4 = q.add(task);
        q.add(task);

        q.getTaskPosition(task4).must.equal(3); // position starts on 0
        task4.getPosition().must.equal(3);

        await task2.promise;

        q.getTaskPosition(task4).must.equal(1);
        task4.getPosition().must.equal(1);

        q.destroy();
    });

    it("allows to get task position in waiting queue", () => {
        const q = new Queue();
        const task = async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        q.add(task);
        q.add(task);
        const task3 = q.add(task);

        task3.getWaitingPosition().must.equal(1);
        q.getTaskWaitingPosition(task3).must.equal(1);

        q.setConcurrency(2);

        task3.getWaitingPosition().must.equal(0);
        q.getTaskWaitingPosition(task3).must.equal(0);

        q.prepend(() => {});

        task3.getWaitingPosition().must.equal(1);
        q.getTaskWaitingPosition(task3).must.equal(1);
    });

    it("allows you to check if task is running", async () => {
        const q = new Queue();

        const task = async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        const task1 = q.add(task);
        const task2 = q.add(task);

        q.isTaskRunning(task1).must.be.true();
        task1.isRunning().must.be.true();

        q.isTaskRunning(task2).must.be.false();
        task2.isRunning().must.be.false();

        await task1.promise;

        q.isTaskRunning(task2).must.be.true();
        task2.isRunning().must.be.true();

        q.isTaskRunning(task1).must.be.false();
        task1.isRunning().must.be.false();

        q.destroy();
    });

    it("emits queue order when somethings change", async () => {
        const q = new Queue();

        const calls = [];

        const handleOrder = (...args) => {
            calls.push(args);
        };
        q.on(EVENTS.QUEUE_ORDER, handleOrder);

        const task = async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        const task1 = q.add(task);
        calls.must.have.length(1);
        calls[0].must.eql(
            [[task1]],
        );

        const task2 = q.add(task);
        calls.must.have.length(2);
        calls[1].must.eql(
            [[task1, task2]],
        );

        const task3 = q.prepend(task);
        calls.must.have.length(3);
        calls[2].must.eql(
            [[task3, task1, task2]],
        );

        const task4 = q.insertAt(task, 2);
        calls.must.have.length(4);
        calls[3].must.eql(
            [[task3, task1, task4, task2]],
        );

        task4.remove();
        calls.must.have.length(5);
        calls[4].must.eql(
            [[task3, task1, task2]],
        );

        await task1.promise;
        calls.must.have.length(6);
        calls[5].must.eql(
            [[task3, task2]],
        );

        q.destroy();
    });

    it("disallows to force-start cancelled task", async () => {
        const q = new Queue();

        let runs = 0;
        const task = async () => {
            runs++;
            await new Promise(resolve => setTimeout(resolve, 200));
        };

        const task1 = q.add(task);
        const task2 = q.add(task);

        task2.cancel();

        q.getTasks().length.must.equal(1);

        await task1.promise;

        q.getTasks().length.must.equal(0);
        runs.must.equal(1);

        (() => task2.run(true)).must.throw("Task was cancelled.");
        runs.must.equal(1);

        q.destroy();
    });

    it("allows to catch errors on synchronous task that's added into having-free-slots queue to prevents `Unhandled "
        + "Rejection`", async () => {
        const q = new Queue();

        const taskFn = () => {
            throw new Error("It failed.");
        };

        const task = q.add(taskFn);

        const errorMock = (...args) => {
            errorMock.calls.push(args);
        };
        errorMock.calls = [];
        const originalError = console.error;
        console.error = errorMock;

        task.promise.catch(() => null); // catch rejection

        await new Promise(r => setTimeout(r, 100));
        errorMock.calls.must.have.length(0);

        q.destroy();
        console.error = originalError;
    });

    it("allows to pause and unpause the queue", async () => {
        const q = new Queue({ paused: true });

        for (let i = 0; i < 10; i++) {
            const task = createTestTask(ACTIONS.RESOLVE, "", "INSTANT");
            q.add(task);
        }

        q.getQueueSize().must.equal(10);

        await new Promise(r => setTimeout(r, 100));

        q.getQueueSize().must.equal(10);

        q.unpause();

        await new Promise(r => setTimeout(r, 1));

        q.getQueueSize().must.equal(0);
    });

    // test for refactor safety
    it("should not start additional task each time concurrency is changed", async () => {
        const events: string = [];

        const task1 = async () => {
            events.push("1s");
            await new Promise(r => setTimeout(r, 100));
            events.push("1e");
        };
        const task2 = async () => {
            events.push("2s");
            await new Promise(r => setTimeout(r, 50));
            events.push("2e");
        };

        const q = new Queue();
        q.add(task1);
        q.add(task2);
        q.setConcurrency(1);
        await new Promise(r => setTimeout(r, 200));

        events.must.eql(["1s", "1e", "2s", "2e"]);
    });
});
