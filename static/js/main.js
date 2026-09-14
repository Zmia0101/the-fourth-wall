// 第四面墙 - 前端逻辑
// 支持：单人多会话、同书群聊、历史会话切换与删除

const STORAGE_KEY = 'bookChat_sessions_v1';
const LEGACY_KEY = 'bookChat_history';

let state = {
    sessions: {},       // 单聊会话：{ "bookId::charName": [session, ...] }
    active: null,       // 单聊当前状态：{ bookId, charName, bookTitle, sessionId }
    groupSessions: {},  // 群聊会话：{ "bookId": [session, ...] }
    activeGroup: null   // 群聊当前状态：{ bookId, sessionId }
};

// DOM元素
const messagesContainer = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatHeader = document.getElementById('chat-header');
const conversationList = document.getElementById('conversation-list');
const newChatBtn = document.getElementById('new-chat-btn');
const groupChatBtn = document.getElementById('group-chat-btn');
const groupModal = document.getElementById('group-modal');
const groupBookSelect = document.getElementById('group-book-select');
const groupCharList = document.getElementById('group-char-list');
const groupModalHint = document.getElementById('group-modal-hint');
const groupConfirm = document.getElementById('group-confirm');

// 登录与创作相关 DOM
const studioUser = document.getElementById('studio-user');
const studioSettingsBtn = document.getElementById('studio-settings-btn');
const studioLogoutBtn = document.getElementById('studio-logout-btn');
const heroUserEl = document.getElementById('hero-user');
const logoutModal = document.getElementById('logout-modal');
const logoutCancel = document.getElementById('logout-cancel');
const logoutConfirm = document.getElementById('logout-confirm');
const loginModal = document.getElementById('login-modal');
const loginTitle = document.getElementById('login-title');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const authToggle = document.getElementById('auth-toggle');
const authSubmit = document.getElementById('auth-submit');
const settingsModal = document.getElementById('settings-modal');
const settingsApiKey = document.getElementById('settings-api-key');
const settingsBaseUrl = document.getElementById('settings-base-url');
const settingsModel = document.getElementById('settings-model');
const settingsKeyHint = document.getElementById('settings-key-hint');
const settingsError = document.getElementById('settings-error');
const settingsClearBtn = document.getElementById('settings-clear-btn');
const settingsSaveBtn = document.getElementById('settings-save-btn');
const studioModal = document.getElementById('studio-modal');
const studioTitle = document.getElementById('studio-title');
const studioListView = document.getElementById('studio-list-view');
const studioFormView = document.getElementById('studio-form-view');
const studioList = document.getElementById('studio-list');
const studioNewBtn = document.getElementById('studio-new-btn');
const bookTitleInput = document.getElementById('book-title');
const bookAuthorInput = document.getElementById('book-author');
const bookDescInput = document.getElementById('book-desc');
const bookContentInput = document.getElementById('book-content');
const uploadBookBtn = document.getElementById('upload-book-btn');
const bookFileInput = document.getElementById('book-file-input');
const useContentCheck = document.getElementById('use-content-check');
const bookSummaryInput = document.getElementById('book-summary');
const generateSummaryBtn = document.getElementById('generate-summary-btn');
const useChapterRetrievalCheck = document.getElementById('use-chapter-retrieval-check');
const chaptersModal = document.getElementById('chapters-modal');
const chaptersTitle = document.getElementById('chapters-title');
const chaptersList = document.getElementById('chapters-list');
const chapterContent = document.getElementById('chapter-content');
const charEditorList = document.getElementById('char-editor-list');
const addCharBtn = document.getElementById('add-char-btn');
const studioError = document.getElementById('studio-error');
const studioBackBtn = document.getElementById('studio-back-btn');
const studioSaveBtn = document.getElementById('studio-save-btn');
const newBookBtn = document.getElementById('new-book-btn');
const manageBooksBtn = document.getElementById('manage-books-btn');
const toolsNormal = document.getElementById('tools-normal');
const toolsStudio = document.getElementById('tools-studio');
const coverPreview = document.getElementById('cover-preview');
const uploadCoverBtn = document.getElementById('upload-cover-btn');
const removeCoverBtn = document.getElementById('remove-cover-btn');
const coverFileInput = document.getElementById('cover-file-input');
const bookViewModal = document.getElementById('book-view-modal');
const bookViewTitle = document.getElementById('book-view-title');
const bookViewMeta = document.getElementById('book-view-meta');
const bookViewSummary = document.getElementById('book-view-summary');
const bookViewContent = document.getElementById('book-view-content');

// 主界面（书架 / 人物栏）
const chatPanel = document.getElementById('chat-panel');
const characterBar = document.getElementById('character-bar');
const shelfViewport = document.getElementById('shelf-viewport');

// 登录 / 创作状态
let currentUser = null;
let authMode = 'login';
let editingBookId = null;

// ---------- 状态持久化 ----------
function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            state = JSON.parse(raw);
        } catch (e) {
            state = { sessions: {}, active: null, groupSessions: {}, activeGroup: null };
        }
    }
    if (!state.sessions) state.sessions = {};
    if (!state.groupSessions) state.groupSessions = {};
    if (!state.active) state.active = null;
    if (!state.activeGroup) state.activeGroup = null;
    migrateLegacy();
}

