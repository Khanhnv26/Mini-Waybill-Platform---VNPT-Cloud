
(function () {
    if (window.WaybillPreloader) return;
    let finished = false;
    let initialized = false;
    let failSafe;
    let hideTimer = null;
    let displayedAt = 0;
    let stageTimers = [];
    const clearStageTimers = () => {
        stageTimers.forEach(clearTimeout);
        stageTimers = [];
    };
    let cycle = 0;
    let pending = 0;
    let readyRequested = false;
    const minimumDuration = 1500;
    const progressDuration = minimumDuration - 350;
    let lastPhase = -1;
    const checkmarkSvg = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    const stagesConfig = [{ threshold: 0 }, { threshold: 33 }, { threshold: 66 }, { threshold: 100 }];
    function updateDisplay(pct) {
        const phase = pct >= 100 ? 3 : pct >= 66 ? 2 : pct >= 33 ? 1 : 0;
        if (phase === lastPhase) return;
        lastPhase = phase;
        
        for (let i = 1; i <= 4; i++) {
            const nodeCircle = document.getElementById('node-circle-' + i);
            const nodeIcon = document.getElementById('node-icon-' + i);
            const nodeLabel = document.getElementById('node-label-' + i);
            if (!nodeCircle || !nodeIcon || !nodeLabel) continue;
            const stageThresh = stagesConfig[i - 1].threshold;
            const nextThresh = i < 4 ? stagesConfig[i].threshold : 101;
            if (pct > nextThresh || (i < 4 && pct >= nextThresh) || (i === 4 && pct >= 100)) {
                nodeCircle.className = 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs transition-all duration-300 pointer-events-auto';
                nodeIcon.innerHTML = checkmarkSvg;
                nodeLabel.className = 'font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap transition-colors';
            } else if (pct >= stageThresh && pct < nextThresh) {
                nodeCircle.className = 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-blue-100 dark:ring-blue-900/60 pulse-active shadow-md shadow-blue-500/25 transition-all duration-300 scale-105 pointer-events-auto';
                nodeIcon.innerText = i.toString();
                nodeLabel.className = 'font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap transition-colors';
            } else {
                nodeCircle.className = 'w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-400 flex items-center justify-center font-bold text-[10.5px] transition-all duration-300 pointer-events-auto';
                nodeIcon.innerText = i.toString();
                nodeLabel.className = 'font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap transition-colors';
            }
        }
    }
    const markup = `<div id="vnpt-page-preloader" class="fixed inset-0 z-[99999] bg-slate-50 dark:bg-[#0b1329] flex flex-col items-center justify-center transition-opacity duration-300 px-4">
        <div class="flex flex-col items-center text-center space-y-4 max-w-sm w-full select-none">
            
            <div class="relative w-full max-w-[360px] h-36 flex flex-col justify-end panorama-mask overflow-hidden">
                
                
                <div class="celestial-sun absolute top-2 right-14 pointer-events-none">
                    <div class="relative w-9 h-9 flex items-center justify-center">
                        <div class="absolute inset-0 rounded-full bg-amber-400/30 blur-md animate-pulse"></div>
                        <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.55)]"></div>
                    </div>
                </div>
                
                <div class="celestial-moon absolute top-2 right-14 pointer-events-none">
                    <div class="relative w-9 h-9 flex items-center justify-center">
                        <div class="absolute inset-0 rounded-full bg-amber-200/20 blur-sm"></div>
                        <svg class="w-6 h-6 text-amber-200 drop-shadow-[0_0_10px_rgba(254,240,138,0.5)] fill-current" viewBox="0 0 24 24">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                    </div>
                </div>
                
                <div class="celestial-stars absolute inset-0 pointer-events-none">
                    <svg class="w-2.5 h-2.5 text-amber-200/90 absolute top-3 left-14 animate-twinkle" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z"/>
                    </svg>
                    <svg class="w-2 h-2 text-blue-200/80 absolute top-6 left-28 animate-twinkle-delay" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z"/>
                    </svg>
                    <svg class="w-2 h-2 text-amber-300/80 absolute top-2.5 right-28 animate-twinkle" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z"/>
                    </svg>
                    <span class="w-1 h-1 rounded-full bg-white/80 absolute top-5 right-7 animate-pulse"></span>
                </div>
                
                <div class="absolute inset-0 pointer-events-none overflow-hidden">
                    <div class="absolute top-2.5 right-8 animate-cloud-1 opacity-80 dark:opacity-30">
                        <svg class="w-12 h-6 text-white dark:text-slate-300 fill-current drop-shadow-xs" viewBox="0 0 64 32">
                            <path d="M18 24h30a8 8 0 0 0 1-15.9 12 12 0 0 0-22.8-1.5A9.5 9.5 0 0 0 18 24z"/>
                        </svg>
                    </div>
                    <div class="absolute top-6 right-20 animate-cloud-2 opacity-70 dark:opacity-20">
                        <svg class="w-9 h-4.5 text-white dark:text-slate-300 fill-current drop-shadow-xs" viewBox="0 0 64 32">
                            <path d="M18 24h28a7 7 0 0 0 1-13.9 10 10 0 0 0-19-1.3A8 8 0 0 0 18 24z"/>
                        </svg>
                    </div>
                    <div class="absolute top-3 left-10 animate-cloud-3 opacity-60 dark:opacity-15">
                        <svg class="w-10 h-5 text-white dark:text-slate-400 fill-current" viewBox="0 0 64 32">
                            <path d="M18 24h30a8 8 0 0 0 1-15.9 12 12 0 0 0-22.8-1.5A9.5 9.5 0 0 0 18 24z"/>
                        </svg>
                    </div>
                </div>
                
                <svg class="absolute bottom-3 left-0 right-0 w-full h-12 text-blue-100/60 dark:text-slate-800/40 fill-current pointer-events-none" viewBox="0 0 400 60" preserveAspectRatio="none">
                    <path d="M0 40 Q 60 18 130 35 T 260 22 T 400 38 L 400 60 L 0 60 Z"/>
                </svg>
                
                <div class="absolute bottom-3 right-0 animate-tree-1 pointer-events-none">
                    <svg class="w-6 h-9 text-emerald-600/80 dark:text-emerald-500/60 fill-current" viewBox="0 0 24 36">
                        <polygon points="12,2 4,14 8,14 3,24 21,24 16,14 20,14" />
                        <rect x="10.5" y="24" width="3" height="10" fill="#78350f" />
                    </svg>
                </div>
                <div class="absolute bottom-3 right-0 animate-tree-2 pointer-events-none">
                    <svg class="w-5 h-8 text-emerald-500/80 dark:text-emerald-400/50 fill-current" viewBox="0 0 24 36">
                        <circle cx="12" cy="12" r="10" />
                        <rect x="10.5" y="22" width="3" height="10" fill="#78350f" />
                    </svg>
                </div>
                
                <div class="absolute bottom-3 right-0 animate-milestone pointer-events-none flex flex-col items-center">
                    <div class="w-3.5 h-6 bg-white dark:bg-slate-700 rounded-t-full border border-slate-300 dark:border-slate-600 shadow-xs flex flex-col items-center overflow-hidden">
                        <div class="w-full h-2 bg-red-600"></div>
                        <span id="milestone-km" class="text-[5.5px] font-extrabold text-slate-800 dark:text-slate-200 font-mono mt-0.5">KM 0</span>
                    </div>
                </div>
                
                <div class="relative z-20 flex items-end justify-center w-full -mb-[10px]">
                    <div class="relative w-56 h-20">
                        
                        <svg class="w-full h-full" viewBox="0 0 240 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                            
                            <ellipse class="animate-shadow fill-slate-900/18 dark:fill-black/50" cx="120" cy="78" rx="84" ry="3.5" />
                            
                            <g class="animate-truck-body">
                                
                                <path d="M192 56 L235 50 L235 64 L192 60 Z" fill="url(#headlight-beam-idx)" opacity="0.45" />
                                
                                <rect x="25" y="20" width="125" height="48" rx="3.5" fill="#0055bb" stroke="#00376d" stroke-width="1.5" />
                                
                                <line x1="31" y1="22" x2="31" y2="66" stroke="#003f88" stroke-width="1.5"/>
                                <line x1="144" y1="22" x2="144" y2="66" stroke="#003f88" stroke-width="1.5"/>
                                
                                <rect x="25" y="62" width="125" height="3.5" fill="#f59e0b" />
                                
                                <g transform="translate(37, 34)">
                                    <rect width="10" height="9" rx="1.5" fill="white" fill-opacity="0.18" stroke="white" stroke-width="1" />
                                    <line x1="5" y1="0" x2="5" y2="9" stroke="white" stroke-width="0.8" />
                                </g>
                                
                                <g transform="translate(96, 40)">
                                    <text text-anchor="middle" font-family="'Inter', sans-serif" font-size="9" font-weight="800" fill="white" letter-spacing="0.6">WAYBILL POST</text>
                                    <text y="9" text-anchor="middle" font-family="'Inter', sans-serif" font-size="5.5" font-weight="600" fill="#93c5fd" letter-spacing="0.4">EXPRESS LOGISTICS</text>
                                </g>
                                
                                <path d="M150 34 L175 34 L194 48 L196 68 L150 68 Z" fill="#0066cc" stroke="#00376d" stroke-width="1.5" />
                                
                                <path d="M174 37 L190 48 L168 48 L168 37 Z" fill="#bae6fd" stroke="#0284c7" stroke-width="1"/>
                                <line x1="184" y1="42" x2="174" y2="47" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                                
                                <rect x="153" y="38" width="12" height="10" rx="1" fill="#bae6fd" stroke="#0284c7" stroke-width="1"/>
                                
                                <rect x="193" y="56" width="3.5" height="5" rx="1" fill="#fef08a" stroke="#ca8a04" stroke-width="1" />
                                
                                <path d="M48 68 A 13 13 0 0 1 76 68 Z" fill="#1e293b" />
                                <path d="M156 68 A 13 13 0 0 1 184 68 Z" fill="#1e293b" />
                            </g>
                            
                            <g transform="translate(62, 69)">
                                <circle cx="0" cy="0" r="10" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
                                <circle cx="0" cy="0" r="5.5" fill="#cbd5e1" />
                                <g>
                                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="0.5s" repeatCount="indefinite" />
                                    <line x1="-5" y1="0" x2="5" y2="0" stroke="#475569" stroke-width="1.5"/>
                                    <line x1="0" y1="-5" x2="0" y2="5" stroke="#475569" stroke-width="1.5"/>
                                </g>
                                <circle cx="0" cy="0" r="2.2" fill="#0055bb" />
                            </g>
                            
                            <g transform="translate(170, 69)">
                                <circle cx="0" cy="0" r="10" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
                                <circle cx="0" cy="0" r="5.5" fill="#cbd5e1" />
                                <g>
                                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="0.5s" repeatCount="indefinite" />
                                    <line x1="-5" y1="0" x2="5" y2="0" stroke="#475569" stroke-width="1.5"/>
                                    <line x1="0" y1="-5" x2="0" y2="5" stroke="#475569" stroke-width="1.5"/>
                                </g>
                                <circle cx="0" cy="0" r="2.2" fill="#0055bb" />
                            </g>
                            
                            <defs>
                                <linearGradient id="headlight-beam-idx" x1="192" y1="58" x2="235" y2="58" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#fef08a" stop-opacity="0.8"/>
                                    <stop offset="1" stop-color="#fef08a" stop-opacity="0"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
                
                <div class="relative w-full h-3 bg-slate-700 dark:bg-slate-900 border-t border-slate-600 dark:border-slate-800 flex items-center overflow-hidden">
                    <div class="absolute inset-0 flex items-center space-x-5 animate-road-dashes w-[180%]">
                        <div class="w-6 h-0.5 bg-white/90 rounded-full flex-shrink-0"></div>
                        <div class="w-6 h-0.5 bg-white/90 rounded-full flex-shrink-0"></div>
                        <div class="w-6 h-0.5 bg-white/90 rounded-full flex-shrink-0"></div>
                        <div class="w-6 h-0.5 bg-white/90 rounded-full flex-shrink-0"></div>
                        <div class="w-6 h-0.5 bg-white/90 rounded-full flex-shrink-0"></div>
                        <div class="w-6 h-0.5 bg-white/90 rounded-full flex-shrink-0"></div>
                        <div class="w-6 h-0.5 bg-white/90 rounded-full flex-shrink-0"></div>
                        <div class="w-6 h-0.5 bg-white/90 rounded-full flex-shrink-0"></div>
                        <div class="w-6 h-0.5 bg-white/90 rounded-full flex-shrink-0"></div>
                        <div class="w-6 h-0.5 bg-white/90 rounded-full flex-shrink-0"></div>
                    </div>
                </div>
            </div>
            
            <div class="space-y-0.5 pt-0.5">
                <div class="font-extrabold text-base text-slate-800 dark:text-white tracking-tight">Đang Khởi Động Hệ Thống</div>
                <p class="text-[11.5px] text-slate-400 font-medium">Vui lòng đợi trong giây lát, giao diện đang được chuẩn bị...</p>
            </div>
            <div class="w-full max-w-[300px] pt-2 select-none">
                
                <div class="relative w-full h-6 flex items-center">
                    
                    <div class="absolute left-3 right-3 top-[10px] h-1 bg-slate-200 dark:bg-slate-700/80 rounded-full overflow-hidden z-0">
                        <div id="route-progress-fill" class="route-progress-animation h-full bg-blue-600 rounded-full" style="animation-duration: ${progressDuration}ms;"></div>
                    </div>
                    
                    <div class="relative z-10 flex items-center justify-between w-full pointer-events-none">
                        <div id="node-circle-1" class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-blue-100 dark:ring-blue-900/60 pulse-active shadow-sm transition-all duration-300 pointer-events-auto">
                            <span id="node-icon-1">1</span>
                        </div>
                        <div id="node-circle-2" class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-400 flex items-center justify-center font-bold text-[10.5px] transition-all duration-300 pointer-events-auto">
                            <span id="node-icon-2">2</span>
                        </div>
                        <div id="node-circle-3" class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-400 flex items-center justify-center font-bold text-[10.5px] transition-all duration-300 pointer-events-auto">
                            <span id="node-icon-3">3</span>
                        </div>
                        <div id="node-circle-4" class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-400 flex items-center justify-center font-bold text-[10.5px] transition-all duration-300 pointer-events-auto">
                            <span id="node-icon-4">4</span>
                        </div>
                    </div>
                </div>
                
                <div class="relative w-full flex justify-between mt-1 text-[10.5px]">
                    <div class="w-6 flex justify-center"><span id="node-label-1" class="font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">Tiếp nhận</span></div>
                    <div class="w-6 flex justify-center"><span id="node-label-2" class="font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">Chia chọn</span></div>
                    <div class="w-6 flex justify-center"><span id="node-label-3" class="font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">Vận chuyển</span></div>
                    <div class="w-6 flex justify-center"><span id="node-label-4" class="font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">Sẵn sàng</span></div>
                </div>
            </div>
        </div>
    </div>`;
    const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(failSafe);
        clearTimeout(hideTimer);
        clearStageTimers();
        const host = document.getElementById('waybill-preloader');
        if (host) { host.hidden = true; host.replaceChildren(); }
        document.removeEventListener('DOMContentLoaded', init);
    };
    const ready = () => {
        readyRequested = true;
        if (pending > 0) return;
        if (finished || hideTimer != null) return;
        if (!initialized) { finish(); return; }
        const remaining = minimumDuration - (Date.now() - displayedAt);
        if (remaining <= 0) finish();
        else hideTimer = setTimeout(finish, remaining);
    };
    const show = () => {
        clearTimeout(failSafe);
        clearTimeout(hideTimer);
        clearStageTimers();
        cycle++;
        const currentCycle = cycle;
        finished = false;
        initialized = false;
        hideTimer = null;
        pending = 0;
        readyRequested = false;
        lastPhase = -1;
        failSafe = setTimeout(finish, 8000);
        init();
        return () => { if (currentCycle === cycle) ready(); };
    };
    const waitFor = work => {
        if (finished) return work;
        const currentCycle = cycle;
        pending++;
        clearTimeout(hideTimer);
        hideTimer = null;
        const settled = () => {
            if (currentCycle !== cycle || finished) return;
            pending--;
            if (readyRequested) ready();
        };
        Promise.resolve(work).then(settled, settled);
        return work;
    };
    function init() {
        if (finished || initialized) return;
        const host = document.getElementById('waybill-preloader');
        if (!host) return;
        initialized = true;
        host.innerHTML = markup;
        host.hidden = false;
        displayedAt = Date.now();
        updateDisplay(0);
        stageTimers = stagesConfig.slice(1).map(stage => setTimeout(() => {
            if (!finished) updateDisplay(stage.threshold);
        }, Math.ceil(progressDuration * stage.threshold / 100)));
    }
    window.WaybillPreloader = { ready, show, waitFor };
    show();
    if (!initialized && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    }
})();
