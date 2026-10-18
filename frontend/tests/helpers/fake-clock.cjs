function fakeClock() {
    let now = 100000, nextId = 0;
    const timers = new Map();
    const schedule = (fn, delay, interval = false) => {
        const id = ++nextId;
        timers.set(id, { fn, at: now + delay, delay, interval });
        return id;
    };
    class ClockDate extends Date { static now() { return now; } }
    return {
        Date: ClockDate,
        setTimeout: (fn, delay = 0) => schedule(fn, delay),
        clearTimeout: id => timers.delete(id),
        setInterval: (fn, delay) => schedule(fn, delay, true),
        clearInterval: id => timers.delete(id),
        get pending() { return timers.size; },
        async advance(ms) {
            const end = now + ms;
            while (true) {
                const next = [...timers.entries()].filter(([, timer]) => timer.at <= end)
                    .sort((a, b) => a[1].at - b[1].at)[0];
                if (!next) break;
                const [id, timer] = next;
                now = timer.at;
                if (timer.interval) timer.at += timer.delay; else timers.delete(id);
                timer.fn();
                for (let i = 0; i < 20; i++) await Promise.resolve();
            }
            now = end;
        }
    };
}
module.exports = { fakeClock };
