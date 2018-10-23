import Queue from "./index";

const noop = () => {}; // eslint-disable-line no-empty-function

const ACTIONS = {
    RESOLVE: {},
    REJECT: {},
    THROW: {},
};

const TIME = {
    INSTANT: {},
};

const createTestTask = (action, value, time, id) => {
    const fn = () => {
        if (action === ACTIONS.THROW) {
            const doAction = () => {
                throw new Error(value);
            };
            if (time === TIME.INSTANT) {
                doAction();
            }
            else {
                setTimeout(doAction, time);
            }
        }
        else if (action !== ACTIONS.REJECT && action !== ACTIONS.RESOLVE) {
            throw new Error("wrong action");
        }
        else {
            return new Promise((resolve, reject) => {
                const doAction = () => {
                    if (action === ACTIONS.RESOLVE) {
                        resolve(value);
                    }
                    else {
                        reject(new Error(value));
                    }
                };

                if (time === TIME.INSTANT) {
                    doAction();
                }
                else {
                    setTimeout(doAction, time);
                }
            });
        }
    };
    if (id !== undefined) {
        fn.id = id;
    }
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

        const result = [];
        const task = () => new Promise((resolve) => {
            result.push(1);
            setTimeout(() => {
                result.push(2);
                resolve();
            }, 100);
        });

        const taskAnother = () => new Promise((resolve) => {
            result.push(3);
            setTimeout(() => {
                result.push(4);
                resolve();
            }, 100);
        });

        const yetAnother = () => new Promise((resolve) => {
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

        const result = [];
        const task = () => new Promise((resolve) => {
            result.push(1);
            setTimeout(() => {
                result.push(2);
                resolve();
            }, 100);
        });

        const taskAnother = () => new Promise((resolve) => {
            result.push(3);
            setTimeout(() => {
                result.push(4);
                resolve();
            }, 100);
        });

        const yetAnother = () => new Promise((resolve) => {
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

        const result = [];
        const task = () => new Promise((resolve) => {
            result.push("a");
            setTimeout(() => {
                result.push("aa");
                resolve();
            }, 100);
        });

        const taskAnother = () => new Promise((resolve) => {
            result.push("b");
            setTimeout(() => {
                result.push("bb");
                resolve();
            }, 50);
        });

        const yetAnother = () => new Promise((resolve) => {
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
        const task = () => new Promise((resolve) => {
            result.push(1);
            setTimeout(() => {
                result.push(2);
                resolve();
            }, 100);
        });

        const taskAnother = () => new Promise((resolve) => {
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
        const task = () => new Promise((resolve) => {
            result.push(1);
            setTimeout(() => {
                result.push(2);
                resolve();
            }, 100);
        });

        const taskAnother = () => new Promise((resolve) => {
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
        const task = () => new Promise((resolve) => {
            result.push(1);
            setTimeout(() => {
                result.push(2);
                resolve();
            }, 100);
        });

        const taskAnother = () => new Promise((resolve) => {
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

        taskInstance2.start(true);

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

        const runningTasks = { // eslint-disable-line object-shorthand
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

        const task = () => new Promise((resolve) => {
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

        const delayedTask = () => new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("delayed"));
            }, 100);
        });

        const instantTask = () => new Promise((resolve, reject) => {
            reject(new Error("instant"));
        });

        const okTask = () => new Promise((resolve) => {
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

        const delayedTask = () => new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("delayed"));
            }, 100);
        });

        const instantTask = () => new Promise((resolve, reject) => {
            reject(new Error("instant"));
        });

        const okTask = () => new Promise((resolve) => {
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

        const okTask = () => new Promise((resolve) => {
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

    it("allows to set own task id before starting the task", async () => {
        const q = new Queue();

        const events = [];

        const handleEvent = (name, data) => {
            const secondArg = name.includes("task-") ? data.id : data;

            events.push([
                name, secondArg,
            ]);
        };

        q.addEventListener("task-add", handleEvent.bind(null, "task-add"));

        const testTask = createTestTask(
            ACTIONS.RESOLVE, "ok1", 100,
        );
        testTask.id = 1;

        const taskInstance1 = q.add(testTask);

        await Promise.all([
            taskInstance1.promise.catch(noop),
        ]);

        events.must.eql([
            ["task-add", 1],
        ]);

        q.destroy();
    });

    it("emits right events", async () => {
        const q = new Queue({
            concurrency: 2,
        });

        const events = [];

        const handleEvent = (name, data) => {
            const secondArg = name.includes("task-") ? data.id : data;

            events.push([
                name, secondArg,
            ]);
        };

        knownEvents.forEach(eventName => {
            q.addEventListener(eventName, handleEvent.bind(null, eventName));
        });

        const taskInstance1 = q.push(createTestTask(
            ACTIONS.RESOLVE, "ok1", 100, 1,
        ));
        const taskInstance2 = q.push(createTestTask(
            ACTIONS.RESOLVE, "ok2", 100, 2,
        ));

        await Promise.all([
            taskInstance1.promise.catch(noop),
            taskInstance2.promise.catch(noop),
        ]);

        const taskInstance3 = q.push(createTestTask(
            ACTIONS.REJECT, "err3", 100, 3,
        ));
        const taskInstance4 = q.push(createTestTask(
            ACTIONS.REJECT, "err4", 100, 4,
        ));
        const taskInstance5 = q.push(createTestTask(
            ACTIONS.REJECT, "err5", TIME.INSTANT, 5,
        ));
        const taskInstance6 = q.push(createTestTask(
            ACTIONS.THROW, "thr6", TIME.INSTANT, 6,
        ));
        const taskInstance7 = q.prepend(createTestTask( // note prepend here
            ACTIONS.RESOLVE, "ok7", TIME.INSTANT, 7,
        ));
        const taskInstance8 = q.insertAt(createTestTask(
            ACTIONS.RESOLVE, "ok8", 100, 8,
        ), 1);

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

            ["task-end", 1],
            ["task-success", 1],
            ["task-remove", 1],
            ["queue-size", 1],

            ["task-end", 2],
            ["task-success", 2],
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

            ["task-end", 3],
            ["task-error", 3],
            ["task-remove", 3],
            ["queue-size", 5],

            ["task-start", 7],

            ["task-end", 4],
            ["task-error", 4],
            ["task-remove", 4],
            ["queue-size", 4],

            ["task-start", 8], // async

            ["task-end", 7],
            ["task-success", 7],
            ["task-remove", 7],
            ["queue-size", 3],

            ["task-start", 5],
            ["task-end", 5],
            ["task-error", 5],
            ["task-remove", 5],
            ["queue-size", 2],

            ["task-start", 6],
            ["task-end", 6],
            ["task-thrown", 6],
            ["task-remove", 6],
            ["queue-size", 1],

            ["task-end", 8],
            ["task-success", 8],
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
        (() => q.removeEventListener("aaa")).must.throw("Unknown event");
        (() => q.removeEventListener("task-end")).must.not.throw();

        q.destroy();
    });

    it("allow to destroy instance which removes listeners and clears not-finished tasks", async () => {
        const q = new Queue({
            concurrency: 2,
        });

        const events = [];

        const handleEvent = (name, data) => {
            const secondArg = name.includes("task-") ? data.id : data;

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

        const taskInstance1 = q.add(createTestTask(ACTIONS.RESOLVE, "ok1", 100, 1));
        const taskInstance2 = q.add(createTestTask(ACTIONS.REJECT, "err2", 100, 2));
        const taskInstance3 = q.prepend(createTestTask(ACTIONS.REJECT, "err3", 100, 3));
        const taskInstance4 = q.prepend(createTestTask(ACTIONS.RESOLVE, "ok4", 100, 4));

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

        (() => q.destroy()).must.throw("This instance is destroyed");
        (() => q.addEventListener()).must.throw("This instance is destroyed");
        (() => q.removeEventListener()).must.throw("This instance is destroyed");
        (() => q.setConcurrency()).must.throw("This instance is destroyed");
        (() => q.add()).must.throw("This instance is destroyed");
        (() => q.push()).must.throw("This instance is destroyed");
        (() => q.prepend()).must.throw("This instance is destroyed");
        (() => q.unshift()).must.throw("This instance is destroyed");
        (() => q.remove()).must.throw("This instance is destroyed");

        q.getQueueSize().must.equal(0);
    });

    it("throws when trying to remove task/value that doesn't exist", async () => {
        const q = new Queue();

        const taskInstance = q.add(createTestTask(ACTIONS.RESOLVE, "ok", TIME.INSTANT));

        await taskInstance.promise;

        (() => q.remove(taskInstance)).must.throw("Task not found in queue");

        q.destroy();
    });
});
