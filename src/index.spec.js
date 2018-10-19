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
            1, 3, 2, 4, 5, 6,
        ]);
    });
});