function migrateLegacy() {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    try {
        const old = JSON.parse(raw);
        if (old && old.bookId && old.charName && Array.isArray(old.history) && old.history.length) {
            const key = sessionKey(old.bookId, old.charName);
            if (!state.sessions[key]) state.sessions[key] = [];
            const firstUser = old.history.find(m => m.role === 'user');
            state.sessions[key].push({
                id: generateId(),
                title: firstUser ? firstUser.content.slice(0, 20) : '新的对话',
                messages: old.history.filter(m => m.role === 'user' || m.role === 'assistant'),
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            localStorage.removeItem(LEGACY_KEY);
            saveState();
        }
    } catch (e) {}
}

// ---------- 工具函数 ----------
function sessionKey(bookId, charName) {
    return bookId + '::' + charName;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getSessions(bookId, charName) {
    const key = sessionKey(bookId, charName);
    if (!state.sessions[key]) state.sessions[key] = [];
    return state.sessions[key];
}

function getSortedSessions(bookId, charName) {
    return getSessions(bookId, charName).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function getGroupSessions(bookId) {
    if (!state.groupSessions[bookId]) state.groupSessions[bookId] = [];
    return state.groupSessions[bookId];
}

function getSortedGroupSessions(bookId) {
    return getGroupSessions(bookId).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (d.toDateString() === now.toDateString()) return hm;
    return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + hm;
}

function setChatReady(enabled) {
    userInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
}

function highlightChar(bookId, charName) {
    document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(
        '.char-btn[data-book-id="' + bookId + '"][data-char-name="' + charName + '"]'
    );
    if (btn) btn.classList.add('active');
}

function clearCharHighlight() {
    document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
}

// ---------- 会话列表渲染 ----------
function renderConversationList() {
    conversationList.innerHTML = '';

    if (state.activeGroup) {
        const sessions = getSortedGroupSessions(state.activeGroup.bookId);
        if (sessions.length === 0) {
            conversationList.innerHTML = '<div class="empty-conversations">还没有群聊记录</div>';
            return;
        }
        sessions.forEach(s => {
            const item = document.createElement('div');
            item.className = 'conversation-item' + (state.activeGroup.sessionId === s.id ? ' active' : '');
            item.dataset.sessionId = s.id;

            const textWrap = document.createElement('div');
            textWrap.className = 'conversation-text';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'conversation-title';
            titleSpan.textContent = s.title || '群聊';

            const metaSpan = document.createElement('span');
            metaSpan.className = 'conversation-meta';
            metaSpan.textContent = '👥 ' + formatTime(s.updatedAt || s.createdAt);

            textWrap.appendChild(titleSpan);
            textWrap.appendChild(metaSpan);

            const del = document.createElement('button');
            del.className = 'conversation-delete';
            del.type = 'button';
            del.title = '删除群聊';
            del.textContent = '🗑';
            del.dataset.sessionId = s.id;

            item.appendChild(textWrap);
            item.appendChild(del);
            conversationList.appendChild(item);
        });
        return;
    }

    if (!state.active || !state.active.bookId || !state.active.charName) {
        conversationList.innerHTML = '<div class="empty-conversations">' +
            (appMode === 'mine' ? '请先选择一本书和人物' : '请先选择人物或组建群聊') + '</div>';
        return;
    }

    const sessions = getSortedSessions(state.active.bookId, state.active.charName);
    if (sessions.length === 0) {
        conversationList.innerHTML = '<div class="empty-conversations">还没有对话记录</div>';
        return;
    }

    sessions.forEach(s => {
        const item = document.createElement('div');
        item.className = 'conversation-item' + (state.active.sessionId === s.id ? ' active' : '');
        item.dataset.sessionId = s.id;

        const textWrap = document.createElement('div');
        textWrap.className = 'conversation-text';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'conversation-title';
        titleSpan.textContent = s.title || '新的对话';

        const metaSpan = document.createElement('span');
        metaSpan.className = 'conversation-meta';
        metaSpan.textContent = formatTime(s.updatedAt || s.createdAt);

        textWrap.appendChild(titleSpan);
        textWrap.appendChild(metaSpan);

        const del = document.createElement('button');
        del.className = 'conversation-delete';
        del.type = 'button';
        del.title = '删除对话';
        del.textContent = '🗑';
        del.dataset.sessionId = s.id;

        item.appendChild(textWrap);
        item.appendChild(del);
        conversationList.appendChild(item);
    });
}

// ---------- 消息渲染 ----------
function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = 'message ' + role;
    div.textContent = content;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return div;
}

function addGroupReplies(replies) {
    replies.forEach(r => addSpeakerMessage(r.name, r.content));
}

function addSpeakerMessage(name, content) {
    const wrap = document.createElement('div');
    wrap.className = 'speaker-message';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'speaker-name';
    nameDiv.textContent = name;

    const bubble = document.createElement('div');
    bubble.className = 'message assistant';
    bubble.textContent = content;

    wrap.appendChild(nameDiv);
    wrap.appendChild(bubble);
    messagesContainer.appendChild(wrap);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return wrap;
}

function formatGroupText(replies, fallback) {
    if (!replies || !replies.length) return fallback || '';
    return replies.map(r => r.name + '：' + r.content).join('\n');
}

function renderSession(session) {
    messagesContainer.innerHTML = '';
    if (!session.messages || session.messages.length === 0) {
        showWelcome();
    } else {
        session.messages.forEach(m => addMessage(m.role, m.content));
    }
}

function renderGroupSession(session) {
    messagesContainer.innerHTML = '';
    if (!session.messages || session.messages.length === 0) {
        addMessage('system', '群聊已建立：' + session.characters.join('、') + '。请开始聊天吧。');
    } else {
        session.messages.forEach(m => {
            if (m.role === 'user') {
                addMessage('user', m.content);
            } else if (m.role === 'assistant') {
                if (m.replies && m.replies.length) {
                    addGroupReplies(m.replies);
                } else {
                    addMessage('assistant', m.content);
                }
            }
        });
    }
}

function showWelcome() {
    if (!state.active) return;
    addMessage('system', '你好！我是《' + state.active.bookTitle + '》中的' + state.active.charName + '，很高兴认识你！');
}

// ---------- 单聊交互 ----------
function selectCharacter(bookId, charName, bookTitle) {
    state.activeGroup = null;
    state.active = { bookId: bookId, charName: charName, bookTitle: bookTitle, sessionId: null };
    highlightChar(bookId, charName);
    setChatHeader(booksData.find(function (b) { return b.id === bookId; }), charName);
    setChatReady(true);
    newChatBtn.disabled = false;
    renderConversationList();

    const latest = getSortedSessions(bookId, charName)[0];
    if (latest) {
        openSession(latest.id);
    } else {
        messagesContainer.innerHTML = '';
        showWelcome();
        saveState();
    }
    userInput.focus();
}

function openSession(sessionId) {
    if (!state.active) return;
    const session = getSessions(state.active.bookId, state.active.charName).find(s => s.id === sessionId);
    if (!session) return;
    state.active.sessionId = sessionId;
    renderConversationList();
    renderSession(session);
    saveState();
}

function newChat() {
    if (!state.active || !state.active.bookId || !state.active.charName) return;
    const sessions = getSessions(state.active.bookId, state.active.charName);
    const session = {
        id: generateId(),
        title: '新的对话',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    sessions.push(session);
    state.active.sessionId = session.id;
    renderConversationList();
    messagesContainer.innerHTML = '';
    showWelcome();
    saveState();
    userInput.focus();
}

function deleteSession(sessionId) {
    if (!state.active) return;
    const key = sessionKey(state.active.bookId, state.active.charName);
    const sessions = state.sessions[key] || [];
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx === -1) return;

    if (!confirm('确定删除该对话吗？此操作不可恢复。')) return;
    sessions.splice(idx, 1);

    if (state.active.sessionId === sessionId) {
        const remaining = getSortedSessions(state.active.bookId, state.active.charName);
        if (remaining.length > 0) {
            state.active.sessionId = remaining[0].id;
            renderSession(remaining[0]);
        } else {
            state.active.sessionId = null;
            messagesContainer.innerHTML = '';
            showWelcome();
        }
    }
    renderConversationList();
    saveState();
}

async function sendSingleMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    if (!state.active || !state.active.bookId || !state.active.charName) return;

    const sessions = getSessions(state.active.bookId, state.active.charName);
    let session = sessions.find(s => s.id === state.active.sessionId);
    if (!session) {
        session = {
            id: generateId(),
            title: '新的对话',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        sessions.push(session);
        state.active.sessionId = session.id;
    }

    if (session.messages.length === 0) {
        session.title = message.slice(0, 20);
    }

    userInput.value = '';
    addMessage('user', message);
    session.messages.push({ role: 'user', content: message });
    session.updatedAt = Date.now();
    renderConversationList();
    saveState();

    const loadingMsg = addMessage('assistant', '思考中...');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                book_id: state.active.bookId,
                character_name: state.active.charName,
                message: message,
                history: session.messages.slice(0, -1)
            })
        });

        const data = await response.json();
        if (data.error) {
            loadingMsg.textContent = '❌ ' + data.error;
        } else {
            loadingMsg.textContent = data.reply;
            session.messages.push({ role: 'assistant', content: data.reply });
            session.updatedAt = Date.now();
            renderConversationList();
            saveState();
        }
    } catch (error) {
        loadingMsg.textContent = '❌ 网络错误，请重试';
    }
}

