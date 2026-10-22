function canRelease({ event, promote, validation, backend, frontend }) {
    const buildResults = [backend, frontend];
    const isAllowedEvent = event === 'push' || (event === 'workflow_dispatch' && promote === true);
    return isAllowedEvent && validation === 'success'
        && buildResults.every(result => result === 'success' || result === 'skipped')
        && buildResults.includes('success');
}
module.exports = { canRelease };
if (require.main === module && !canRelease({ event: process.env.EVENT_NAME, promote: process.env.PROMOTE === 'true',
    validation: process.env.VALIDATION_RESULT, backend: process.env.BACKEND_RESULT,
    frontend: process.env.FRONTEND_RESULT })) {
    console.error('Release blocked: validation or a selected image build did not succeed.');
    process.exitCode = 1;
}
