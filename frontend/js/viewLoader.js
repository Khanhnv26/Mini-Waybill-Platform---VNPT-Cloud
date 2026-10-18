// View modules retain their existing window registration and load only when rendered.
export function createViewLoader(name, loadModule, dependencies = []) {
    let pending;
    return () => {
        if (pending) return pending;
        pending = Promise.all(dependencies.map(load => load()))
            .then(() => loadModule())
            .then(() => {
                if (!window[name]) throw new Error(`View ${name} did not register`);
                return window[name];
            })
            .catch(error => { pending = undefined; throw error; });
        return pending;
    };
}
