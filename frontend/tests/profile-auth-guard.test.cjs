const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('route resolution and auth requirements for profile and protected routes', () => {
    const appSource = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');

    // Extract ROUTE_TAB_MAP, TAB_ROUTE_MAP, ALL_NAVIGATION_TABS, isTabAuthRequired, resolveRoute
    // by evaluating in a minimal sandbox context
    const sandbox = {
        Vue: {
            createApp: () => ({ component: () => {}, mount: () => {} }),
            ref: (v) => ({ value: v }),
            reactive: (v) => v,
            computed: (fn) => ({ get value() { return fn(); } }),
            onMounted: () => {},
            onUnmounted: () => {}
        },
        window: {
            location: { pathname: '/profile', search: '', hash: '' },
            addEventListener: () => {},
            removeEventListener: () => {}
        },
        document: {
            documentElement: { classList: { contains: () => false, add: () => {}, remove: () => {} } }
        },
        localStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
            clear: () => {}
        },
        sessionStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        },
        Auth: {
            isAuthenticated: () => false,
            getUser: () => null,
            getToken: () => null
        }
    };

    // We can extract ALL_NAVIGATION_TABS and isTabAuthRequired using regex or running in VM
    // Check ALL_NAVIGATION_TABS contains profile with requiresAuth: true
    assert.match(appSource, /id:\s*'profile'[\s\S]*?requiresAuth:\s*true/);
    assert.match(appSource, /id:\s*'reports'[\s\S]*?requiresAuth:\s*true/);
    assert.match(appSource, /id:\s*'payments'[\s\S]*?requiresAuth:\s*true/);

    // Check isTabAuthRequired exists and checks requiresAuth
    assert.match(appSource, /const\s+isTabAuthRequired\s*=\s*\(tab\)\s*=>/);
    assert.match(appSource, /tab\.requiresAuth/);

    // Check resolveRoute maps '/profile' to tab 'profile'
    assert.match(appSource, /'\/profile':\s*'profile'/);
});

test('profile access when unauthenticated redirects to login', () => {
    const profileViewSource = fs.readFileSync(require.resolve('../js/views/ProfileView.js'), 'utf8');

    // Verify ProfileView redirects to /login when unauthenticated
    assert.match(profileViewSource, /!window\.Auth\s*\|\|\s*!window\.Auth\.isAuthenticated\(\)/);
    assert.match(profileViewSource, /sessionStorage\.setItem\('redirectAfterLogin',\s*'\/profile'\)/);
    assert.match(profileViewSource, /window\.navigateTo\('\/login'\)/);
});

