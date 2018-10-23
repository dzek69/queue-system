import Queue from "./index";

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
    });

    it("controling order works", async () => {
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
    });

    it("emits right events", async () => {
        const q = new Queue({
            concurrency: 2,
        });

        const events = [];

        const onTaskAdd = (id) => {
            events.push("add" + id);
        };
        const onTaskRemove = (id) => {
            events.push("remove" + id);
        };
        const onTaskStart = (id) => {
            events.push("start" + id);
        };
        const onTaskEnd = (id) => {
            events.push("end" + id);
        };
        const onQueueSize = (size) => {
            events.push("size" + size);
        };

        q.addEventListener("task-add", onTaskAdd);
        q.addEventListener("task-remove", onTaskRemove);
        q.addEventListener("task-start", onTaskStart);
        q.addEventListener("task-end", onTaskEnd);
        q.addEventListener("queue-size", onQueueSize);

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

        events.must.eql([
            "add11",
            "size1",
            "start11",
            "add12",
            "size2",
            "start12",
            "add13",
            "size3",
            "end12",
            "remove12",
            "size2",
            "start13",
            "end11",
            "remove11",
            "size1",
            "end13",
            "remove13",
            "size0",
        ]);
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
    });

    it("allows to update concurrency", async () => {
        const q = new Queue();

        const result = [];
        const task = () => new Promise((resolve) => {
            result.push("1s");
            setTimeout(() => {
                result.push("1e");
                resolve();
            }, 100);
        });

        const taskAnother = () => new Promise((resolve) => {
            result.push("2s");
            setTimeout(() => {
                result.push("2e");
                resolve();
            }, 75);
        });

        const yetAnother = () => new Promise((resolve) => {
            result.push("3s");
            setTimeout(() => {
                result.push("3e");
                resolve();
            }, 50);
        });

        const taskInstance1 = q.push(task);
        const taskInstance2 = q.push(taskAnother);
        const taskInstance3 = q.push(yetAnother);
        const taskInstance4 = q.push(task);
        const taskInstance5 = q.push(taskAnother);
        const taskInstance6 = q.push(yetAnother);

        q.setConcurrency(2);

        await Promise.all([
            taskInstance1.promise,
            taskInstance2.promise,
        ]);

        q.setConcurrency(3);

        await Promise.all([
            taskInstance1.promise,
            taskInstance2.promise,
            taskInstance3.promise,
            taskInstance4.promise,
            taskInstance5.promise,
            taskInstance6.promise,
        ]);

        result.must.eql([
            // concurrency set to 2, until first and second task ends, then it switches to 3
            "1s", // 1
            "2s", // 2
            "2e", // 1
            "3s", // 2
            "1e", // 1, now switching concurrency to 3
            "1s", // 2
            "2s", // 3
            "3e", // 2
            "3s", // 3
            "2e", // 2
            "3e", // 1
            "1e", // 0
        ]);
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
    });
});
