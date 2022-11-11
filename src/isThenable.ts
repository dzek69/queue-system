const isThenable = (val: unknown): val is Promise<unknown> => {
    if (!val) {
        return false;
    }
    return typeof (val as { then: unknown }).then === "function";
};

export {
    isThenable,
};