test('app.js guards initial load of /profile before rendering', () => {
    const appSource = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');

    // Verify initial route check redirects unauthenticated user to /login
    assert.match(appSource, /const\s+initialTabObj\s*=\s*ALL_NAVIGATION_TABS\.find/);
    assert.match(appSource, /const\s+isInitialAuthRequired\s*=\s*isTabAuthRequired\(initialTabObj\)/);
    assert.match(appSource, /const\s+shouldRedirectToLogin\s*=\s*!isAuthUser\(\)\s*&&\s*isInitialAuthRequired/);
    assert.match(appSource, /sessionStorage\.setItem\('redirectAfterLogin'/);
    assert.match(appSource, /currentTab\s*=\s*ref\(hasInitialError\s*\?\s*'error'\s*:\s*\(shouldRedirectToLogin\s*\?\s*'login'\s*:\s*initialRoute\.tab\)\)/);
});

test('navigateTo /profile enforces auth and remembers redirect destination', () => {
    const appSource = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');

    // Verify navigateTo checks isTabAuthRequired
    assert.match(appSource, /const\s+isAuthRequired\s*=\s*isTabAuthRequired\(targetTab\)/);
    assert.match(appSource, /if\s*\(!authenticated\s*&&\s*isAuthRequired\)/);
    assert.match(appSource, /sessionStorage\.setItem\('redirectAfterLogin',\s*urlObj\.pathname\s*\+\s*urlObj\.search\)/);
    assert.match(appSource, /navigateTo\('\/login'\)/);
});

test('handlePopState also guards protected routes against unauthenticated browser navigation', () => {
    const appSource = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');

    // Verify handlePopState checks isTabAuthRequired
    assert.match(appSource, /const\s+handlePopState\s*=\s*\(\)\s*=>\s*\{[\s\S]*?const\s+isAuthRequired\s*=\s*isTabAuthRequired\(targetTab\)[\s\S]*?if\s*\(!authenticated\s*&&\s*isAuthRequired\)[\s\S]*?navigateTo\('\/login',\s*true\)/);
});

test('unknown non-waybill paths route to 404 error instead of tracking', () => {
    const appSource = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');
    
    const routeMapMatch = appSource.match(/const ROUTE_TAB_MAP = \{[\s\S]*?\};/);
    const resolveRouteMatch = appSource.match(/const resolveRoute = \([\s\S]*?\n    \};/);
    
    assert.ok(routeMapMatch, 'ROUTE_TAB_MAP found');
    assert.ok(resolveRouteMatch, 'resolveRoute found');

    const fn = new Function(`${routeMapMatch[0]}\n${resolveRouteMatch[0]}\nreturn resolveRoute;`)();
    
    // Unknown routes should route to 404 ErrorView
    const randomRoute = fn('/link-linh-tinh');
    assert.strictEqual(randomRoute.tab, 'error');
    assert.strictEqual(randomRoute.notFound, true);

    const randomSubroute = fn('/some/deep/fake/route');
    assert.strictEqual(randomSubroute.tab, 'error');
    assert.strictEqual(randomSubroute.notFound, true);

    // Legitimate waybill routes should still route to tracking
    const wbRoute = fn('/WB123456');
    assert.strictEqual(wbRoute.tab, 'tracking');
    assert.strictEqual(wbRoute.code, 'WB123456');
    assert.strictEqual(wbRoute.notFound, false);

    const vnptRoute = fn('/vnpt-9876');
    assert.strictEqual(vnptRoute.tab, 'tracking');
    assert.strictEqual(vnptRoute.code, 'VNPT-9876');

    const numRoute = fn('/123456');
    assert.strictEqual(numRoute.tab, 'tracking');
    assert.strictEqual(numRoute.code, '123456');

    // Subpath tracking works
    const subRoute = fn('/tra-cuu/WB9999');
    assert.strictEqual(subRoute.tab, 'tracking');
    assert.strictEqual(subRoute.code, 'WB9999');

    // /profile maps to profile
    assert.strictEqual(fn('/profile').tab, 'profile');
});

test('ErrorView supports dark mode on card container and border, and reactive countdown for status 429', () => {
    const errorViewSource = fs.readFileSync(require.resolve('../js/views/ErrorView.js'), 'utf8');
    const errorCssSource = fs.readFileSync(require.resolve('../css/views/error.css'), 'utf8');

    // Verify dark mode card container and border classes exist in error-view-card
    assert.match(errorViewSource, /error-view-card/);
    assert.match(errorCssSource, /\.error-view-card/);
    assert.match(errorCssSource, /html\.dark\s+\.error-view-card[\s\S]*?border:\s*1px\s+solid\s+#1e293b/);

    // Verify reactive watch on errorCode
    assert.match(errorViewSource, /watch\(\(\)\s*=>\s*props\.errorCode/);
    assert.match(errorViewSource, /checkAndStartCountdown/);
});

test('app.js handles error routes in navigateTo and handlePopState without setting currentTrackingCode', () => {
    const appSource = fs.readFileSync(require.resolve('../js/app.js'), 'utf8');

    // Verify navigateTo parses error route params and clears currentTrackingCode
    assert.match(appSource, /if\s*\(resolved\.tab\s*!==\s*'error'\)[\s\S]*?currentTrackingCode\.value\s*=\s*code\.trim\(\)[\s\S]*?else\s*\{[\s\S]*?currentTrackingCode\.value\s*=\s*'';/);
    assert.match(appSource, /if\s*\(resolved\.tab\s*===\s*'error'\s*\|\|\s*resolved\.notFound\)/);
    assert.match(appSource, /showError\(errorCode,\s*errorTitle,\s*errorMessage\)/);
});

