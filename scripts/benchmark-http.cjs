// Read-only HTTP probe. Supply a staging URL explicitly; never logs credentials or bodies.
const { performance } = require('node:perf_hooks');

async function benchmark({ baseUrl, paths = ['/'], requests = 50, concurrency = 5,
    timeoutMs = 10000, token, p95LimitMs = Infinity, maxErrorRate = 0.01 }) {
    const base = new URL(baseUrl);
    if (!Number.isFinite(maxErrorRate) || maxErrorRate < 0 || maxErrorRate > 1) {
        throw new Error('max-error-rate must be between 0 and 1');
    }
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
        throw new Error('Use an HTTP(S) URL without embedded credentials');
    }
    const samples = [], started = performance.now();
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, async () => {
        while (next < requests) {
            const index = next++, path = paths[index % paths.length];
            const url = new URL(path, base);
            if (url.origin !== base.origin) throw new Error('All paths must stay on the supplied origin');
            const start = performance.now();
            let status = 0, bytes = 0;
            try {
                const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {},
                    redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
                status = response.status;
                bytes = (await response.arrayBuffer()).byteLength;
            } catch { /* Failed connections and timeouts count as errors. */ }
            samples.push({ ms: performance.now() - start, status, bytes });
        }
    }));
    const latencies = samples.map(sample => sample.ms).sort((a, b) => a - b);
    const errors = samples.filter(sample => sample.status < 200 || sample.status >= 400).length;
    const percentile = p => Math.round(latencies[Math.ceil(p * latencies.length) - 1] * 100) / 100;
    const result = { origin: base.origin, requests, concurrency, elapsedMs: Math.round(performance.now() - started),
        p50Ms: percentile(0.5), p95Ms: percentile(0.95), errors, errorRate: errors / requests,
        decodedBodyBytes: samples.reduce((sum, sample) => sum + sample.bytes, 0) };
    result.pass = result.p95Ms <= p95LimitMs && result.errorRate <= maxErrorRate;
    return result;
}

module.exports = { benchmark };
if (require.main === module) {
    const args = Object.fromEntries(process.argv.slice(2).map(arg => {
        const separator = arg.indexOf('=');
        if (!arg.startsWith('--') || separator < 0) throw new Error('Use --name=value arguments');
        return [arg.slice(2, separator), arg.slice(separator + 1)];
    }));
    const positive = (key, fallback) => {
        const value = Number(args[key] ?? fallback);
        if (!Number.isInteger(value) || value < 1) throw new Error(`${key} must be a positive integer`);
        return value;
    };
    if (!args['base-url']) throw new Error('--base-url=<staging origin> is required');
    benchmark({ baseUrl: args['base-url'], paths: (args.paths || '/').split(','),
        requests: positive('requests', 50), concurrency: positive('concurrency', 5),
        timeoutMs: positive('timeout-ms', 10000), token: process.env.WAYBILL_BENCHMARK_TOKEN,
        p95LimitMs: args['p95-ms'] ? positive('p95-ms') : Infinity,
        maxErrorRate: Number(args['max-error-rate'] ?? 0.01) })
        .then(result => { console.log(JSON.stringify(result, null, 2)); process.exitCode = result.pass ? 0 : 1; })
        .catch(error => { console.error(error.message); process.exitCode = 1; });
}