// ---------- 群聊交互 ----------
function openGroupModal() {
    groupBookSelect.innerHTML = '';
    (window.__BOOKS__ || []).forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.title;
        groupBookSelect.appendChild(opt);
    });
    renderGroupCharList();
    groupModal.classList.remove('hidden');
}

function renderGroupCharList() {
    const bookId = groupBookSelect.value;
    const book = (window.__BOOKS__ || []).find(b => b.id === bookId);
    groupCharList.innerHTML = '';
    if (!book) return;
    book.characters.forEach(name => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'group-char-chip';
        chip.dataset.name = name;
        chip.textContent = name;
        groupCharList.appendChild(chip);
    });
    updateGroupConfirm();
}

function selectedGroupCharacters() {
    return Array.from(groupCharList.querySelectorAll('.group-char-chip.selected')).map(c => c.dataset.name);
}

function updateGroupConfirm() {
    const n = selectedGroupCharacters().length;
    groupModalHint.textContent = n < 2 ? '请至少选择两个人物' : '已选择 ' + n + ' 人';
    groupConfirm.disabled = n < 2;
}

function confirmGroup() {
    const bookId = groupBookSelect.value;
    const characters = selectedGroupCharacters();
    if (!bookId || characters.length < 2) return;
    groupModal.classList.add('hidden');
    startGroupChat(bookId, characters);
}

function startGroupChat(bookId, characters) {
    state.active = null;
    clearCharHighlight();
    const sessions = getGroupSessions(bookId);
    const session = {
        id: generateId(),
        title: '群：' + characters.join('、'),
        characters: characters.slice(),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    sessions.push(session);
    state.activeGroup = { bookId: bookId, sessionId: session.id };
    chatHeader.textContent = '👥 群聊：' + characters.join('、');
    setChatReady(true);
    newChatBtn.disabled = true;
    renderConversationList();
    renderGroupSession(session);
    saveState();
    userInput.focus();
}

function openGroupSession(sessionId) {
    if (!state.activeGroup) return;
    const session = getGroupSessions(state.activeGroup.bookId).find(s => s.id === sessionId);
    if (!session) return;
    state.activeGroup.sessionId = sessionId;
    chatHeader.textContent = '👥 群聊：' + session.characters.join('、');
    renderConversationList();
    renderGroupSession(session);
    saveState();
}

function deleteGroupSession(sessionId) {
    if (!state.activeGroup) return;
    const sessions = getGroupSessions(state.activeGroup.bookId);
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx === -1) return;
    if (!confirm('确定删除该群聊吗？此操作不可恢复。')) return;
    sessions.splice(idx, 1);

    if (state.activeGroup.sessionId === sessionId) {
        const remaining = getSortedGroupSessions(state.activeGroup.bookId);
        if (remaining.length > 0) {
            state.activeGroup.sessionId = remaining[0].id;
            chatHeader.textContent = '👥 群聊：' + remaining[0].characters.join('、');
            renderGroupSession(remaining[0]);
        } else {
            state.activeGroup = null;
            chatHeader.textContent = '请从左侧选择人物或组建群聊';
            messagesContainer.innerHTML = '<div class="welcome-msg">👋 欢迎来到书籍人物世界！</div>';
            setChatReady(false);
            newChatBtn.disabled = true;
        }
    }
    renderConversationList();
    saveState();
}

async function sendGroupMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    if (!state.activeGroup || !state.activeGroup.bookId) return;

    const sessions = getGroupSessions(state.activeGroup.bookId);
    let session = sessions.find(s => s.id === state.activeGroup.sessionId);
    if (!session) {
        session = {
            id: generateId(),
            title: '群聊',
            characters: [],
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        sessions.push(session);
        state.activeGroup.sessionId = session.id;
    }

    userInput.value = '';
    addMessage('user', message);
    session.messages.push({ role: 'user', content: message });
    session.updatedAt = Date.now();
    renderConversationList();
    saveState();

    const loadingMsg = addMessage('assistant', '思考中...');

    const history = session.messages.slice(0, -1).map(m => {
        if (m.role === 'user') return { role: 'user', content: m.content };
        return { role: 'assistant', content: m.content };
    });

    try {
        const response = await fetch('/api/group_chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                book_id: state.activeGroup.bookId,
                characters: session.characters,
                message: message,
                history: history
            })
        });

        const data = await response.json();
        loadingMsg.remove();
        if (data.error) {
            addMessage('assistant', '❌ ' + data.error);
        } else {
            const replies = data.replies || [];
            const formatted = formatGroupText(replies, data.raw);
            if (replies.length) {
                addGroupReplies(replies);
            } else {
                addMessage('assistant', data.raw || '');
            }
            session.messages.push({ role: 'assistant', content: formatted, replies: replies });
            session.updatedAt = Date.now();
            renderConversationList();
            saveState();
        }
    } catch (error) {
        loadingMsg.remove();
        addMessage('assistant', '❌ 网络错误，请重试');
    }
}

