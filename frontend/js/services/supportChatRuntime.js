(function () {
    const uuid = () => globalThis.crypto?.randomUUID?.() || `chat_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
    const reactive = window.Vue?.reactive || (value => value);
    const state = reactive({ connected: false, notices: [], unread: {}, pending: {}, sound: true, openTicketCode: null, identityVersion: 0 });
    const drafts = new Map();
    const seen = new Set();
    const readThrough = new Map();
    const sessionId = uuid();
    let connection, timer, started = false, selected = null, viewer = null, identity = null;
    let refreshBusy = false, presenceBusy = false, baseline = false, lastInbox = 0, lastPresence = 0, audio;
    let wakeTimer = null, lastWake = -Infinity;
    let generation = 0;
    const guestTickets = () => {
        const ids = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const match = /^support_access:(\d+)$/.exec(key);
            if (match) ids.push(Number(match[1]));
        }
        return ids;
    };
    const principal = () => {
        const token = window.Auth?.getToken?.();
        const claims = window.Auth?.decodeJwtPayload?.();
        return token && claims?.userId != null ? { id: String(claims.userId), token,
            staff: (claims.roles || []).some(role => ['CS', 'ADMIN', 'ROLE_CS', 'ROLE_ADMIN'].includes(role)) } : null;
    };
    const hasAccess = () => !!identity || guestTickets().length > 0;
    const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
    const ticketVisible = id => !document.hidden && selected?.id === id && !!viewer?.();
    const endpoint = () => {
        const { protocol, hostname, port } = window.location;
        return `${protocol}//${hostname}${!port || ['80', '443'].includes(port) ? '' : ':8080'}/api/notifications/ws`;
    };
    const publishNotices = () => emit('support:notifications', state.notices);

    async function playNotice(notice) {
        if (!state.sound || !audio) return;
        const claim = async () => {
            const key = `support:sounded:${identity?.id || 'guest'}:${notice.id}`;
            try {
                if (localStorage.getItem(key)) return;
                localStorage.setItem(key, String(Date.now()));
            } catch { return; }
            try {
                if (audio.state !== 'running') return;
                const oscillator = audio.createOscillator();
                const gain = audio.createGain();
                oscillator.connect(gain); gain.connect(audio.destination);
                oscillator.frequency.setValueAtTime(740, audio.currentTime);
                oscillator.frequency.setValueAtTime(880, audio.currentTime + 0.1);
                gain.gain.setValueAtTime(0.08, audio.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.28);
                oscillator.start(); oscillator.stop(audio.currentTime + 0.3);
            } catch { /* Badge and toast remain available without audio. */ }
        };
        if (navigator.locks?.request) await navigator.locks.request('support-chat-sound', claim);
        else await claim();
    }

    function notify(notice) {
        if (seen.has(notice.id)) return;
        seen.add(notice.id);
        if (notice.isRead || ticketVisible(notice.ticketId)) return;
        if (!document.hidden) window.Utils?.showToast('Tin nhắn hỗ trợ mới',
            `${notice.ticketCode} · ${notice.senderName || 'Đối phương'}: ${(notice.content || '[Tệp đính kèm]').slice(0, 120)}`, 'info');
        playNotice(notice);
    }

    async function refresh() {
        if (!started || !hasAccess() || refreshBusy) return;
        refreshBusy = true;
        const version = generation;
        lastInbox = Date.now();
        try {
            const requests = identity
                ? [window.SupportService.chatRequest('/api/tickets/chat/inbox')]
                : guestTickets().map(id => window.SupportService.chatRequest(`/api/tickets/chat/inbox?ticketId=${id}`, 'get', null, id));
            const results = await Promise.allSettled(requests);
            if (version !== generation) return;
            // Preserve existing notices when a request fails rather than clearing the bell.
            const merged = new Map(state.notices.map(item => [item.id, item]));
            for (const result of results) if (result.status === 'fulfilled') {
                for (const notice of result.value || []) {
                    notice.isRead ||= notice.id <= (readThrough.get(notice.ticketId) || 0);
                    merged.set(notice.id, notice);
                    if (baseline) notify(notice); else seen.add(notice.id);
                }
            }
            state.notices = [...merged.values()].sort((a, b) => b.id - a.id).slice(0, 100);
            if (results.some(result => result.status === 'fulfilled')) baseline = true;
            if (identity) {
                const summary = await window.SupportService.chatRequest('/api/tickets/chat/summary');
                if (version !== generation) return;
                state.unread = Object.fromEntries(summary.map(item => [item.ticketId, item.unreadCount]));
            } else {
                const summaries = await Promise.allSettled(guestTickets().map(id =>
                    window.SupportService.chatRequest(`/api/tickets/chat/summary?ticketId=${id}`, 'get', null, id)));
                if (version !== generation) return;
                for (const result of summaries) if (result.status === 'fulfilled') {
                    for (const item of result.value || []) state.unread[item.ticketId] = item.unreadCount;
                }
            }
            publishNotices();
        } catch { /* Reconcile on the next poll or reconnect. */ }
        finally { if (version === generation) refreshBusy = false; }
    }

    async function heartbeat(leave = false) {
        if (!hasAccess() || (!leave && (!started || presenceBusy))) return;
        const version = generation;
        if (!leave) { presenceBusy = true; lastPresence = Date.now(); }
        const send = id => window.SupportService.chatRequest('/api/notifications/chat/presence', 'post',
            { sessionId, ticketId: id, leave }, id, { keepalive: leave });
        try { await Promise.allSettled(identity ? [send(null)] : guestTickets().map(send)); }
        finally { if (!leave && version === generation) presenceBusy = false; }
    }

    function inboxes() {
        if (identity) return [{ destination: `/topic/chat/inbox/user/${identity.id}` },
            ...(identity.staff ? [{ destination: '/topic/chat/inbox/staff' }] : [])];
        return guestTickets().map(id => ({ destination: `/topic/chat/inbox/guest/${id}`,
            headers: window.SupportService.ticketHeaders(id) }));
    }

    function receive(frame) {
        let event;
        try { event = JSON.parse(frame.body); } catch { return; }
        if (!event || typeof event !== 'object') return;
        if ((event.eventType || 'MESSAGE') === 'MESSAGE' && event.messageId) {
            if (event.clientMessageId) {
                const pending = state.pending[event.ticketId] || [];
                for (const item of pending) if (item.clientMessageId === event.clientMessageId) clearTimeout(item.retryTimer);
                state.pending[event.ticketId] = pending.filter(item => item.clientMessageId !== event.clientMessageId);
            }
            const mine = identity ? String(event.senderId) === identity.id : event.senderRole === 'CUSTOMER';
            if (!mine) {
                const previous = state.notices.find(item => item.id === event.messageId);
                const notice = { ...event, id: event.messageId, isRead: previous?.isRead || event.messageId <= (readThrough.get(event.ticketId) || 0) };
                if (event.audienceKey === 'staff' || event.audienceKey === (identity ? `user:${identity.id}` : `guest:${event.ticketId}`)) {
                    state.notices = [notice, ...state.notices.filter(item => item.id !== notice.id)].slice(0, 100);
                    const fresh = !seen.has(notice.id);
                    notify(notice);
                    if (fresh) state.unread[event.ticketId] = (state.unread[event.ticketId] || 0) + 1;
                    publishNotices();
                }
            }
        }
        emit('support:event', event);
    }

    function connect() {
        connection?.stop(); state.connected = false;
        connection = new window.SupportChatConnection({ url: endpoint(), onMessage: receive,
            onConnect() { if (!started || connection !== current) return; state.connected = true; wake(true); },
            onDisconnect() { if (!started || connection !== current) return; state.connected = false; emit('support:disconnected'); } });
        const current = connection;
        connection.subscribe(selected);
        connection.subscribeInboxes(inboxes());
        connection.start();
    }

    function activate(reconnect = false) {
        if (!started) return;
        if (!hasAccess()) {
            clearInterval(timer); timer = null;
            connection?.stop(); connection = null; state.connected = false;
            return;
        }
        if (reconnect || !connection) connect();
        heartbeat(); refresh();
        if (!timer) timer = setInterval(() => {
            if (!started || !hasAccess()) return;
            const now = Date.now();
            if (now - lastPresence >= 25000) heartbeat();
            const interval = document.hidden ? 60000 : (state.connected ? 15000 : 5000);
            if (now - lastInbox >= interval) refresh();
        }, 5000);
    }

    function authChanged() {
        state.identityVersion++;
        const next = principal();
        if ((next?.token || '') === (identity?.token || '')) return;
        if (next && identity && next.id === identity.id) { identity = next; activate(true); return; }
        generation++; identity = next; seen.clear(); readThrough.clear(); drafts.clear();
        clearTimeout(wakeTimer); wakeTimer = null; lastWake = -Infinity;
        refreshBusy = false; presenceBusy = false;
        state.pending = {}; state.notices = []; state.unread = {}; selected = null; viewer = null;
        baseline = false; lastInbox = 0; lastPresence = 0;
        publishNotices(); activate(true); emit('support:identity-changed');
    }

    function unlockAudio() {
        if (!state.sound) return;
        try {
            const Audio = window.AudioContext || window.webkitAudioContext;
            if (Audio) { audio ||= new Audio(); audio.resume().catch(() => {}); }
        } catch {}
    }
    function wake(force = false) {
        if (!started || !hasAccess() || (document.hidden && force !== true) || wakeTimer != null) return;
        wakeTimer = setTimeout(() => {
            wakeTimer = null;
            if (!started || !hasAccess() || Date.now() - lastWake < 250) return;
            lastWake = Date.now();
            heartbeat(); refresh(); emit('support:connected');
        }, 0);
    }
    function accessChanged() { connection?.subscribeInboxes(inboxes()); activate(); }
    function online() { wake(true); }
    function leave() { heartbeat(true); }

    async function attempt(pending, version) {
        if (pending.busy || version !== generation) return;
        pending.busy = true; pending.status = 'sending';
        try {
            const message = await window.SupportService.addMessage(pending.ticketId, pending.payload);
            if (version !== generation) return;
            state.pending[pending.ticketId] = (state.pending[pending.ticketId] || []).filter(item => item.clientMessageId !== pending.clientMessageId);
            emit('support:sent', { ticketId: pending.ticketId, message });
        } catch (error) {
            if (version !== generation) return;
            if (!(state.pending[pending.ticketId] || []).some(item => item.clientMessageId === pending.clientMessageId)) return;
            pending.status = 'failed'; pending.error = error.message;
            if ((!error.status || error.status >= 500 || error.status === 429) && pending.attempts++ < 2) {
                pending.retryTimer = setTimeout(() => attempt(pending, version), 3000 * pending.attempts);
            }
        } finally { pending.busy = false; }
    }

    window.SupportChatRuntime = {
        state, drafts,
        start() {
            if (started) return;
            started = true; identity = principal();
            try { state.sound = localStorage.getItem('support:chat:sound') !== 'off';
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key.startsWith('support:sounded:') && Number(localStorage.getItem(key)) < Date.now() - 86400000) localStorage.removeItem(key);
                }
            } catch {}
            window.addEventListener('auth:changed', authChanged);
            window.addEventListener('support:access-changed', accessChanged);
            window.addEventListener('online', online);
            window.addEventListener('pagehide', leave);
            document.addEventListener('visibilitychange', wake);
            document.addEventListener('pointerdown', unlockAudio);
            document.addEventListener('keydown', unlockAudio);
            activate();
        },
        stop() {
            generation++; started = false;
            clearInterval(timer); timer = null; clearTimeout(wakeTimer); wakeTimer = null;
            connection?.stop(); connection = null; state.connected = false; heartbeat(true);
            refreshBusy = false; presenceBusy = false; lastWake = -Infinity;
            window.removeEventListener('auth:changed', authChanged);
            window.removeEventListener('support:access-changed', accessChanged);
            window.removeEventListener('online', online); window.removeEventListener('pagehide', leave);
            document.removeEventListener('visibilitychange', wake);
            document.removeEventListener('pointerdown', unlockAudio); document.removeEventListener('keydown', unlockAudio);
            for (const list of Object.values(state.pending)) for (const pending of list) clearTimeout(pending.retryTimer);
            audio?.close().catch(() => {}); audio = null;
        },
        select(ticket, isVisible) { selected = ticket; viewer = isVisible; connection?.subscribe(ticket); },
        toggleSound() {
            state.sound = !state.sound;
            try { localStorage.setItem('support:chat:sound', state.sound ? 'on' : 'off'); } catch {}
            if (state.sound) unlockAudio();
        },
        send(ticketId, payload) {
            const clientMessageId = uuid();
            const pending = { ticketId, clientMessageId, content: payload.content, attachmentUrls: payload.attachmentUrls,
                createdAt: new Date().toISOString(), status: 'sending', attempts: 0, payload: { ...payload, clientMessageId } };
            state.pending[ticketId] ||= []; state.pending[ticketId].push(pending);
            // Use Vue's proxy so completion and retry states remain reactive.
            const item = state.pending[ticketId].find(item => item.clientMessageId === clientMessageId);
            attempt(item, generation);
            return clientMessageId;
        },
        retry(pending) { clearTimeout(pending.retryTimer); pending.attempts = 0; return attempt(pending, generation); },
        async dismiss(notice) {
            await window.SupportService.markRead(notice.ticketId, notice.id, true);
            readThrough.set(notice.ticketId, Math.max(readThrough.get(notice.ticketId) || 0, notice.id));
            for (const item of state.notices) if (item.ticketId === notice.ticketId && item.id <= notice.id) item.isRead = true;
            publishNotices();
        },
        async read(ticketId, messageId) {
            const result = await window.SupportService.markRead(ticketId, messageId);
            readThrough.set(ticketId, Math.max(readThrough.get(ticketId) || 0, messageId));
            state.unread[ticketId] = result.unreadCount;
            for (const item of state.notices) if (item.ticketId === ticketId && item.id <= messageId) item.isRead = true;
            publishNotices(); return result;
        },
        refresh,
        open(code) { state.openTicketCode = code; emit('navigate-to-support', { ticketCode: code }); }
    };
})();
