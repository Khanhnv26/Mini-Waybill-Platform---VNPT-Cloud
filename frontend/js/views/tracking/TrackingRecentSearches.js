(function () {
    const { ref, onMounted } = Vue;

    const STORAGE_KEY = 'vnpt_waybill_recent_searches';

    const template = `
    <div v-if="recentCodes.length > 0" class="flex flex-wrap items-center gap-1.5 pt-2 text-xs">
        <span class="text-slate-400 text-[11px] font-semibold flex items-center space-x-1">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Gần đây:</span>
        </span>

        <button 
            v-for="code in recentCodes" 
            :key="code"
            type="button"
            @click="$emit('select-code', code)"
            class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-mono text-[11px] font-semibold transition border border-slate-200/60 hover:border-blue-200 cursor-pointer group"
        >
            <span>{{ code }}</span>
            <span @click.stop="removeCode(code)" class="text-slate-400 group-hover:text-rose-500 hover:scale-110 ml-0.5" title="Xóa mã này">&times;</span>
        </button>

        <button 
            v-if="recentCodes.length > 2"
            type="button" 
            @click="clearAll" 
            class="text-[10px] text-slate-400 hover:text-rose-500 underline ml-1 cursor-pointer"
        >
            Xóa lịch sử
        </button>
    </div>
    `;

    const TrackingRecentSearches = {
        name: 'TrackingRecentSearches',
        template,
        emits: ['select-code'],
        setup(props, { emit }) {
            const recentCodes = ref([]);

            const loadRecentCodes = () => {
                try {
                    const raw = localStorage.getItem(STORAGE_KEY);
                    recentCodes.value = raw ? JSON.parse(raw) : [];
                } catch {
                    recentCodes.value = [];
                }
            };

            const addCode = (code) => {
                if (!code || typeof code !== 'string') return;
                const clean = code.trim().toUpperCase();
                if (clean.length < 4) return;
                let list = recentCodes.value.filter(c => c !== clean);
                list.unshift(clean);
                list = list.slice(0, 6);
                recentCodes.value = list;
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
                } catch {}
            };

            const removeCode = (code) => {
                recentCodes.value = recentCodes.value.filter(c => c !== code);
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentCodes.value));
                } catch {}
            };

            const clearAll = () => {
                recentCodes.value = [];
                try {
                    localStorage.removeItem(STORAGE_KEY);
                } catch {}
            };

            onMounted(() => {
                loadRecentCodes();
            });

            return {
                recentCodes,
                addCode,
                removeCode,
                clearAll
            };
        }
    };

    window.TrackingRecentSearches = TrackingRecentSearches;
})();