function sendMessage() {
    if (state.activeGroup) {
        sendGroupMessage();
    } else {
        sendSingleMessage();
    }
}

// ---------- 登录与身份 ----------
async function fetchMe() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        currentUser = data.username || null;
    } catch (e) {
        currentUser = null;
    }
    refreshAuthUI();
    await loadApiKeyState();
}

function refreshAuthUI() {
    if (studioUser) {
        studioUser.textContent = currentUser ? ('👤 ' + currentUser) : '未登录';
    }
    if (studioSettingsBtn) {
        studioSettingsBtn.classList.toggle('hidden', !currentUser);
    }
    if (studioLogoutBtn) {
        studioLogoutBtn.classList.toggle('hidden', !currentUser);
    }
}

function setAuthMode(mode) {
    authMode = mode;
    loginTitle.textContent = mode === 'login' ? '登录' : '注册';
    authToggle.textContent = mode === 'login' ? '去注册' : '去登录';
    authSubmit.textContent = mode === 'login' ? '登录' : '注册';
    authError.textContent = '';
}

function openLoginModal() {
    setAuthMode('login');
    authUsername.value = '';
    authPassword.value = '';
    loginModal.classList.remove('hidden');
    setTimeout(() => authUsername.focus(), 0);
}

function closeLoginModal() {
    loginModal.classList.add('hidden');
}

async function submitAuth() {
    const username = authUsername.value.trim();
    const password = authPassword.value;
    if (!username || !password) {
        authError.textContent = '请输入用户名和密码';
        return;
    }
    authError.textContent = '';
    const url = authMode === 'login' ? '/api/login' : '/api/register';
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            currentUser = data.username;
            refreshAuthUI();
            closeLoginModal();
            await loadApiKeyState();
            if (!hasApiKey) {
                openSettings();
            }
            if (pendingMine) {
                pendingMine = false;
                enterApp('mine');
            }
        } else {
            authError.textContent = data.error || '操作失败';
        }
    } catch (e) {
        authError.textContent = '网络错误，请重试';
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (e) {}
    currentUser = null;
    hasApiKey = false;
    refreshAuthUI();
    updateHeroAuth();
    if (appMode === 'mine') {
        backToHero();
    }
}

// ---------- LLM 设置（用户自带 API Key） ----------
async function openSettings() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    settingsApiKey.value = '';
    settingsBaseUrl.value = '';
    settingsModel.value = '';
    settingsKeyHint.textContent = '';
    settingsError.textContent = '';
    settingsModal.classList.remove('hidden');
    try {
        const res = await fetch('/api/llm_settings');
        const data = await res.json();
        if (res.ok) {
            settingsKeyHint.textContent = data.api_key_set
                ? '当前已设置：' + (data.api_key_hint || '已设置') + '（留空则不修改）'
                : '尚未设置，将使用服务器默认 Key';
            settingsBaseUrl.value = data.base_url || '';
            settingsModel.value = data.model || '';
        }
    } catch (e) {}
}

function closeSettings() {
    settingsModal.classList.add('hidden');
}

async function saveSettings(clearKey) {
    const payload = {
        api_key: clearKey ? '' : settingsApiKey.value.trim(),
        base_url: settingsBaseUrl.value.trim(),
        model: settingsModel.value.trim(),
        clear_key: !!clearKey
    };
    settingsError.textContent = '';
    try {
        const res = await fetch('/api/llm_settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            await loadApiKeyState();
            if (clearKey) {
                settingsError.textContent = '已清除，需要重新填写 API Key 才能对话';
            } else {
                closeSettings();
            }
        } else {
            settingsError.textContent = data.error || '保存失败';
        }
    } catch (e) {
        settingsError.textContent = '网络错误，请重试';
    }
}

// ---------- 我要创作 ----------
async function openStudio() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    studioModal.classList.remove('hidden');
    await renderStudioList();
}

function closeStudio() {
    studioModal.classList.add('hidden');
}

async function openBookView(bookId) {
    bookViewTitle.textContent = '加载中...';
    bookViewMeta.textContent = '';
    bookViewSummary.textContent = '';
    bookViewSummary.classList.add('hidden');
    bookViewContent.textContent = '';
    bookViewModal.classList.remove('hidden');
    try {
        const res = await fetch('/api/books/' + bookId + '/view');
        const data = await res.json();
        if (!res.ok) {
            bookViewTitle.textContent = '书籍正文';
            bookViewContent.textContent = data.error || '加载失败';
            return;
        }
        bookViewTitle.textContent = '📖 ' + (data.title || '未命名书籍');
        const metaParts = [];
        if (data.author) metaParts.push('作者：' + data.author);
        if (data.translator) metaParts.push('译者：' + data.translator);
        if (data.description) metaParts.push(data.description);
        bookViewMeta.textContent = metaParts.join('　·　');
        if (data.summary) {
            bookViewSummary.textContent = '【摘要】\n' + data.summary;
            bookViewSummary.classList.remove('hidden');
        }
        bookViewContent.textContent = data.content || '（本书尚未上传正文）';
    } catch (e) {
        bookViewTitle.textContent = '书籍正文';
        bookViewContent.textContent = '网络错误，请重试';
    }
}

async function openChapters(bookId) {
    chaptersTitle.textContent = '章节阅读';
    chaptersList.innerHTML = '<div class="chapter-empty">加载中...</div>';
    chapterContent.innerHTML = '<div class="chapter-empty">请从左侧选择章节</div>';
    chaptersModal.classList.remove('hidden');
    try {
        const res = await fetch('/api/books/' + bookId + '/chapters');
        const data = await res.json();
        if (!res.ok) {
            chaptersList.innerHTML = '<div class="chapter-empty">' + (data.error || '加载失败') + '</div>';
            return;
        }
        const chapters = data.chapters || [];
        if (chapters.length === 0) {
            chaptersList.innerHTML = '<div class="chapter-empty">暂无章节</div>';
            return;
        }
        chaptersTitle.textContent = '章节阅读（共 ' + chapters.length + ' 章）';
        chaptersList.innerHTML = '';
        chapters.forEach(ch => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'chapter-item';
            item.dataset.bookId = bookId;
            item.dataset.index = ch.index;
            item.textContent = ch.title;
            chaptersList.appendChild(item);
        });
    } catch (e) {
        chaptersList.innerHTML = '<div class="chapter-empty">网络错误，请重试</div>';
    }
}

