(function () {
    const template = `
    <Transition name="toast">
        <div 
            v-if="toast && toast.show" 
            :class="[
                'toast-container-card fixed top-6 right-6 z-[99999] p-4 rounded-2xl shadow-xl border text-xs max-w-sm w-[calc(100%-3rem)] sm:w-auto transition-all duration-300 flex items-start space-x-3 backdrop-blur-md',
                toast.type === 'error' ? 'toast-error bg-rose-50/95 dark:bg-[#251014] border-rose-200 dark:border-rose-900/80 text-rose-900 dark:text-rose-100 shadow-rose-500/10' : 
                toast.type === 'warning' ? 'toast-warning bg-amber-50/95 dark:bg-[#241708] border-amber-200 dark:border-amber-900/80 text-amber-900 dark:text-amber-100 shadow-amber-500/10' : 
                'toast-success bg-emerald-50/95 dark:bg-[#092218] border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100 shadow-emerald-500/10'
            ]"
        >
            <div class="mt-0.5 flex-shrink-0">
                <svg v-if="toast.type === 'error'" class="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <svg v-else-if="toast.type === 'warning'" class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else class="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div class="flex-1 min-w-0 pr-1">
                <div class="font-bold text-xs mb-0.5 text-slate-900 dark:text-white">{{ toast.title }}</div>
                <div class="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 break-words">{{ toast.message }}</div>
            </div>
            <button 
                type="button"
                @click="toast.show = false"
                title="Đóng thông báo"
                class="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg active:scale-90 transition-all flex-shrink-0 cursor-pointer"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    </Transition>
    `;
    const ToastContainer = {
        name: 'ToastContainer',
        template,
        props: {
            toast: {
                type: Object,
                default: () => ({ show: false, type: 'info', title: '', message: '' })
            }
        }
    };
    window.ToastContainer = ToastContainer;
})();
