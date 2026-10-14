const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
    const storage = new Map();
    const calls = [];
    const context = {
        window: { location: { port: '80', protocol: 'https:' } },
        sessionStorage: {
            setItem: (k, v) => storage.set(k, v),
            getItem: k => storage.get(k) || null,
            removeItem: k => storage.delete(k)
        },
        localStorage: {
            getItem: () => null,
            setItem: () => {}
        },
        document: { title: 'VNPT' },
        CustomEvent: class { constructor(name, detail) { this.name = name; this.detail = detail; } },
        fetch: async (url, opts) => {
            calls.push({ url, opts });
            return {
                ok: true,
                body: {
                    getReader: () => {
                        let step = 0;
                        const chunks = [
                            new TextEncoder().encode('data:Chào \n\n'),
                            new TextEncoder().encode('data:bạn!\n\n')
                        ];
                        return {
                            read: async () => {
                                if (step < chunks.length) {
                                    return { done: false, value: chunks[step++] };
                                }
                                return { done: true, value: undefined };
                            }
                        };
                    }
                }
            };
        },
        AbortSignal: { timeout: () => ({}) },
        TextDecoder: class {
            decode(val) {
                return new TextDecoder().decode(val);
            }
        }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../js/components/ChatbotWidget.js'), 'utf8'), context);
    return { ...context.window, calls, storage };
}

test('ChatbotWidget initializes sessionId and resets it with backend notification', async () => {
    const h = harness();
    assert.ok(h.ChatbotWidget);
    const data = h.ChatbotWidget.data();
    assert.ok(data.sessionId.startsWith('sid_'));
    assert.equal(h.storage.get('vnpt_ai_session_id'), data.sessionId);

    // Test resetChat calls reset endpoint
    const mockThis = {
        sessionId: data.sessionId,
        messages: [{ text: 'hi' }],
        loadSessionMessages() {},
        saveSessionMessages() {},
        typeBotResponse() {}
    };
    h.ChatbotWidget.methods.resetChat.call(mockThis);
    assert.notEqual(mockThis.sessionId, data.sessionId);
    assert.equal(h.calls.length, 1);
    assert.ok(h.calls[0].url.includes('/api/support/ai/reset?sessionId='));
});

test('ChatbotWidget processes stream response and accumulates tokens in bot message', async () => {
    const h = harness();
    const data = h.ChatbotWidget.data();
    const messages = [];
    const mockThis = {
        sessionId: data.sessionId,
        inputText: '',
        isTyping: false,
        isOpen: true,
        unreadCount: 0,
        messages,
        determineThinkingMessage: () => 'Đang suy nghĩ...',
        scrollToBottom: () => {},
        saveSessionMessages: () => {},
        playNotificationSound: () => {},
        formatMarkdown: text => text,
        getCurrentTime: () => '12:00'
    };

    await h.ChatbotWidget.methods.processUserIntent.call(mockThis, 'Xin chào');
    assert.equal(messages.length, 1);
    assert.equal(messages[0].sender, 'bot');
    assert.equal(messages[0].text, 'Chào bạn!');
    assert.equal(h.calls.length, 1);
    assert.ok(h.calls[0].url.includes('/api/support/ai/stream'));
});