async function loadChapter(bookId, index) {
    chapterContent.innerHTML = '<div class="chapter-empty">加载中...</div>';
    try {
        const res = await fetch('/api/books/' + bookId + '/chapters/' + index);
        const data = await res.json();
        if (res.ok) {
            chapterContent.innerHTML = '';
            const title = document.createElement('h3');
            title.className = 'chapter-content-title';
            title.textContent = data.title;
            const body = document.createElement('div');
            body.className = 'chapter-content-text';
            body.textContent = data.content;
            chapterContent.appendChild(title);
            chapterContent.appendChild(body);
        } else {
            chapterContent.innerHTML = '<div class="chapter-empty">' + (data.error || '加载失败') + '</div>';
        }
    } catch (e) {
        chapterContent.innerHTML = '<div class="chapter-empty">网络错误，请重试</div>';
    }
}

async function renderStudioList() {
    studioListView.classList.remove('hidden');
    studioFormView.classList.add('hidden');
    studioTitle.textContent = '我的创作';
    studioList.innerHTML = '<div class="studio-loading">加载中...</div>';
    try {
        const res = await fetch('/api/my_books');
        const data = await res.json();
        if (!res.ok) {
            studioList.innerHTML = '<div class="studio-empty">' + (data.error || '加载失败') + '</div>';
            return;
        }
        const books = data.books || [];
        if (books.length === 0) {
            studioList.innerHTML = '<div class="studio-empty">还没有作品，点击上方“新建作品”开始创作吧</div>';
            return;
        }
        studioList.innerHTML = '';
        books.forEach(b => {
            const item = document.createElement('div');
            item.className = 'studio-item';

            const info = document.createElement('div');
            info.className = 'studio-item-info';
            const title = document.createElement('div');
            title.className = 'studio-item-title';
            title.textContent = b.title;
            const meta = document.createElement('div');
            meta.className = 'studio-item-meta';
            const metaParts = [];
            if (b.author) metaParts.push(b.author);
            if (b.description) metaParts.push(b.description.slice(0, 40));
            if (b.has_content) metaParts.push('📄 已上传正文');
            meta.textContent = metaParts.join(' · ');
            info.appendChild(title);
            info.appendChild(meta);

            const actions = document.createElement('div');
            actions.className = 'studio-item-actions';
            const editBtn = document.createElement('button');
            editBtn.className = 'studio-item-btn';
            editBtn.type = 'button';
            editBtn.textContent = '编辑';
            if (b.locked) {
                editBtn.disabled = true;
                editBtn.title = '这本书已锁定，不能在网页端编辑';
            } else {
                editBtn.addEventListener('click', () => loadStudioForm(b.id));
            }
            const delBtn = document.createElement('button');
            delBtn.className = 'studio-item-btn danger';
            delBtn.type = 'button';
            delBtn.textContent = '删除';
            delBtn.addEventListener('click', () => deleteBook(b.id, b.title));
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);

            item.appendChild(info);
            item.appendChild(actions);
            studioList.appendChild(item);
        });
    } catch (e) {
        studioList.innerHTML = '<div class="studio-empty">网络错误，请重试</div>';
    }
}

function showStudioForm(book) {
    studioListView.classList.add('hidden');
    studioFormView.classList.remove('hidden');
    editingBookId = book ? book.id : null;
    studioTitle.textContent = book ? '编辑作品' : '新建作品';
    bookTitleInput.value = book ? (book.title || '') : '';
    bookAuthorInput.value = book ? (book.author || '') : '';
    bookDescInput.value = book ? (book.description || '') : '';
    bookContentInput.value = book ? (book.content || '') : '';
    useContentCheck.checked = book ? !!book.use_content_in_chat : false;
    useChapterRetrievalCheck.checked = book ? !!book.use_chapter_retrieval : false;
    bookSummaryInput.value = book ? (book.summary || '') : '';
    generateSummaryBtn.disabled = !editingBookId;
    pendingCover = null;
    removeCoverFlag = false;
    if (coverPreview) {
        if (book && book.has_cover) {
            coverPreview.src = '/api/books/' + book.id + '/cover';
            coverPreview.classList.remove('hidden');
        } else {
            coverPreview.removeAttribute('src');
            coverPreview.classList.add('hidden');
        }
    }
    charEditorList.innerHTML = '';
    studioError.textContent = '';
    const chars = book && book.characters ? book.characters : [];
    if (chars.length) {
        chars.forEach(c => addCharEditorCard(c.name, c.content));
    } else {
        addCharEditorCard('', '');
    }
}

async function loadStudioForm(bookId) {
    try {
        const res = await fetch('/api/books/' + bookId);
        const data = await res.json();
        if (res.ok) {
            showStudioForm(data);
        } else {
            alert(data.error || '加载失败');
        }
    } catch (e) {
        alert('网络错误，请重试');
    }
}

function addCharEditorCard(name, content) {
    const wrap = document.createElement('div');
    wrap.className = 'char-editor-card';

    const top = document.createElement('div');
    top.className = 'char-editor-top';
    const nameInput = document.createElement('input');
    nameInput.className = 'char-name-input';
    nameInput.type = 'text';
    nameInput.placeholder = '人物名（如：林黛玉）';
    nameInput.value = name || '';
    const del = document.createElement('button');
    del.className = 'char-del-btn';
    del.type = 'button';
    del.textContent = '删除';
    del.addEventListener('click', () => wrap.remove());
    top.appendChild(nameInput);
    top.appendChild(del);

    const ta = document.createElement('textarea');
    ta.className = 'char-content-input';
    ta.placeholder = '在这里填写人物设定（可用 Markdown）……';
    ta.value = content || '';

    wrap.appendChild(top);
    wrap.appendChild(ta);
    charEditorList.appendChild(wrap);
}

function collectCharacters() {
    const chars = [];
    charEditorList.querySelectorAll('.char-editor-card').forEach(card => {
        const name = card.querySelector('.char-name-input').value.trim();
        const content = card.querySelector('.char-content-input').value;
        if (name) {
            chars.push({ name, content });
        }
    });
    return chars;
}

