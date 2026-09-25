(function () {
    const template = `
    <div class="flex flex-col min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <public-header
            :current-tab="currentTab"
            :public-guest-tabs="publicGuestTabs"
            @switch-tab="$emit('switch-tab', $event)"
            @guest-tab-click="$emit('guest-tab-click', $event)"
        ></public-header>

        <main class="flex-1 p-4 sm:p-8 bg-gradient-to-b from-blue-50/30 via-slate-50 to-slate-100">
            <div class="max-w-7xl mx-auto relative">
                <slot></slot>
            </div>
        </main>

        <public-footer
            @switch-tab="$emit('switch-tab', $event)"
        ></public-footer>
    </div>
    `;

    const PublicLayout = {
        name: 'PublicLayout',
        components: {
            PublicHeader: window.PublicHeader,
            PublicFooter: window.PublicFooter
        },
        template,
        props: {
            currentTab: { type: String, default: 'tracking' },
            publicGuestTabs: { type: Array, default: () => [] }
        },
        emits: ['switch-tab', 'guest-tab-click']
    };

    window.PublicLayout = PublicLayout;
})();
