
(function () {
    const { ref, reactive, computed, watch, onMounted, nextTick } = Vue;

    const SupportView = {
        name: 'SupportView',
        props: {
            trackingCode: {
                type: String,
                default: ''
            },
            initialTrackingCode: {
                type: String,
                default: ''
            }
        },
        emits: ['navigate-tab'],
        setup(props, { emit }) {
            const currentUser = computed(() => (typeof Auth !== 'undefined' ? Auth.getUser() : null));
            const isStaffUser = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasRole('ROLE_CS') || Auth.hasRole('ROLE_ADMIN');
            });

            const currentSubTab = ref('create');

            const stats = reactive({
                total: 0,
                open: 0,
                inProgress: 0,
                resolved: 0
            });

            const formData = reactive({
                trackingCode: props.trackingCode || props.initialTrackingCode || '',
                creatorName: '',
                creatorPhone: '',
                creatorEmail: '',
                category: 'DAMAGED_GOODS',
                priority: 'NORMAL',
                title: '',
                description: ''
            });

            const shipmentInfo = ref(null);
            const isCheckingShipment = ref(false);
            const isSubmittingTicket = ref(false);

            const syncUserDataToForm = () => {
                if (currentUser.value) {
                    formData.creatorName = currentUser.value.fullName || currentUser.value.username || '';
                    formData.creatorPhone = currentUser.value.phoneNumber || '';
                    formData.creatorEmail = currentUser.value.email || '';
                }
            };

            const checkShipment = async () => {
                const code = formData.trackingCode.trim().toUpperCase();
                if (!code) {
                    if (window.Utils?.showToast) window.Utils.showToast('Thiếu Thông Tin', 'Vui lòng nhập mã vận đơn cần kiểm tra', 'warning');
                    return;
                }
                isCheckingShipment.value = true;
                shipmentInfo.value = null;
                try {
                    let shipment = null;
                    if (typeof ShipmentService !== 'undefined' && ShipmentService.getByCode) {
                        shipment = await ShipmentService.getByCode(code);
                    }
                    if (!shipment) {
                        const res = await Api.get(`/api/tracking/${encodeURIComponent(code)}`, {}, { silent: true, skip403Toast: true });
                        if (res && res.ok) {
                            const status = await res.json();
                            if (status && (status.trackingCode || status.currentStatus)) {
                                shipment = {
                                    trackingCode: status.trackingCode || code,
                                    status: status.currentStatus || status.status || ''
                                };
                            }
                        }
                    }
                    if (shipment && (shipment.trackingCode || shipment.id)) {
                        shipmentInfo.value = {
                            ...shipment,
                            trackingCode: shipment.trackingCode || code,
                            status: shipment.status || shipment.currentStatus || ''
                        };
                        if (!formData.title) {
                            formData.title = `Khiếu nại sự cố bưu phẩm ${code}`;
                        }
                    } else if (window.Utils?.showToast) {
                        window.Utils.showToast('Không tìm thấy đơn', `Không có bưu gửi với mã ${code}. Bạn vẫn có thể gửi khiếu nại nếu chắc mã này đúng.`, 'warning');
                    }
                } catch (e) {
                    shipmentInfo.value = null;
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Không tìm thấy đơn', `Không có bưu gửi với mã ${code}. Bạn vẫn có thể gửi khiếu nại nếu chắc mã này đúng.`, 'warning');
                    }
                } finally {
                    isCheckingShipment.value = false;
                }
            };

            const submitTicket = async () => {
                if (!formData.trackingCode.trim()) {
                    if (window.Utils?.showToast) window.Utils.showToast('Lỗi', 'Vui lòng nhập mã vận đơn', 'warning');
                    return;
                }
                if (!formData.creatorName.trim() || !formData.creatorPhone.trim()) {
                    if (window.Utils?.showToast) window.Utils.showToast('Lỗi', 'Vui lòng nhập họ tên và số điện thoại liên hệ', 'warning');
                    return;
                }
                if (!formData.title.trim() || !formData.description.trim()) {
                    if (window.Utils?.showToast) window.Utils.showToast('Lỗi', 'Vui lòng nhập tiêu đề và mô tả sự cố', 'warning');
                    return;
                }

                isSubmittingTicket.value = true;
                try {
                    const payload = {
                        trackingCode: formData.trackingCode.trim().toUpperCase(),
                        creatorName: formData.creatorName.trim(),
                        creatorPhone: formData.creatorPhone.trim(),
                        creatorEmail: formData.creatorEmail.trim() || null,
                        category: formData.category,
                        priority: formData.priority,
                        title: formData.title.trim(),
                        description: formData.description.trim()
                    };

                    const result = await SupportService.createTicket(payload);
                    if (window.Utils?.showToast) {
                        window.Utils.showToast(
                            'Gửi Thành Công',
                            `Hồ sơ khiếu nại ${result.ticketCode} đã được tiếp nhận!`,
                            'success'
                        );
                    }

                        saveGuestHistory(result);

                        searchCode.value = result.ticketCode;
                    activeTicket.value = result;
                    currentSubTab.value = 'lookup';
                    await loadMyTickets();
                    await refreshStats();
                } catch (err) {
                    if (window.Utils?.showToast) window.Utils.showToast('Thất Bại', err.message, 'error');
                } finally {
                    isSubmittingTicket.value = false;
                }
            };

            const searchCode = ref('');
            const isSearching = ref(false);
            const myTickets = ref([]);
            const guestHistory = ref([]);
            const activeTicket = ref(null);
            const chatInput = ref('');
            const isSendingMessage = ref(false);
            const chatBoxRef = ref(null);

            const selectedAttachmentUrl = ref(null);
            const isUploadingAttachment = ref(false);

            const handleAttachmentUpload = async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                if (file.size > 10 * 1024 * 1024) {
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Tệp Quá Dung Lượng', 'Vui lòng chọn ảnh có kích thước dưới 10MB', 'warning');
                    }
                    event.target.value = '';
                    return;
                }

                if (!file.type.startsWith('image/')) {
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Định Dạng Không Hợp Lệ', 'Hệ thống chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP)', 'warning');
                    }
                    event.target.value = '';
                    return;
                }

                isUploadingAttachment.value = true;
                try {
                    const result = await SupportService.uploadAttachment(file);
                    selectedAttachmentUrl.value = result.url;
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Tải Ảnh Thành Công', 'Ảnh đã sẵn sàng đính kèm vào tin nhắn.', 'success');
                    }
                } catch (err) {
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Lỗi Tải Ảnh MinIO', err.message, 'error');
                    }
                } finally {
                    isUploadingAttachment.value = false;
                    event.target.value = '';
                }
            };

            const removeAttachment = () => {
                selectedAttachmentUrl.value = null;
            };

            const triggerChatFileInput = () => {
                if (!activeTicket.value) {
                    if (window.Utils?.showToast) {
                        window.Utils.showToast(
                            'Chưa Chọn Hồ Sơ Khiếu Nại',
                            'Vui lòng chọn một phiếu khiếu nại trong danh sách bên trái hoặc nhập mã hồ sơ để mở cuộc hội thoại trước khi đính kèm ảnh.',
                            'warning'
                        );
                    }
                    return;
                }
                const inputEl = document.getElementById('supportChatFileInput');
                if (inputEl) inputEl.click();
            };

            const loadGuestHistory = () => {
                try {
                    const raw = localStorage.getItem('vnpt_guest_support_history');
                    guestHistory.value = raw ? JSON.parse(raw) : [];
                } catch {
                    guestHistory.value = [];
                }
            };

            const saveGuestHistory = (ticket) => {
                if (!ticket || !ticket.ticketCode) return;
                try {
                    let list = guestHistory.value.filter(t => t.ticketCode !== ticket.ticketCode);
                    list.unshift({
                        ticketCode: ticket.ticketCode,
                        trackingCode: ticket.trackingCode,
                        title: ticket.title,
                        status: ticket.status,
                        createdAt: ticket.createdAt
                    });
                    if (list.length > 5) list = list.slice(0, 5);
                    guestHistory.value = list;
                    localStorage.setItem('vnpt_guest_support_history', JSON.stringify(list));
                } catch {}
            };

            const loadMyTickets = async () => {
                if (!currentUser.value) return;
                try {
                    const list = await SupportService.getMyTickets();
                    myTickets.value = Array.isArray(list) ? list : [];
                    if (!activeTicket.value && myTickets.value.length > 0) {
                        activeTicket.value = myTickets.value[0];
                    }
                } catch (e) {
                    console.warn('[SupportView] loadMyTickets:', e.message);
                }
            };

            const handleSearch = async () => {
                const code = searchCode.value.trim().toUpperCase();
                if (!code) {
                    if (window.Utils?.showToast) window.Utils.showToast('Thiếu Mã', 'Vui lòng nhập mã TKT... hoặc WB...', 'warning');
                    return;
                }

                isSearching.value = true;
                try {
                    if (code.startsWith('TKT-') || code.startsWith('TKT')) {
                        const ticket = await SupportService.getTicketByCode(code);
                        activeTicket.value = ticket;
                        saveGuestHistory(ticket);
                    } else {
                        const list = await SupportService.getTicketsByTrackingCode(code);
                        if (list && list.length > 0) {
                            activeTicket.value = list[0];
                            saveGuestHistory(list[0]);
                        } else {
                            throw new Error(`Không tìm thấy hồ sơ khiếu nại nào gắn với mã bưu gửi ${code}`);
                        }
                    }
                    scrollToBottom();
                } catch (err) {
                    if (window.Utils?.showToast) window.Utils.showToast('Không Tìm Thấy', err.message, 'error');
                } finally {
                    isSearching.value = false;
                }
            };

            const selectActiveTicket = async (ticket) => {
                if (!ticket) return;
                try {
                    // Tải lại chi tiết để lấy tin nhắn mới nhất (ưu tiên theo ticketCode để hỗ trợ cả khách vãng lai)
                    if (ticket.ticketCode) {
                        const refreshed = await SupportService.getTicketByCode(ticket.ticketCode);
                        activeTicket.value = refreshed;
                    } else if (ticket.id) {
                        const refreshed = await SupportService.getTicketById(ticket.id);
                        activeTicket.value = refreshed;
                    } else {
                        activeTicket.value = ticket;
                    }
                    scrollToBottom();
                } catch {
                    activeTicket.value = ticket;
                    scrollToBottom();
                }
            };

            const sendMessage = async (presetText = null) => {
                const text = (presetText || chatInput.value).trim();
                const attachment = selectedAttachmentUrl.value;
                if ((!text && !attachment) || !activeTicket.value) return;

                isSendingMessage.value = true;
                try {
                    const payload = {
                        content: text || (attachment ? 'Đã gửi một hình ảnh đính kèm.' : ''),
                        attachmentUrls: attachment,
                        senderName: currentSenderName()
                    };
                    const newMsg = await SupportService.addMessage(activeTicket.value.id, payload);
                    if (!activeTicket.value.messages) activeTicket.value.messages = [];
                    activeTicket.value.messages.push(newMsg);
                    chatInput.value = '';
                    selectedAttachmentUrl.value = null;
                    scrollToBottom();
                } catch (err) {
                    if (window.Utils?.showToast) window.Utils.showToast('Lỗi Chat', err.message, 'error');
                } finally {
                    isSendingMessage.value = false;
                }
            };

            const scrollToBottom = () => {
                nextTick(() => {
                    const el = document.getElementById('chatMessagesFeed');
                    if (el) el.scrollTop = el.scrollHeight;
                });
            };

            const opsTickets = ref([]);
            const opsFilterStatus = ref('ALL');
            const opsSearchQuery = ref('');
            const isLoadingOps = ref(false);

            const showResolveModal = ref(false);
            const modalTicket = ref(null);
            const modalCompensation = ref(0);
            const modalNote = ref('');
            const modalCsReply = ref('');
            const isSubmittingResolve = ref(false);

            const loadOpsTickets = async () => {
                if (!isStaffUser.value) return;
                isLoadingOps.value = true;
                try {
                    const list = await SupportService.getAllTickets(opsFilterStatus.value, null);
                    opsTickets.value = Array.isArray(list) ? list : [];
                } catch (err) {
                    console.warn('[SupportView] loadOpsTickets error:', err.message);
                } finally {
                    isLoadingOps.value = false;
                }
            };

            const filteredOpsTickets = computed(() => {
                return opsTickets.value.filter(t => {
                    if (opsFilterStatus.value !== 'ALL' && t.status !== opsFilterStatus.value) return false;
                    if (opsSearchQuery.value.trim()) {
                        const q = opsSearchQuery.value.trim().toLowerCase();
                        const matchCode = (t.ticketCode || '').toLowerCase().includes(q);
                        const matchWb = (t.trackingCode || '').toLowerCase().includes(q);
                        const matchName = (t.creatorName || '').toLowerCase().includes(q);
                        return matchCode || matchWb || matchName;
                    }
                    return true;
                });
            });

            const handleAssignTicket = async (ticket) => {
                try {
                    const csName = currentUser.value?.fullName || 'Chuyên viên CSKH';
                    const updated = await SupportService.assignTicket(ticket.id, csName);
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Đã Tiếp Nhận', `Vé ${updated.ticketCode} đã được gán cho bạn xử lý.`, 'success');
                    }
                    await loadOpsTickets();
                    await refreshStats();
                } catch (err) {
                    if (window.Utils?.showToast) window.Utils.showToast('Lỗi', err.message, 'error');
                }
            };

            const openResolveModal = (ticket) => {
                modalTicket.value = ticket;
                modalCompensation.value = ticket.compensationAmount || 0;
                modalNote.value = ticket.resolutionNote || 'Đã xác minh trách nhiệm giao hàng. Duyệt phương án giải quyết.';
                modalCsReply.value = '';
                showResolveModal.value = true;
            };

            const closeResolveModal = () => {
                showResolveModal.value = false;
                modalTicket.value = null;
                modalAttachmentUrl.value = null;
            };

            const modalAttachmentUrl = ref(null);
            const isUploadingModalAttachment = ref(false);

            const handleModalAttachmentUpload = async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                if (file.size > 10 * 1024 * 1024) {
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Tệp Quá Dung Lượng', 'Vui lòng chọn ảnh có kích thước dưới 10MB', 'warning');
                    }
                    event.target.value = '';
                    return;
                }

                if (!file.type.startsWith('image/')) {
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Định Dạng Không Hợp Lệ', 'Hệ thống chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP)', 'warning');
                    }
                    event.target.value = '';
                    return;
                }

                isUploadingModalAttachment.value = true;
                try {
                    const result = await SupportService.uploadAttachment(file);
                    modalAttachmentUrl.value = result.url;
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Tải Ảnh Thành Công', 'Ảnh biên bản đã sẵn sàng gửi.', 'success');
                    }
                } catch (err) {
                    if (window.Utils?.showToast) {
                        window.Utils.showToast('Lỗi Tải Ảnh MinIO', err.message, 'error');
                    }
                } finally {
                    isUploadingModalAttachment.value = false;
                    event.target.value = '';
                }
            };

            const removeModalAttachment = () => {
                modalAttachmentUrl.value = null;
            };

            const handleSendCsMessageInModal = async () => {
                const text = modalCsReply.value.trim();
                const attachment = modalAttachmentUrl.value;
                if ((!text && !attachment) || !modalTicket.value) return;
                try {
                    const payload = {
                        content: text || (attachment ? 'Đã gửi hình ảnh/biên bản giải quyết.' : ''),
                        attachmentUrls: attachment,
                        senderName: currentSenderName()
                    };
                    const newMsg = await SupportService.addMessage(modalTicket.value.id, payload);
                    if (!modalTicket.value.messages) modalTicket.value.messages = [];
                    modalTicket.value.messages.push(newMsg);
                    modalCsReply.value = '';
                    modalAttachmentUrl.value = null;
                } catch (err) {
                    if (window.Utils?.showToast) window.Utils.showToast('Lỗi', err.message, 'error');
                }
            };

            const submitResolveTicket = async () => {
                if (!modalTicket.value) return;
                isSubmittingResolve.value = true;
                try {
                    const payload = {
                        compensationAmount: Number(modalCompensation.value) || 0,
                        resolutionNote: modalNote.value.trim()
                    };
                    const resolved = await SupportService.resolveTicket(modalTicket.value.id, payload);
                    if (window.Utils?.showToast) {
                        window.Utils.showToast(
                            'Đã Đóng Khiếu Nại',
                            `Vé ${resolved.ticketCode} đã được giải quyết thành công!`,
                            'success'
                        );
                    }
                    closeResolveModal();
                    await loadOpsTickets();
                    await refreshStats();
                } catch (err) {
                    if (window.Utils?.showToast) window.Utils.showToast('Lỗi', err.message, 'error');
                } finally {
                    isSubmittingResolve.value = false;
                }
            };

            const applyStats = (list) => {
                const rows = Array.isArray(list) ? list : [];
                stats.total = rows.length;
                stats.open = rows.filter(t => t.status === 'OPEN' || t.status === 'ESCALATED').length;
                stats.inProgress = rows.filter(t => t.status === 'IN_PROGRESS').length;
                stats.resolved = rows.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
            };

            const ticketsForCustomerStats = () => {
                const mine = Array.isArray(myTickets.value) ? myTickets.value : [];
                const guest = Array.isArray(guestHistory.value) ? guestHistory.value : [];
                const seen = new Set(mine.map(t => t.ticketCode));
                const combined = mine.slice();
                guest.forEach(t => {
                    if (t && t.ticketCode && !seen.has(t.ticketCode)) {
                        seen.add(t.ticketCode);
                        combined.push(t);
                    }
                });
                return combined;
            };

            const currentSenderName = () => {
                const user = currentUser.value;
                if (!user) return 'Khách hàng';
                return user.fullName || user.username || 'Khách hàng';
            };

            // Khách chỉ đếm phiếu của mình. Nhân viên mới đếm toàn hệ thống.
            const refreshStats = async () => {
                try {
                    if (isStaffUser.value) {
                        const all = await SupportService.getAllTickets('ALL');
                        applyStats(all);
                        return;
                    }
                    applyStats(ticketsForCustomerStats());
                } catch {
                    stats.total = 0;
                    stats.open = 0;
                    stats.inProgress = 0;
                    stats.resolved = 0;
                }
            };

            const formatCategory = (cat) => {
                const map = {
                    DAMAGED_GOODS: 'Hàng móp méo / Vỡ hỏng',
                    LATE_DELIVERY: 'Giao hàng trễ hẹn',
                    LOST_SHIPMENT: 'Thất lạc kiện hàng',
                    LOST_GOODS: 'Thất lạc kiện hàng',
                    CANCEL_REQUEST: 'Yêu cầu hủy đơn',
                    COD_DISCREPANCY: 'Sai lệch tiền COD',
                    STAFF_ATTITUDE: 'Thái độ phục vụ',
                    OTHER: 'Yêu cầu khác'
                };
                return map[cat] || cat || 'Hỗ trợ khác';
            };

            const formatPriorityBadge = (p) => {
                if (p === 'URGENT') return 'bg-rose-50 text-rose-700 border-rose-200';
                if (p === 'HIGH') return 'bg-amber-50 text-amber-700 border-amber-200';
                return 'bg-blue-50 text-blue-700 border-blue-200';
            };

            const formatStatusBadge = (s) => {
                if (s === 'OPEN') return 'bg-blue-50 text-blue-700 border-blue-200';
                if (s === 'ESCALATED') return 'bg-rose-50 text-rose-700 border-rose-300 font-semibold';
                if (s === 'IN_PROGRESS') return 'bg-amber-50 text-amber-700 border-amber-200';
                if (s === 'RESOLVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (s === 'REJECTED') return 'bg-rose-50 text-rose-700 border-rose-200';
                return 'bg-slate-100 text-slate-700 border-slate-200';
            };

            const formatStatusText = (s) => {
                if (s === 'OPEN') return 'Mới Tiếp Nhận';
                if (s === 'ESCALATED') return 'Quá Hạn SLA';
                if (s === 'IN_PROGRESS') return 'Đang Thẩm Định';
                if (s === 'RESOLVED') return 'Đã Giải Quyết';
                if (s === 'REJECTED') return 'Từ Chối';
                if (s === 'CLOSED') return 'Đã Đóng';
                if (window.Utils && typeof window.Utils.formatStatusText === 'function') {
                    return window.Utils.formatStatusText(s);
                }
                return s || 'Chưa rõ';
            };

            const formatShipmentBadge = (s) => {
                if (s === 'OPEN' || s === 'IN_PROGRESS' || s === 'RESOLVED' || s === 'CLOSED') {
                    return formatStatusBadge(s);
                }
                if (window.Utils && typeof window.Utils.getStatusBadgeClass === 'function') {
                    return window.Utils.getStatusBadgeClass(s);
                }
                return formatStatusBadge(s);
            };

            const formatCurrency = (amt) => {
                return (Number(amt) || 0).toLocaleString('vi-VN') + ' đ';
            };

            const formatTime = (isoString) => {
                if (!isoString) return '';
                try {
                    const d = new Date(isoString);
                    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
                           d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                } catch {
                    return isoString;
                }
            };

            watch(opsFilterStatus, () => {
                if (isStaffUser.value && currentSubTab.value === 'ops') {
                    loadOpsTickets();
                }
            });

            onMounted(async () => {
                syncUserDataToForm();
                loadGuestHistory();

                if (currentUser.value) {
                    await loadMyTickets();
                }

                if (isStaffUser.value) {
                    await loadOpsTickets();
                }

                await refreshStats();

                const targetCode = props.trackingCode || props.initialTrackingCode;
                if (targetCode) {
                    formData.trackingCode = targetCode;
                    currentSubTab.value = 'create';
                    checkShipment();
                }
            });

            watch(() => props.trackingCode, (newCode) => {
                if (newCode && newCode !== formData.trackingCode) {
                    formData.trackingCode = newCode;
                    currentSubTab.value = 'create';
                    checkShipment();
                }
            });
            const selectTicketForChat = (ticket) => {
                if (!ticket) return;
                activeTicket.value = ticket;
                searchCode.value = ticket.ticketCode || '';
                currentSubTab.value = 'lookup';
                scrollToBottom();
            };

            return {
                currentUser,
                isStaffUser,
                currentSubTab,
                stats,
                formData,
                shipmentInfo,
                isCheckingShipment,
                isSubmittingTicket,
                checkShipment,
                submitTicket,
                searchCode,
                isSearching,
                myTickets,
                guestHistory,
                activeTicket,
                chatInput,
                isSendingMessage,
                handleSearch,
                selectActiveTicket,
                selectTicketForChat,
                sendMessage,
                opsTickets,
                opsFilterStatus,
                opsSearchQuery,
                isLoadingOps,
                filteredOpsTickets,
                loadOpsTickets,
                handleAssignTicket,
                showResolveModal,
                modalTicket,
                modalCompensation,
                modalNote,
                modalCsReply,
                isSubmittingResolve,
                selectedAttachmentUrl,
                isUploadingAttachment,
                handleAttachmentUpload,
                triggerChatFileInput,
                removeAttachment,
                modalAttachmentUrl,
                isUploadingModalAttachment,
                handleModalAttachmentUpload,
                removeModalAttachment,
                openResolveModal,
                closeResolveModal,
                handleSendCsMessageInModal,
                submitResolveTicket,
                formatCategory,
                formatPriorityBadge,
                formatStatusBadge,
                formatShipmentBadge,
                formatStatusText,
                formatCurrency,
                formatTime
            };
        },
        template: `
            <div class="space-y-3.5 pb-10 text-slate-800">

                <div v-if="!currentUser" class="page-header-banner rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden transition-all duration-300 hover:shadow-md">
                    <div class="flex items-start space-x-4">
                        <div class="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 flex-shrink-0 ring-4 ring-purple-100">
                            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                        </div>
                        <div>
                            <div class="flex items-center space-x-2 text-xs font-semibold text-purple-700 mb-1 whitespace-nowrap">
                                <span @click="$emit('switch-tab', 'tracking')" class="cursor-pointer hover:underline">Trang Chủ</span>
                                <span>/</span>
                                <span>Trung Tâm Hỗ Trợ</span>
                                <span>/</span>
                                <span class="text-slate-500">CSKH &amp; Khiếu Nại</span>
                            </div>
                            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight sm:whitespace-nowrap">Cổng Tiếp Nhận Hỗ Trợ &amp; Xử Lý Khiếu Nại</h1>
                            <p class="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">Tiếp nhận sự cố vận chuyển, giải quyết quyền lợi bưu chính và cam kết phản hồi đối soát bưu phẩm minh bạch.</p>
                        </div>
                    </div>

                    <div class="flex items-center space-x-3 self-start md:self-center flex-shrink-0">
                        <div class="px-4 py-2.5 rounded-2xl bg-white border border-purple-200/80 shadow-xs text-center min-w-[110px] flex-shrink-0">
                            <span class="text-[10.5px] uppercase font-bold text-slate-400 block tracking-wider whitespace-nowrap">Hotline</span>
                            <span class="text-xs sm:text-sm font-black text-purple-700 whitespace-nowrap">1900 54 54 81</span>
                        </div>
                        <div class="px-4 py-2.5 rounded-2xl bg-white border border-purple-200/80 shadow-xs text-center min-w-[110px] flex-shrink-0">
                            <span class="text-[10.5px] uppercase font-bold text-slate-400 block tracking-wider whitespace-nowrap">Cam Kết CSKH</span>
                            <span class="text-xs sm:text-sm font-black text-emerald-600 whitespace-nowrap">Phản Hồi &lt; 2h</span>
                        </div>
                    </div>
                </div>

                <div v-else class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden transition-all duration-300">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                    CSKH &amp; Helpdesk
                                </span>
                                <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Cổng Tiếp Nhận Hỗ Trợ &amp; Xử Lý Khiếu Nại Bưu Gửi
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Tiếp nhận sự cố vận chuyển, giải quyết quyền lợi bưu chính và bồi hoàn trực tuyến 24/7.
                            </p>
                        </div>

                        <div class="flex items-center space-x-2 self-start sm:self-auto">
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px] transform hover:scale-105 transition">
                                <div class="text-sm sm:text-base font-bold leading-tight">{{ stats.total }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tổng Hồ Sơ</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px] transform hover:scale-105 transition">
                                <div class="text-sm sm:text-base font-bold leading-tight text-amber-300">{{ stats.open }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chờ Tiếp Nhận</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px] transform hover:scale-105 transition">
                                <div class="text-sm sm:text-base font-bold leading-tight text-blue-200">{{ stats.inProgress }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đang Xử Lý</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px] transform hover:scale-105 transition">
                                <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300">{{ stats.resolved }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đã Giải Quyết</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="b2b-card rounded-xl p-1.5 shadow-sm flex items-center justify-between overflow-x-auto">
                    <div class="flex items-center space-x-1.5">
                        
                        <button 
                            type="button"
                            @click="currentSubTab = 'create'" 
                            :class="[
                                'btn-press px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5',
                                currentSubTab === 'create' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            ]"
                        >
                            <span>Gửi Khiếu Nại Bưu Gửi</span>
                            <span class="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-white/20 text-white" v-if="currentSubTab === 'create'">Soạn vé</span>
                        </button>

                        <button 
                            type="button"
                            @click="currentSubTab = 'lookup'" 
                            :class="[
                                'btn-press px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5',
                                currentSubTab === 'lookup' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            ]"
                        >
                            <span>{{ currentUser ? 'Hồ Sơ Của Tôi & Tra Cứu' : 'Tra Cứu Hồ Sơ & Tiến Độ' }}</span>
                            <span v-if="currentUser && myTickets.length" class="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-blue-100 text-blue-700">
                                {{ myTickets.length }} hồ sơ
                            </span>
                        </button>

                        <button 
                            v-if="isStaffUser"
                            type="button"
                            @click="currentSubTab = 'ops'; loadOpsTickets();" 
                            :class="[
                                'btn-press px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5',
                                currentSubTab === 'ops' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            ]"
                        >
                            <span>Tác Nghiệp CSKH</span>
                            <span class="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                {{ stats.open }} chờ
                            </span>
                        </button>
                    </div>

                    <div class="hidden sm:flex items-center text-xs text-slate-400 font-medium pr-2">
                        <span>Tổng đài hỗ trợ 24/7: <strong class="text-blue-700 font-mono">1900 54 54 81</strong></span>
                    </div>
                </div>

                <div v-if="currentSubTab === 'create'" class="tab-content-enter grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                    
                    <div class="lg:col-span-7 b2b-card rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
                        <div class="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                    Thông Tin Phiếu Khiếu Nại Bưu Phẩm
                                </h2>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="currentUser ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'">
                                    {{ currentUser ? 'Tài Khoản Đăng Nhập' : 'Khách Vãng Lai (Nhập Thủ Công)' }}
                                </span>
                            </div>
                            <span class="text-[11px] text-slate-500 font-medium">Cam kết phản hồi trong 2 giờ</span>
                        </div>

                        <form class="space-y-3.5 text-xs" @submit.prevent="submitTicket">
                            
                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Mã Vận Đơn Bưu Chính (Tracking Code) <span class="text-rose-500">*</span>:</label>
                                <div class="flex items-center space-x-2">
                                    <input 
                                        type="text" 
                                        v-model="formData.trackingCode" 
                                        placeholder="Ví dụ: WB12345678"
                                        class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase focus:bg-white focus:border-blue-600 outline-none transition"
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        @click="checkShipment"
                                        :disabled="isCheckingShipment"
                                        class="btn-press px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition text-xs border border-slate-200 flex items-center space-x-1"
                                    >
                                        <span v-if="isCheckingShipment" class="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                                        <span>{{ isCheckingShipment ? 'Đang tra...' : 'Kiểm tra đơn' }}</span>
                                    </button>
                                </div>
                            </div>

                            <div v-if="shipmentInfo" class="tab-content-enter p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 transition-all text-[11px]">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-2">
                                        <span class="font-mono font-bold text-blue-700">{{ shipmentInfo.trackingCode }}</span>
                                        <span class="text-slate-500">Bưu gửi bưu chính</span>
                                    </div>
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border" :class="formatShipmentBadge(shipmentInfo.status)">
                                        {{ formatStatusText(shipmentInfo.status) }}
                                    </span>
                                </div>
                                <div v-if="shipmentInfo.senderName || shipmentInfo.receiverName || shipmentInfo.codAmount" class="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200/60 mt-1">
                                    <div v-if="shipmentInfo.senderName"><span class="text-slate-400">Người gửi/Chủ hàng:</span> {{ shipmentInfo.senderName }}</div>
                                    <div v-if="shipmentInfo.receiverName"><span class="text-slate-400">Người nhận:</span> {{ shipmentInfo.receiverName }}</div>
                                    <div v-if="shipmentInfo.codAmount"><span class="text-slate-400">Tiền COD:</span> {{ formatCurrency(shipmentInfo.codAmount) }}</div>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">
                                        Họ và tên người gửi khiếu nại <span class="text-rose-500">*</span>:
                                    </label>
                                    <input 
                                        type="text" 
                                        v-model="formData.creatorName" 
                                        placeholder="Nhập họ và tên..."
                                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-blue-600 outline-none transition"
                                        required
                                    />
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">
                                        Số điện thoại liên hệ <span class="text-rose-500">*</span>:
                                    </label>
                                    <input 
                                        type="tel" 
                                        v-model="formData.creatorPhone" 
                                        placeholder="Nhập số điện thoại nhận kết quả..."
                                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:border-blue-600 outline-none transition"
                                        required
                                    />
                                </div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Phân loại sự cố <span class="text-rose-500">*</span>:</label>
                                    <select v-model="formData.category" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition">
                                        <option value="DAMAGED_GOODS">Bưu phẩm bị móp méo / vỡ hỏng</option>
                                        <option value="LATE_DELIVERY">Giao hàng trễ hẹn cam kết</option>
                                        <option value="LOST_SHIPMENT">Nghi ngờ thất lạc kiện hàng</option>
                                        <option value="CANCEL_REQUEST">Yêu cầu hủy đơn</option>
                                        <option value="COD_DISCREPANCY">Sai lệch tiền thu hộ COD / Cước phí</option>
                                        <option value="STAFF_ATTITUDE">Thái độ phục vụ của bưu tá</option>
                                        <option value="OTHER">Thắc mắc hỗ trợ khác</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Mức độ khẩn cấp:</label>
                                    <select v-model="formData.priority" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition">
                                        <option value="NORMAL">Bình thường (Xử lý trong 24h)</option>
                                        <option value="HIGH">Ưu tiên cao (Xử lý trong 4h)</option>
                                        <option value="URGENT">Khẩn cấp (Hàng giá trị cao / Hỏa tốc)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Tiêu đề yêu cầu <span class="text-rose-500">*</span>:</label>
                                <input 
                                    type="text" 
                                    v-model="formData.title" 
                                    placeholder="Tóm tắt ngắn gọn sự cố..."
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-blue-600 outline-none transition"
                                    required
                                />
                            </div>

                            <div>
                                <label class="block font-semibold text-slate-700 mb-1">Mô tả sự việc chi tiết <span class="text-rose-500">*</span>:</label>
                                <textarea 
                                    v-model="formData.description" 
                                    rows="3" 
                                    placeholder="Mô tả cụ thể thời gian nhận, tình trạng bao bì, hư hỏng sản phẩm bên trong..."
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-blue-600 outline-none transition"
                                    required
                                ></textarea>
                            </div>

                            <div class="pt-2 flex items-center justify-end space-x-2">
                                <button 
                                    type="submit" 
                                    :disabled="isSubmittingTicket"
                                    class="btn-press px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
                                >
                                    <span v-if="isSubmittingTicket" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>{{ isSubmittingTicket ? 'Đang Gửi Hồ Sơ...' : 'Gửi Hồ Sơ Khiếu Nại' }}</span>
                                    <span v-if="!isSubmittingTicket">→</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div class="lg:col-span-5 space-y-3.5">
                        <div class="b2b-card rounded-xl p-4 sm:p-5 shadow-sm space-y-3 text-xs">
                            <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
                                Quy Chuẩn Tiếp Nhận &amp; Bồi Thường
                            </h2>
                            <div class="space-y-2.5 text-slate-600 text-[11px] leading-relaxed">
                                <div class="flex items-start space-x-2">
                                    <span class="font-bold text-blue-600 mt-0.5">•</span>
                                    <p><strong class="text-slate-800">Thời hạn khiếu nại:</strong> Trong vòng 48 giờ kể từ thời điểm phát hàng hoặc khi phát hiện bưu phẩm trễ quá 3 ngày so với cam kết.</p>
                                </div>
                                <div class="flex items-start space-x-2">
                                    <span class="font-bold text-blue-600 mt-0.5">•</span>
                                    <p><strong class="text-slate-800">Biên bản bàn giao:</strong> Trường hợp hàng vỡ, người nhận cần yêu cầu bưu tá lập biên bản đồng kiểm trước khi ký nhận.</p>
                                </div>
                                <div class="flex items-start space-x-2">
                                    <span class="font-bold text-blue-600 mt-0.5">•</span>
                                    <p><strong class="text-slate-800">Mức bồi hoàn:</strong> Bồi thường tối đa 100% giá trị khai giá đối với bưu phẩm có bảo hiểm bưu chính.</p>
                                </div>
                            </div>
                        </div>

                        <div class="b2b-card rounded-xl p-4 shadow-sm bg-slate-50 text-xs space-y-2">
                            <div class="font-bold text-slate-800 flex items-center justify-between">
                                <span>Kênh Hỗ Trợ Khẩn Cấp 24/7</span>
                                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            </div>
                            <p class="text-[11px] text-slate-500">Liên hệ trực tiếp tổng đài viên VNPT Post để tiếp nhận khiếu nại khẩn cấp.</p>
                            <div class="pt-1 font-mono font-bold text-blue-700 text-sm">Hotline: 1900 54 54 81 (Phím 1)</div>
                        </div>
                    </div>

                </div>

                <div v-if="currentSubTab === 'lookup'" class="tab-content-enter grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch w-full max-w-full min-w-0">
                    
                    <div class="lg:col-span-5 min-w-0 flex flex-col space-y-3">
                        
                        <div class="b2b-card rounded-xl p-3.5 shadow-xs space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                                    <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    <span>Tra Cứu Hồ Sơ Khiếu Nại</span>
                                </span>
                                <span class="text-[10px] text-slate-400 font-mono">TKT... / WB...</span>
                            </div>

                            <div class="flex items-center space-x-1.5">
                                <input 
                                    type="text" 
                                    v-model="searchCode" 
                                    @keydown.enter="handleSearch"
                                    placeholder="Nhập mã TKT... hoặc WB..."
                                    class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase focus:bg-white focus:border-blue-600 outline-none transition"
                                />
                                <button 
                                    type="button" 
                                    @click="handleSearch"
                                    :disabled="isSearching"
                                    class="btn-press px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1"
                                >
                                    <span v-if="isSearching" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>{{ isSearching ? '...' : 'Tìm' }}</span>
                                </button>
                            </div>
                        </div>

                        <div class="b2b-card rounded-xl p-3 shadow-xs space-y-2">
                            <div class="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    {{ currentUser ? 'Danh Sách Hồ Sơ Của Bạn' : 'Lịch Sử Tra Cứu Gần Đây' }}
                                    ({{ currentUser ? myTickets.length : guestHistory.length }})
                                </span>
                                <span class="text-[10px] text-blue-600 font-medium">
                                    {{ currentUser ? 'Tự động đồng bộ' : 'Lưu tại trình duyệt' }}
                                </span>
                            </div>

                            <div class="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                                <template v-if="currentUser && myTickets.length">
                                    <div 
                                        v-for="t in myTickets" 
                                        :key="t.ticketCode" 
                                        @click="selectActiveTicket(t)"
                                        :class="[
                                            'btn-press p-2.5 rounded-lg border cursor-pointer transition',
                                            activeTicket && activeTicket.ticketCode === t.ticketCode ? 'border-2 border-blue-600 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300 bg-white'
                                        ]"
                                    >
                                        <div class="flex items-center justify-between">
                                            <span class="font-mono font-bold text-blue-700 text-xs">{{ t.ticketCode }}</span>
                                            <span class="px-2 py-0.2 rounded-full text-[9.5px] font-bold border" :class="formatStatusBadge(t.status)">
                                                {{ formatStatusText(t.status) }}
                                            </span>
                                        </div>
                                        <p class="text-[11.5px] font-semibold text-slate-800 mt-1 truncate">{{ t.title }}</p>
                                        <div class="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                                            <span>{{ t.trackingCode }}</span>
                                            <span>{{ formatTime(t.createdAt) }}</span>
                                        </div>
                                    </div>
                                </template>

                                <template v-else-if="!currentUser && guestHistory.length">
                                    <div 
                                        v-for="t in guestHistory" 
                                        :key="t.ticketCode" 
                                        @click="searchCode = t.ticketCode; handleSearch();"
                                        :class="[
                                            'btn-press p-2.5 rounded-lg border cursor-pointer transition',
                                            activeTicket && activeTicket.ticketCode === t.ticketCode ? 'border-2 border-blue-600 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300 bg-white'
                                        ]"
                                    >
                                        <div class="flex items-center justify-between">
                                            <span class="font-mono font-bold text-blue-700 text-xs">{{ t.ticketCode }}</span>
                                            <span class="px-2 py-0.2 rounded-full text-[9.5px] font-bold border" :class="formatStatusBadge(t.status)">
                                                {{ formatStatusText(t.status) }}
                                            </span>
                                        </div>
                                        <p class="text-[11.5px] font-semibold text-slate-800 mt-1 truncate">{{ t.title }}</p>
                                        <div class="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                                            <span>{{ t.trackingCode }}</span>
                                            <span>{{ formatTime(t.createdAt) }}</span>
                                        </div>
                                    </div>
                                </template>

                                <div v-else class="text-center py-5 text-[11px] text-slate-400">
                                    Chưa có hồ sơ khiếu nại nào được ghi nhận.
                                </div>
                            </div>
                        </div>

                        <div v-if="activeTicket" class="b2b-card rounded-xl p-3.5 shadow-xs space-y-2.5 flex-1">
                            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div>
                                    <div class="text-[10px] text-slate-400 font-semibold uppercase">Tiến Độ Xử Lý Khiếu Nại</div>
                                    <div class="font-mono font-bold text-blue-700 text-xs">{{ activeTicket.ticketCode }}</div>
                                </div>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border" :class="formatStatusBadge(activeTicket.status)">
                                    {{ formatStatusText(activeTicket.status) }}
                                </span>
                            </div>

                            <div class="pt-2 pb-1">
                                <div class="relative">
                                    <div class="absolute top-[13px] left-[12.5%] right-[12.5%] h-[2px] bg-slate-200 -translate-y-1/2 overflow-hidden z-0 pointer-events-none">
                                        <div 
                                            class="h-full transition-all duration-500"
                                            :class="activeTicket.status === 'REJECTED' ? 'bg-gradient-to-r from-blue-600 via-amber-500 to-rose-600' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500'"
                                            :style="{ 
                                                width: (activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED') ? '100%' : 
                                                       (activeTicket.status === 'REJECTED' ? '66.67%' : 
                                                       (activeTicket.status === 'IN_PROGRESS' ? '33.33%' : '0%')) 
                                            }"
                                        ></div>
                                    </div>

                                    <div class="relative z-10 grid grid-cols-4">
                                        
                                        <div class="flex flex-col items-center text-center">
                                            <div 
                                                class="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs transition-all duration-300 bg-blue-600 text-white"
                                                :class="{ 'ring-4 ring-blue-500/20 pulse-active': activeTicket.status === 'OPEN' }"
                                            >
                                                ✓
                                            </div>
                                            <span class="text-[9.5px] font-bold text-blue-900 mt-1">1. Tiếp Nhận</span>
                                            <span class="text-[9px] text-slate-400 font-mono">{{ formatTime(activeTicket.createdAt) }}</span>
                                        </div>

                                        <div class="flex flex-col items-center text-center">
                                            <div 
                                                class="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs transition-all duration-300"
                                                :class="activeTicket.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 pulse-active-amber' : 
                                                       ((activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED' || activeTicket.status === 'REJECTED') ? 'bg-blue-600 text-white' : 'bg-white border-2 border-slate-300 text-slate-400')"
                                            >
                                                {{ (activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED' || activeTicket.status === 'REJECTED') ? '✓' : '2' }}
                                            </div>
                                            <span 
                                                class="text-[9.5px] mt-1 transition-colors"
                                                :class="activeTicket.status === 'IN_PROGRESS' ? 'font-bold text-amber-700' : 
                                                       ((activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED' || activeTicket.status === 'REJECTED') ? 'font-bold text-blue-900' : 'font-medium text-slate-400')"
                                            >
                                                2. Thẩm Định
                                            </span>
                                            <span class="text-[9px] text-slate-400 font-mono">
                                                {{ (activeTicket.status !== 'OPEN' && activeTicket.assignedToName) ? 'Đã nhận' : '---' }}
                                            </span>
                                        </div>

                                        <div class="flex flex-col items-center text-center">
                                            <div 
                                                class="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs transition-all duration-300"
                                                :class="activeTicket.status === 'REJECTED' ? 'bg-rose-600 text-white ring-4 ring-rose-500/20 pulse-active-rose' : 
                                                       ((activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED') ? 'bg-emerald-600 text-white' : 'bg-white border-2 border-slate-300 text-slate-400')"
                                            >
                                                {{ activeTicket.status === 'REJECTED' ? '✕' : ((activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED') ? '✓' : '3') }}
                                            </div>
                                            <span 
                                                class="text-[9.5px] mt-1 transition-colors"
                                                :class="activeTicket.status === 'REJECTED' ? 'font-bold text-rose-700' : 
                                                       ((activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED') ? 'font-bold text-emerald-700' : 'font-medium text-slate-400')"
                                            >
                                                {{ activeTicket.status === 'REJECTED' ? '3. Từ Chối' : '3. Bồi Hoàn' }}
                                            </span>
                                            <span class="text-[9px] text-slate-400 font-mono">
                                                {{ (activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED' || activeTicket.status === 'REJECTED') ? (activeTicket.closedAt ? formatTime(activeTicket.closedAt) : 'Đã duyệt') : '---' }}
                                            </span>
                                        </div>

                                        <div class="flex flex-col items-center text-center">
                                            <div 
                                                class="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs transition-all duration-300"
                                                :class="(activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED') ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20 pulse-active-emerald' : 
                                                       'bg-white border-2 border-slate-300 text-slate-400'"
                                            >
                                                {{ (activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED') ? '✓' : '4' }}
                                            </div>
                                            <span 
                                                class="text-[9.5px] mt-1 transition-colors"
                                                :class="(activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED') ? 'font-bold text-emerald-700' : 'font-medium text-slate-400'"
                                            >
                                                {{ activeTicket.status === 'REJECTED' ? '4. Đóng Hồ Sơ' : '4. Hoàn Tất' }}
                                            </span>
                                            <span class="text-[9px] text-slate-400 font-mono">
                                                {{ (activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED') ? 'Thành công' : '---' }}
                                            </span>
                                        </div>

                                    </div>
                                </div>
                            </div>

                            <div class="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1.5 text-[11px] text-slate-600">
                                <div class="flex items-center justify-between pb-1 border-b border-slate-200/50">
                                    <span class="text-slate-400 flex items-center space-x-1">
                                        <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                        <span>Bưu gửi liên kết:</span>
                                    </span>
                                    <span class="font-mono font-bold text-blue-700">{{ activeTicket.trackingCode || 'Chưa liên kết' }}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-1.5 pt-0.5">
                                    <div><span class="text-slate-400">Người khiếu nại:</span> <strong class="text-slate-800">{{ activeTicket.creatorName }}</strong></div>
                                    <div><span class="text-slate-400">Số điện thoại:</span> <span class="font-mono font-bold text-slate-800">{{ activeTicket.creatorPhone }}</span></div>
                                    <div><span class="text-slate-400">Cán bộ thụ lý:</span> <span class="text-blue-700 font-semibold">{{ activeTicket.assignedToName || 'Đang phân bổ' }}</span></div>
                                    <div>
                                        <span class="text-slate-400">Bồi thường:</span> 
                                        <span 
                                            :class="activeTicket.status === 'REJECTED' ? 'font-mono font-bold text-rose-600' : (activeTicket.compensationAmount ? 'font-mono font-bold text-emerald-600' : 'text-amber-600 font-medium')"
                                        >
                                            {{ activeTicket.status === 'REJECTED' ? '0 đ (Từ chối)' : (activeTicket.compensationAmount ? formatCurrency(activeTicket.compensationAmount) : 'Đang đối soát') }}
                                        </span>
                                    </div>
                                </div>
                                
                                <div v-if="activeTicket.resolutionNote" class="pt-1 border-t border-slate-200/50 text-[10.5px] leading-relaxed flex items-start space-x-1 text-slate-500">
                                    <span class="font-semibold text-slate-600 flex-shrink-0">Kết luận:</span>
                                    <span>{{ activeTicket.resolutionNote }}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div class="lg:col-span-7 min-w-0 b2b-card rounded-xl shadow-xs overflow-hidden bg-white flex flex-col border border-slate-200 h-[620px] lg:h-[680px]">
                        
                        <div class="bg-white px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
                            <div class="flex items-center space-x-2.5">
                                <div class="relative">
                                    <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                        CS
                                    </div>
                                </div>
                                <div>
                                    <div class="flex items-center space-x-1.5">
                                        <span class="font-bold text-slate-800 text-xs">{{ activeTicket?.assignedToName || 'Chưa phân công' }}</span>
                                        <span v-if="activeTicket?.assignedToName" class="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-blue-100 text-blue-700">Chuyên Viên Thụ Lý</span>
                                    </div>
                                    <div class="text-[10px] text-slate-400">{{ activeTicket?.assignedToName ? 'Cán bộ đang thụ lý hồ sơ này' : 'Phiếu chưa được phân công cán bộ' }}</div>
                                </div>
                            </div>

                            <div class="flex items-center space-x-2">
                                <span class="text-[11px] font-semibold text-slate-500">Kênh hỗ trợ 24/7</span>
                            </div>
                        </div>

                        <div id="chatMessagesFeed" class="p-3.5 space-y-3 flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-[#f8fafc]">
                            
                            <template v-if="activeTicket">
                                <div class="flex justify-center">
                                    <span class="px-3 py-1 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-medium border border-slate-300/40 text-center">
                                        {{ formatTime(activeTicket.createdAt) }} • Hồ sơ {{ activeTicket.ticketCode }} được tạo thành công
                                    </span>
                                </div>

                                <template v-for="msg in activeTicket.messages" :key="msg.id">
                                    
                                    <div v-if="msg.senderRole === 'CUSTOMER'" class="flex justify-end chat-bubble-in">
                                        <div class="max-w-[85%] sm:max-w-[75%] min-w-0 space-y-1">
                                            <div class="bg-blue-600 text-white rounded-2xl rounded-tr-xs p-3 shadow-xs text-xs leading-relaxed space-y-2 chat-bubble-wrap">
                                                <p v-if="msg.content" class="chat-bubble-wrap">{{ msg.content }}</p>
                                                <div v-if="msg.attachmentUrls" class="pt-1.5 border-t border-blue-400/40">
                                                    <a :href="msg.attachmentUrls" target="_blank" rel="noopener noreferrer" class="block group relative overflow-hidden rounded-xl border border-white/20 bg-blue-700/50 hover:bg-blue-700 transition">
                                                        <img :src="msg.attachmentUrls" alt="Ảnh đính kèm" class="max-w-full max-h-56 rounded-xl object-contain mx-auto" loading="lazy" />
                                                        <div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-white rounded text-[9px] flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition">
                                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                                            <span>Xem ảnh gốc</span>
                                                        </div>
                                                    </a>
                                                </div>
                                            </div>
                                            <div class="text-right text-[10px] text-slate-400 font-mono pr-1">
                                                {{ formatTime(msg.createdAt) }} • Đã gửi ✓✓
                                            </div>
                                        </div>
                                    </div>

                                    <div v-else class="flex items-start space-x-2 chat-bubble-in">
                                        <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-200 mt-1">
                                            CS
                                        </div>
                                        <div class="max-w-[85%] sm:max-w-[75%] min-w-0 space-y-1">
                                            <div class="text-[10px] font-bold text-slate-700 pl-1">{{ msg.senderName || 'CSKH VNPT' }}</div>
                                            <div class="bg-white text-slate-800 rounded-2xl rounded-tl-xs border border-slate-200 p-3 shadow-2xs text-xs leading-relaxed space-y-2 chat-bubble-wrap">
                                                <p v-if="msg.content" class="chat-bubble-wrap">{{ msg.content }}</p>
                                                <div v-if="msg.attachmentUrls" class="pt-1.5 border-t border-slate-100">
                                                    <a :href="msg.attachmentUrls" target="_blank" rel="noopener noreferrer" class="block group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
                                                        <img :src="msg.attachmentUrls" alt="Ảnh đính kèm" class="max-w-full max-h-56 rounded-xl object-contain mx-auto" loading="lazy" />
                                                        <div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-white rounded text-[9px] flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition">
                                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                                            <span>Xem ảnh gốc</span>
                                                        </div>
                                                    </a>
                                                </div>
                                            </div>
                                            <div class="text-[10px] text-slate-400 font-mono pl-1">
                                                {{ formatTime(msg.createdAt) }}
                                            </div>
                                        </div>
                                    </div>

                                </template>

                                <div v-if="activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED'" class="tab-content-enter p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                                    <div class="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                                        <span class="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">✓</span>
                                        <span>BIÊN BẢN GIẢI QUYẾT &amp; DUYỆT BỒI HOÀN THÀNH CÔNG</span>
                                    </div>
                                    <div class="text-[11.5px] text-emerald-700 leading-relaxed">
                                        {{ activeTicket.resolutionNote || 'Bưu chính VNPT đã xác minh trách nhiệm và hoàn tất phương án giải quyết.' }}
                                        Số tiền bồi thường duyệt chi: <strong class="text-emerald-900 font-bold font-mono">{{ formatCurrency(activeTicket.compensationAmount) }}</strong>.
                                    </div>
                                    <div class="pt-1 flex items-center justify-between text-[10px] text-emerald-600 border-t border-emerald-200/60">
                                        <span>Hồ sơ đã được đóng thành công.</span>
                                        <span class="text-slate-500 font-medium">Bưu chính VNPT Cloud</span>
                                    </div>
                                </div>

                                <div v-else-if="activeTicket.status === 'REJECTED'" class="tab-content-enter p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                                    <div class="flex items-center space-x-2 text-rose-800 font-bold text-xs">
                                        <span class="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">✕</span>
                                        <span>THÔNG BÁO TỪ CHỐI BỒI THƯỜNG SỰ CỐ</span>
                                    </div>
                                    <div class="text-[11.5px] text-rose-700 leading-relaxed">
                                        {{ activeTicket.resolutionNote || 'Hồ sơ khiếu nại không đủ điều kiện bồi thường theo quy chuẩn đóng gói bưu phẩm.' }}
                                        Mức chi trả bồi thường: <strong class="text-rose-900 font-bold font-mono">0 đ</strong>.
                                    </div>
                                    <div class="pt-1 flex items-center justify-between text-[10px] text-rose-600 border-t border-rose-200/60 font-mono">
                                        <span>Hồ sơ đã được đóng lại.</span>
                                        <span class="text-slate-500 font-medium">Bưu chính VNPT Cloud</span>
                                    </div>
                                </div>
                            </template>

                            <div v-else class="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-16 space-y-2">
                                <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                                <span>Vui lòng chọn hoặc tra cứu một mã hồ sơ để mở cuộc hội thoại.</span>
                            </div>

                        </div>

                        <div v-if="activeTicket && activeTicket.status !== 'RESOLVED' && activeTicket.status !== 'CLOSED' && activeTicket.status !== 'REJECTED'" class="px-3.5 py-2 bg-slate-100/70 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5 text-[11px] shrink-0">
                            <span class="text-slate-400 text-[10px] font-medium shrink-0">Gợi ý nhanh:</span>
                            <button type="button" @click="sendMessage('Đã có kết quả thẩm định trách nhiệm bưu cục chưa ạ?')" class="btn-press px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-full text-slate-600 font-medium transition">
                                Đã có kết quả chưa?
                            </button>
                            <button type="button" @click="sendMessage('Tôi muốn bổ sung thêm hóa đơn mua hàng và ảnh chụp kiện hàng')" class="btn-press px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-full text-slate-600 font-medium transition">
                                Bổ sung hóa đơn &amp; ảnh kiện hàng
                            </button>
                            <button type="button" @click="sendMessage('Thời gian và hình thức nhận tiền bồi thường như thế nào?')" class="btn-press px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-full text-slate-600 font-medium transition">
                                Thời gian nhận tiền bồi thường?
                            </button>
                        </div>

                        <div v-if="selectedAttachmentUrl" class="px-3.5 py-2 bg-blue-50/90 border-t border-blue-100 flex items-center justify-between shrink-0">
                            <div class="flex items-center space-x-2.5">
                                <div class="relative w-11 h-11 rounded-lg overflow-hidden border border-blue-200 bg-white shrink-0 shadow-2xs">
                                    <img :src="selectedAttachmentUrl" alt="Ảnh đính kèm" class="w-full h-full object-cover" />
                                </div>
                                <div class="text-[11px] leading-snug">
                                    <div class="font-semibold text-blue-900 flex items-center space-x-1">
                                        <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                        <span>1 ảnh đã sẵn sàng đính kèm</span>
                                    </div>
                                    <span class="text-[10px] text-blue-600 font-mono">MinIO Object Storage</span>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                @click="removeAttachment" 
                                class="btn-press px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            >
                                Hủy đính kèm
                            </button>
                        </div>

                        <div class="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0" :class="activeTicket && (activeTicket.status === 'RESOLVED' || activeTicket.status === 'CLOSED') ? 'opacity-50 pointer-events-none' : ''">
                            <input 
                                type="file" 
                                id="supportChatFileInput" 
                                accept="image/png,image/jpeg,image/webp,image/jpg" 
                                class="hidden" 
                                @change="handleAttachmentUpload" 
                            />
                            <button 
                                type="button" 
                                @click="triggerChatFileInput" 
                                :disabled="isSendingMessage || isUploadingAttachment"
                                title="Đính kèm ảnh sự cố kiện hàng / hóa đơn (MinIO)"
                                class="btn-press p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition disabled:opacity-40 shrink-0"
                                :class="!activeTicket ? 'opacity-60' : ''"
                            >
                                <svg v-if="!isUploadingAttachment" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                </svg>
                                <svg v-else class="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                </svg>
                            </button>

                            <input 
                                type="text" 
                                v-model="chatInput" 
                                @keydown.enter="sendMessage()" 
                                :disabled="!activeTicket || isSendingMessage"
                                :placeholder="isUploadingAttachment ? 'Đang tải ảnh lên MinIO...' : 'Nhập tin nhắn trao đổi với CSKH... (nhấn Enter để gửi)'" 
                                class="flex-1 min-w-0 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                            />
                            <button 
                                type="button" 
                                @click="sendMessage()" 
                                :disabled="!activeTicket || isSendingMessage || isUploadingAttachment || (!chatInput.trim() && !selectedAttachmentUrl)"
                                class="btn-press px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50 shrink-0"
                            >
                                <span>Gửi</span>
                                <svg class="w-3.5 h-3.5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                </svg>
                            </button>
                        </div>

                    </div>

                </div>

                <div v-if="currentSubTab === 'ops' && isStaffUser" class="tab-content-enter space-y-3.5">
                    
                    <div class="b2b-card rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-2 flex-1">
                            <div class="relative w-full sm:w-72">
                                <input 
                                    type="text" 
                                    v-model="opsSearchQuery" 
                                    placeholder="Tìm theo mã vé, mã đơn, người gửi..."
                                    class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
                                />
                            </div>

                            <select v-model="opsFilterStatus" class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-600 transition">
                                <option value="ALL">Tất cả trạng thái</option>
                                <option value="OPEN">Chờ tiếp nhận (OPEN)</option>
                                <option value="ESCALATED">Quá hạn SLA (ESCALATED)</option>
                                <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
                                <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
                            </select>
                        </div>

                        <div class="text-xs text-slate-500 font-medium">
                            Hiển thị <strong>{{ filteredOpsTickets.length }}</strong> hồ sơ trên toàn hệ thống
                        </div>
                    </div>

                    <div class="b2b-card rounded-xl shadow-sm overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs text-slate-600">
                                <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th class="px-4 py-2.5">Mã Vé</th>
                                        <th class="px-4 py-2.5">Mã Vận Đơn</th>
                                        <th class="px-4 py-2.5">Người Khiếu Nại</th>
                                        <th class="px-4 py-2.5">Phân Loại Sự Cố</th>
                                        <th class="px-4 py-2.5">Trạng Thái</th>
                                        <th class="px-4 py-2.5">Cán Bộ Thụ Lý</th>
                                        <th class="px-4 py-2.5 text-right">Tác Nghiệp</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    <tr v-for="t in filteredOpsTickets" :key="t.id" class="hover:bg-slate-50/80 transition-colors">
                                        <td class="px-4 py-3 font-mono font-bold text-slate-900">{{ t.ticketCode }}</td>
                                        <td class="px-4 py-3 font-mono font-bold text-blue-700">{{ t.trackingCode }}</td>
                                        <td class="px-4 py-3">
                                            <div class="font-semibold text-slate-800">{{ t.creatorName }}</div>
                                            <div class="text-[10px] text-slate-400 font-mono">{{ t.creatorPhone }}</div>
                                        </td>
                                        <td class="px-4 py-3">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border" :class="formatPriorityBadge(t.priority)">
                                                {{ formatCategory(t.category) }}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1" :class="formatStatusBadge(t.status)">
                                                <span v-if="t.status === 'OPEN'" class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                <span>{{ formatStatusText(t.status) }}</span>
                                            </span>
                                        </td>
                                        <td class="px-4 py-3">
                                            <span v-if="t.assignedToName" class="font-semibold text-slate-700">{{ t.assignedToName }}</span>
                                            <span v-else class="text-slate-400 italic">Chưa phân công</span>
                                        </td>
                                        <td class="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                                            <button 
                                                v-if="t.status === 'OPEN'"
                                                type="button" 
                                                @click="handleAssignTicket(t)"
                                                class="btn-press px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition shadow-2xs"
                                            >
                                                Tiếp Nhận
                                            </button>
                                            <button 
                                                v-else-if="t.status === 'ESCALATED'"
                                                type="button" 
                                                @click="handleAssignTicket(t)"
                                                class="btn-press px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs transition shadow-2xs"
                                            >
                                                Tiếp Nhận Khẩn
                                            </button>
                                            <button 
                                                v-else-if="t.status === 'IN_PROGRESS'"
                                                type="button" 
                                                @click="openResolveModal(t)"
                                                class="btn-press px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-2xs"
                                            >
                                                Xử Lý &amp; Bồi Thường
                                            </button>
                                            <button 
                                                v-else
                                                type="button" 
                                                @click="openResolveModal(t)"
                                                class="btn-press px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition border border-slate-200"
                                            >
                                                Xem Biên Bản
                                            </button>
                                            <button 
                                                type="button" 
                                                @click="selectTicketForChat(t)"
                                                class="btn-press px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs transition border border-blue-200"
                                                title="Mở hồ sơ này trong khung Chatbox 2 cột"
                                            >
                                                Chatbox
                                            </button>
                                        </td>
                                    </tr>

                                    <tr v-if="filteredOpsTickets.length === 0">
                                        <td colspan="7" class="text-center py-10 text-slate-400 text-xs">
                                            Không có hồ sơ nào phù hợp với bộ lọc hiện tại.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                <div v-if="showResolveModal && modalTicket" class="fixed inset-0 z-50 modal-backdrop-enter bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div class="modal-box-enter bg-white rounded-xl shadow-xl border border-slate-200 max-w-4xl w-full overflow-hidden text-xs">
                        <div class="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <span class="font-bold text-slate-900">Biên Bản Thẩm Định Khiếu Nại:</span>
                                <span class="font-mono font-bold text-blue-700">{{ modalTicket.ticketCode }}</span>
                                <span class="font-mono text-slate-500">({{ modalTicket.trackingCode }})</span>
                            </div>
                            <button type="button" @click="closeResolveModal" class="text-slate-400 hover:text-slate-600 font-bold text-base p-1 leading-none">✕</button>
                        </div>

                        <div class="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div class="md:col-span-6 space-y-3 border-r md:pr-4 border-slate-100">
                                <div class="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Thông Tin Thẩm Định Lỗi Vận Chuyển</div>
                                <div class="space-y-1.5 text-slate-600 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                                    <div><span class="text-slate-400">Người khiếu nại:</span> <strong class="text-slate-800">{{ modalTicket.creatorName }} ({{ modalTicket.creatorPhone }})</strong></div>
                                    <div><span class="text-slate-400">Phân loại sự cố:</span> {{ formatCategory(modalTicket.category) }}</div>
                                    <div><span class="text-slate-400">Tiêu đề:</span> {{ modalTicket.title }}</div>
                                </div>

                                <div class="pt-2 border-t border-slate-100 space-y-2.5">
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Số tiền bồi thường duyệt chi (VNĐ):</label>
                                        <input 
                                            type="number" 
                                            v-model="modalCompensation" 
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:border-blue-600 outline-none transition"
                                            min="0"
                                            step="10000"
                                        />
                                    </div>

                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Kết luận xử lý &amp; Trách nhiệm bưu cục:</label>
                                        <textarea 
                                            v-model="modalNote" 
                                            rows="3" 
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-blue-600 outline-none transition"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <div class="md:col-span-6 flex flex-col justify-between border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                                <div class="bg-white px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <div class="flex items-center space-x-2">
                                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span class="font-bold text-slate-800 text-[11px]">Kênh Đối Thoại Trực Tiếp Với Khách Hàng</span>
                                    </div>
                                    <span class="text-[10px] text-slate-400">{{ modalTicket.creatorName }}</span>
                                </div>

                                <div class="h-60 overflow-y-auto overflow-x-hidden min-w-0 p-3 space-y-3 bg-[#f8fafc]">
                                    <template v-for="msg in modalTicket.messages" :key="msg.id">
                                        <div v-if="msg.senderRole === 'CUSTOMER'" class="flex items-start space-x-2 chat-bubble-in">
                                            <div class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                                                KH
                                            </div>
                                            <div class="max-w-[80%] min-w-0 space-y-0.5">
                                                <div class="text-[10px] text-slate-500">{{ msg.senderName }} • {{ formatTime(msg.createdAt) }}</div>
                                                <div class="p-2.5 bg-white text-slate-700 rounded-2xl rounded-tl-xs border border-slate-200 shadow-2xs text-[11px] leading-relaxed space-y-1.5 chat-bubble-wrap">
                                                    <p v-if="msg.content" class="chat-bubble-wrap">{{ msg.content }}</p>
                                                    <div v-if="msg.attachmentUrls" class="pt-1 border-t border-slate-100">
                                                        <a :href="msg.attachmentUrls" target="_blank" rel="noopener noreferrer" class="block rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                                            <img :src="msg.attachmentUrls" alt="Ảnh đính kèm" class="max-w-full max-h-40 rounded-lg object-contain mx-auto" loading="lazy" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div v-else class="flex justify-end chat-bubble-in">
                                            <div class="max-w-[80%] min-w-0 space-y-0.5 text-right">
                                                <div class="text-[10px] text-slate-400">Bạn (CSKH) • {{ formatTime(msg.createdAt) }}</div>
                                                <div class="p-2.5 bg-blue-600 text-white rounded-2xl rounded-tr-xs shadow-xs text-[11px] text-left leading-relaxed space-y-1.5 chat-bubble-wrap">
                                                    <p v-if="msg.content" class="chat-bubble-wrap">{{ msg.content }}</p>
                                                    <div v-if="msg.attachmentUrls" class="pt-1 border-t border-blue-400/40">
                                                        <a :href="msg.attachmentUrls" target="_blank" rel="noopener noreferrer" class="block rounded-lg overflow-hidden border border-white/20 bg-blue-700/50">
                                                            <img :src="msg.attachmentUrls" alt="Ảnh đính kèm" class="max-w-full max-h-40 rounded-lg object-contain mx-auto" loading="lazy" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </div>

                                <div v-if="modalAttachmentUrl" class="px-2.5 py-1.5 bg-blue-50 border-t border-blue-100 flex items-center justify-between shrink-0">
                                    <div class="flex items-center space-x-2">
                                        <img :src="modalAttachmentUrl" alt="Preview" class="w-8 h-8 rounded object-cover border border-blue-200" />
                                        <span class="text-[10px] text-blue-700 font-medium">1 ảnh biên bản đã đính kèm</span>
                                    </div>
                                    <button type="button" @click="removeModalAttachment" class="text-[10px] text-rose-600 hover:underline">Hủy</button>
                                </div>

                                <div class="p-2 bg-white border-t border-slate-200 flex items-center space-x-1.5 shrink-0">
                                    <input 
                                        type="file" 
                                        id="supportModalFileInput" 
                                        accept="image/png,image/jpeg,image/webp,image/jpg" 
                                        class="hidden" 
                                        @change="handleModalAttachmentUpload" 
                                    />
                                    <button 
                                        type="button" 
                                        @click="document.getElementById('supportModalFileInput').click()" 
                                        :disabled="isUploadingModalAttachment"
                                        title="Đính kèm ảnh / biên bản giải quyết (MinIO)"
                                        class="btn-press p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-40 shrink-0"
                                    >
                                        <svg v-if="!isUploadingModalAttachment" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                                        </svg>
                                        <svg v-else class="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                        </svg>
                                    </button>

                                    <input 
                                        type="text" 
                                        v-model="modalCsReply" 
                                        @keydown.enter="handleSendCsMessageInModal"
                                        :placeholder="isUploadingModalAttachment ? 'Đang tải ảnh lên MinIO...' : 'Nhập tin nhắn giải thích hoặc trao đổi với khách...'" 
                                        class="flex-1 min-w-0 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                                    />
                                    <button 
                                        type="button" 
                                        @click="handleSendCsMessageInModal"
                                        :disabled="isUploadingModalAttachment || (!modalCsReply.trim() && !modalAttachmentUrl)"
                                        class="btn-press px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition disabled:opacity-50 shrink-0"
                                    >
                                        Gửi
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-end space-x-2">
                            <button type="button" @click="closeResolveModal" class="btn-press px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-100 text-xs transition">Đóng</button>
                            <button 
                                v-if="modalTicket.status !== 'RESOLVED' && modalTicket.status !== 'CLOSED'"
                                type="button" 
                                @click="submitResolveTicket"
                                :disabled="isSubmittingResolve"
                                class="btn-press px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
                            >
                                <span v-if="isSubmittingResolve" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>{{ isSubmittingResolve ? 'Đang Chốt...' : 'Duyệt Chi & Đóng Hồ Sơ' }}</span>
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        `
    };

    window.SupportView = SupportView;
})();