async function saveBook() {
    const title = bookTitleInput.value.trim();
    if (!title) {
        studioError.textContent = '请填写书名';
        return;
    }
    const characters = collectCharacters();
    if (characters.length === 0) {
        studioError.textContent = '请至少设置一个人物';
        return;
    }
    studioError.textContent = '';
    const payload = {
        title: title,
        author: bookAuthorInput.value.trim(),
        description: bookDescInput.value.trim(),
        content: bookContentInput.value,
        use_content_in_chat: useContentCheck.checked,
        use_chapter_retrieval: useChapterRetrievalCheck.checked,
        cover: pendingCover || '',
        cover_remove: removeCoverFlag,
        characters: characters
    };
    const url = editingBookId ? '/api/books/' + editingBookId : '/api/books';
    const method = editingBookId ? 'PUT' : 'POST';
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            closeStudio();
            await refreshBooks();
        } else {
            studioError.textContent = data.error || '保存失败';
        }
    } catch (e) {
        studioError.textContent = '网络错误，请重试';
    }
}

async function generateSummary() {
    if (!editingBookId) {
        studioError.textContent = '请先保存作品，再生成摘要';
        return;
    }
    const btn = generateSummaryBtn;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '生成中...';
    studioError.textContent = '';
    try {
        const res = await fetch('/api/books/' + editingBookId + '/summary', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            bookSummaryInput.value = data.summary || '';
            studioError.textContent = '摘要已生成并保存';
        } else {
            studioError.textContent = data.error || '生成失败';
        }
    } catch (e) {
        studioError.textContent = '网络错误，请重试';
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function deleteBook(bookId, title) {
    if (!confirm('确定删除《' + title + '》吗？系统会先自动备份一份，可在 backups 文件夹找回。')) return;
    try {
        const res = await fetch('/api/books/' + bookId, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            if (selectedBookId === bookId) {
                selectedBookId = null;
                if (characterBar) characterBar.innerHTML = '';
                if (chatHeader) chatHeader.textContent = '请选择一本你创作的书';
            }
            await refreshBooks();
        } else {
            alert(data.error || '删除失败');
        }
    } catch (e) {
        alert('网络错误，请重试');
    }
}

// ---------- 事件绑定 ----------
document.addEventListener('click', function(e) {
    const charBtn = e.target.closest('.char-btn');
    if (!charBtn) return;
    const bookId = charBtn.dataset.bookId;
    const charName = charBtn.dataset.charName;
    const book = booksData.find(function(b) { return b.id === bookId; });
    selectCharacter(bookId, charName, book ? book.title : '');
});

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.view-book-btn');
    if (btn) openBookView(btn.dataset.bookId);
});

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.view-chapters-btn');
    if (btn) openChapters(btn.dataset.bookId);
});

conversationList.addEventListener('click', function(e) {
    const del = e.target.closest('.conversation-delete');
    if (del) {
        e.stopPropagation();
        if (state.activeGroup) deleteGroupSession(del.dataset.sessionId);
        else deleteSession(del.dataset.sessionId);
        return;
    }
    const item = e.target.closest('.conversation-item');
    if (item) {
        if (state.activeGroup) openGroupSession(item.dataset.sessionId);
        else openSession(item.dataset.sessionId);
    }
});

groupCharList.addEventListener('click', function(e) {
    const chip = e.target.closest('.group-char-chip');
    if (!chip) return;
    chip.classList.toggle('selected');
    updateGroupConfirm();
});

groupBookSelect.addEventListener('change', renderGroupCharList);
chaptersList.addEventListener('click', function(e) {
    const item = e.target.closest('.chapter-item');
    if (!item) return;
    chaptersList.querySelectorAll('.chapter-item').forEach(b => b.classList.remove('active'));
    item.classList.add('active');
    loadChapter(item.dataset.bookId, item.dataset.index);
});
newChatBtn.addEventListener('click', newChat);
groupChatBtn.addEventListener('click', openGroupModal);
groupConfirm.addEventListener('click', confirmGroup);
document.getElementById('group-modal-close').addEventListener('click', function() {
    groupModal.classList.add('hidden');
});
document.getElementById('group-cancel').addEventListener('click', function() {
    groupModal.classList.add('hidden');
});
groupModal.addEventListener('click', function(e) {
    if (e.target === groupModal) groupModal.classList.add('hidden');
});

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

studioSettingsBtn.addEventListener('click', openSettings);
studioLogoutBtn.addEventListener('click', logout);
if (heroUserEl) {
    heroUserEl.addEventListener('click', function () {
        if (currentUser && logoutModal) {
            logoutModal.classList.remove('hidden');
        }
    });
}
if (logoutCancel) {
    logoutCancel.addEventListener('click', function () {
        if (logoutModal) logoutModal.classList.add('hidden');
    });
}
if (logoutConfirm) {
    logoutConfirm.addEventListener('click', async function () {
        if (logoutModal) logoutModal.classList.add('hidden');
        await logout();
    });
}
settingsSaveBtn.addEventListener('click', function() {
    saveSettings(false);
});
settingsClearBtn.addEventListener('click', function() {
    saveSettings(true);
});
authToggle.addEventListener('click', function() {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
});
authSubmit.addEventListener('click', submitAuth);
authPassword.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') submitAuth();
});

document.querySelectorAll('.modal-close').forEach(function(btn) {
    btn.addEventListener('click', function() {
        const id = btn.dataset.close;
        if (id) document.getElementById(id).classList.add('hidden');
    });
});
loginModal.addEventListener('click', function(e) {
    if (e.target === loginModal) closeLoginModal();
});
settingsModal.addEventListener('click', function(e) {
    if (e.target === settingsModal) closeSettings();
});
studioModal.addEventListener('click', function(e) {
    if (e.target === studioModal) closeStudio();
});
bookViewModal.addEventListener('click', function(e) {
    if (e.target === bookViewModal) bookViewModal.classList.add('hidden');
});
chaptersModal.addEventListener('click', function(e) {
    if (e.target === chaptersModal) chaptersModal.classList.add('hidden');
});

studioNewBtn.addEventListener('click', function() {
    showStudioForm(null);
});
if (newBookBtn) {
    newBookBtn.addEventListener('click', openStudioNew);
}
if (manageBooksBtn) {
    manageBooksBtn.addEventListener('click', openStudio);
}
if (uploadCoverBtn) {
    uploadCoverBtn.addEventListener('click', function () {
        if (coverFileInput) coverFileInput.click();
    });
}
if (coverFileInput) {
    coverFileInput.addEventListener('change', function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
            pendingCover = String(reader.result || '');
            removeCoverFlag = false;
            if (coverPreview) {
                coverPreview.src = pendingCover;
                coverPreview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
        coverFileInput.value = '';
    });
}
if (removeCoverBtn) {
    removeCoverBtn.addEventListener('click', function () {
        pendingCover = null;
        removeCoverFlag = true;
        if (coverPreview) {
            coverPreview.removeAttribute('src');
            coverPreview.classList.add('hidden');
        }
    });
}
addCharBtn.addEventListener('click', function() {
    addCharEditorCard('', '');
});
studioBackBtn.addEventListener('click', renderStudioList);
studioSaveBtn.addEventListener('click', saveBook);
generateSummaryBtn.addEventListener('click', generateSummary);
uploadBookBtn.addEventListener('click', function() {
    bookFileInput.click();
});
bookFileInput.addEventListener('change', function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function() {
        bookContentInput.value = String(reader.result || '');
    };
    reader.readAsText(file, 'utf-8');
    bookFileInput.value = '';
});

// ---------- 页面加载时恢复 ----------
window.addEventListener('load', function() {
    fetchMe();
    loadState();

    if (state.activeGroup && state.activeGroup.bookId) {
        let session = getGroupSessions(state.activeGroup.bookId).find(s => s.id === state.activeGroup.sessionId);
        if (!session) session = getSortedGroupSessions(state.activeGroup.bookId)[0];
        if (session) {
            state.activeGroup.sessionId = session.id;
            chatHeader.textContent = '👥 群聊：' + session.characters.join('、');
            setChatReady(true);
            newChatBtn.disabled = true;
            renderConversationList();
            renderGroupSession(session);
            saveState();
            return;
        }
        state.activeGroup = null;
    }

    if (state.active && state.active.bookId && state.active.charName) {
        const book = booksData.find(function (b) { return b.id === state.active.bookId; });
        if (book) {
            selectBook(book.id);
            const bookTitle = book.title;
            state.active.bookTitle = bookTitle;
            highlightChar(state.active.bookId, state.active.charName);
            setChatHeader(book, state.active.charName);
            setChatReady(true);
            newChatBtn.disabled = false;
            renderConversationList();

            const sessions = getSessions(state.active.bookId, state.active.charName);
            let session = sessions.find(s => s.id === state.active.sessionId);
            if (!session) session = getSortedSessions(state.active.bookId, state.active.charName)[0];

            if (session) {
                state.active.sessionId = session.id;
                renderConversationList();
                renderSession(session);
            } else {
                state.active.sessionId = null;
                showWelcome();
            }
            saveState();
            return;
        }
    }

    setChatReady(false);
    newChatBtn.disabled = true;
});

// ---------- 首屏交互：剪影悬浮气泡 ----------
(function () {
    const hotspot = document.getElementById('silhouette-hotspot');
    const bubbles = document.getElementById('hero-bubbles');
    const loginBubble = document.getElementById('hero-login-bubble');
    if (!hotspot || !bubbles) return;

    function show() {
        if (typeof heroReady === 'function' && !heroReady()) return;
        bubbles.classList.add('show');
    }

    hotspot.addEventListener('mouseenter', show);
    bubbles.addEventListener('mouseenter', show);

    if (loginBubble) {
        loginBubble.addEventListener('click', function () {
            if (typeof onHeroLoginClick === 'function') onHeroLoginClick();
        });
    }

    const startChat = document.getElementById('hero-start-chat');
    const startCreate = document.getElementById('hero-start-create');
    if (startChat) {
        startChat.addEventListener('click', function () {
            if (typeof heroReady === 'function' && !heroReady()) { openLoginModal(); return; }
            enterApp('all');
        });
    }
    if (startCreate) {
        startCreate.addEventListener('click', function () {
            if (typeof heroReady === 'function' && !heroReady()) { openLoginModal(); return; }
            if (typeof startCreateMode === 'function') startCreateMode();
        });
    }
})();

// ---------- 主界面：书架 / 人物栏 / 主题 / 翻书 ----------
let booksData = (window.__BOOKS__ || []);
let appMode = 'all';        // all = 全部书籍；mine = 我创作的书
let pendingMine = false;    // 登录后是否进入创作模式
let pendingCover = null;    // 新上传的封面（data URL）
let removeCoverFlag = false;
let hasApiKey = false;      // 当前用户是否已配置自己的 API Key

async function loadApiKeyState() {
    try {
        const res = await fetch('/api/llm_settings');
        if (res.ok) {
            const data = await res.json();
            hasApiKey = !!data.api_key_set;
        } else {
            hasApiKey = false;
        }
    } catch (e) {
        hasApiKey = false;
    }
    updateHeroAuth();
}

function heroReady() {
    return !!currentUser && hasApiKey;
}

function onHeroLoginClick() {
    if (currentUser && !hasApiKey) {
        openSettings();
        return;
    }
    if (!currentUser) {
        openLoginModal();
    }
}

function updateHeroAuth() {
    const loginBubble = document.getElementById('hero-login-bubble');
    const userEl = document.getElementById('hero-user');
    if (userEl) {
        if (currentUser) {
            userEl.textContent = '👤 ' + currentUser;
            userEl.classList.remove('hidden');
        } else {
            userEl.classList.add('hidden');
        }
    }
    if (loginBubble) {
        loginBubble.classList.toggle('hidden', heroReady());
    }
    if (!heroReady()) {
        const bubbles = document.getElementById('hero-bubbles');
        if (bubbles) bubbles.classList.remove('show');
    }
}

const SOFT_THEMES = ['theme-rose', 'theme-sky', 'theme-lilac', 'theme-mint', 'theme-clay', 'theme-slate'];
const ALL_THEME_CLASSES = SOFT_THEMES.concat(['theme-gufeng', 'theme-auto']);

function hashStr(s) {
    let h = 0;
    s = String(s || '');
    for (let i = 0; i < s.length; i++) {
        h = (h * 31 + s.charCodeAt(i)) % 1000000007;
    }
    return h;
}

function bookThemeName(book) {
    if (!book) return '';
    const t = book.theme;
    if (t === 'default') return '';
    if (t) return t;
    return SOFT_THEMES[hashStr(book.id) % SOFT_THEMES.length];
}

let selectedBookId = null;

function currentBooks() {
    let list = booksData;
    if (appMode === 'mine' && currentUser) {
        list = booksData.filter(function (b) {
            return b.owner === currentUser || b.show_in_studio;
        });
    }
    // 按“放置时间”先后排列（没有时间的排最后）
    return list.slice().sort(function (a, b) {
        const at = a.created_at || 9999999999;
        const bt = b.created_at || 9999999999;
        return at - bt;
    });
}

function initShelf() {
    if (!shelfViewport) return;
    shelfViewport.innerHTML = '';
    const list = currentBooks();

    list.forEach(function (book, i) {
        const slot = document.createElement('div');
        slot.className = 'shelf-slot';

        const area = document.createElement('div');
        area.className = 'shelf-book-area';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'shelf-book';
        btn.dataset.bookId = book.id;
        btn.title = book.title || '';

        const span = document.createElement('span');
        span.textContent = book.title || '';

        const img = document.createElement('img');
        img.className = 'shelf-book-cover';
        img.alt = '';
        img.src = '/api/books/' + book.id + '/cover';
        img.addEventListener('load', function () { span.style.display = 'none'; });
        img.addEventListener('error', function () { img.remove(); });

        btn.appendChild(img);
        btn.appendChild(span);
        btn.addEventListener('click', function () {
            selectBook(book.id);
        });
        area.appendChild(btn);

        const board = document.createElement('div');
        board.className = 'shelf-board';

        slot.appendChild(area);
        slot.appendChild(board);
        shelfViewport.appendChild(slot);
    });

    document.querySelectorAll('.shelf-book').forEach(function (el) {
        el.classList.toggle('active', el.dataset.bookId === selectedBookId);
    });
}

function selectBook(bookId) {
    const book = booksData.find(function (b) { return b.id === bookId; });
    if (!book) return;
    selectedBookId = bookId;

    document.querySelectorAll('.shelf-book').forEach(function (el) {
        el.classList.toggle('active', el.dataset.bookId === bookId);
    });

    renderCharacterBar(book);
    applyBookTheme(book);
    setChatHeader(book, null);
}

function makeBarBtn(cls, text, bookId) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.dataset.bookId = bookId;
    b.textContent = text;
    return b;
}

function setChatHeader(book, charName) {
    if (!chatHeader) return;
    chatHeader.innerHTML = '';
    if (!book) {
        chatHeader.textContent = '请从左侧选择一本书';
        return;
    }
    const img = document.createElement('img');
    img.className = 'chat-header-cover';
    img.alt = '';
    img.src = '/api/books/' + book.id + '/cover';
    img.addEventListener('error', function () { img.remove(); });
    chatHeader.appendChild(img);

    const span = document.createElement('span');
    span.textContent = (book.title || '') + (charName ? (' → 🎭 ' + charName) : '');
    chatHeader.appendChild(span);
}

function renderCharacterBar(book) {
    if (!characterBar) return;
    characterBar.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'char-bar-head';

    const title = document.createElement('span');
    title.className = 'char-bar-title';
    title.textContent = book.title + (book.author ? ' · ' + book.author : '');
    head.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'char-bar-actions';
    if (book.has_content) {
        actions.appendChild(makeBarBtn('view-book-btn', '📖 正文', book.id));
    }
    if (book.has_chapters) {
        actions.appendChild(makeBarBtn('view-chapters-btn', '📚 章节', book.id));
    }
    head.appendChild(actions);
    characterBar.appendChild(head);

    const groups = book.groups || [];
    if (!groups.length) return;

    const tabs = document.createElement('div');
    tabs.className = 'char-tabs';
    const chips = document.createElement('div');
    chips.className = 'char-chips';

    let activeIndex = 0;

    function renderChips() {
        chips.innerHTML = '';
        const group = groups[activeIndex];
        if (!group) return;
        (group.characters || []).forEach(function (c) {
            const cb = document.createElement('button');
            cb.type = 'button';
            cb.className = 'char-btn' + (c.role === '主子' ? ' master' : '');
            cb.dataset.bookId = book.id;
            cb.dataset.charName = c.name;
            cb.textContent = c.name;
            chips.appendChild(cb);
        });
    }

    groups.forEach(function (group, i) {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'char-tab' + (i === 0 ? ' active' : '');
        tab.textContent = group.name || ('组' + (i + 1));
        tab.addEventListener('click', function () {
            activeIndex = i;
            tabs.querySelectorAll('.char-tab').forEach(function (t, idx) {
                t.classList.toggle('active', idx === i);
            });
            renderChips();
        });
        tabs.appendChild(tab);
    });

    renderChips();
    characterBar.appendChild(tabs);
    characterBar.appendChild(chips);
}

function applyBookTheme(book) {
    ALL_THEME_CLASSES.forEach(function (c) {
        document.body.classList.remove(c);
    });
    const theme = bookThemeName(book);
    if (theme) {
        document.body.classList.add(theme);
        if (SOFT_THEMES.indexOf(theme) !== -1) {
            document.body.classList.add('theme-auto');
        }
    }
}

function updateTools() {
    if (toolsNormal) toolsNormal.classList.toggle('hidden', appMode === 'mine');
    if (toolsStudio) toolsStudio.classList.toggle('hidden', appMode !== 'mine');
}

function enterApp(mode) {
    appMode = (mode === 'mine') ? 'mine' : 'all';
    document.body.classList.add('entered');
    updateTools();
    initShelf();
    resetChatView(appMode === 'mine' ? '请选择一本你创作的书' : '请从左侧选择一本书');
    const list = currentBooks();
    if (list.length) {
        selectBook(list[0].id);
    }
    window.scrollTo(0, 0);
}

function resetChatView(titleText) {
    state.active = null;
    state.activeGroup = null;
    if (characterBar) characterBar.innerHTML = '';
    if (chatHeader) chatHeader.textContent = titleText;
    if (messagesContainer) {
        messagesContainer.innerHTML = '<div class="welcome-msg">选一本书，再选一个人物，就可以开始对话了。</div>';
    }
    clearCharHighlight();
    setChatReady(false);
    if (newChatBtn) newChatBtn.disabled = true;
    applyBookTheme(null);
    renderConversationList();
    saveState();
}

function startCreateMode() {
    if (!currentUser) {
        pendingMine = true;
        openLoginModal();
        return;
    }
    enterApp('mine');
}

async function refreshBooks() {
    try {
        const res = await fetch('/api/books');
        const data = await res.json();
        if (res.ok && Array.isArray(data.books)) {
            booksData = data.books;
        }
    } catch (e) {}
    updateTools();
    initShelf();
}

async function openStudioNew() {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    studioModal.classList.remove('hidden');
    showStudioForm(null);
}

function backToHero() {
    document.body.classList.add('no-hero-anim');
    document.body.classList.remove('entered');
    window.scrollTo(0, 0);
}

const backBtn = document.getElementById('back-btn');
if (backBtn) {
    backBtn.addEventListener('click', backToHero);
}

initShelf();
