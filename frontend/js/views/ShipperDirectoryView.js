/**
 * Danh bạ bưu tá cho quản trị viên.
 * Gọi POST, PUT và DELETE /api/shippers. Xóa mềm đổi trạng thái sang INACTIVE.
 */
(function () {
    const { ref, reactive, computed, onMounted } = Vue;

    const STATIONS = [
        { code: 'POST-HN-CG', label: 'Bưu cục Cầu Giấy' },
        { code: 'POST-HN-DDA', label: 'Bưu cục Đống Đa' },
        { code: 'POST-HN-HBT', label: 'Bưu cục Hai Bà Trưng' },
        { code: 'POST-HN-TX', label: 'Bưu cục Thanh Xuân' },
        { code: 'POST-HN-HD', label: 'Bưu cục Hà Đông' },
        { code: 'POST-DN-HC', label: 'Bưu cục Hải Châu' },
        { code: 'POST-DN-TK', label: 'Bưu cục Thanh Khê' },
        { code: 'POST-DN-ST', label: 'Bưu cục Sơn Trà' },
        { code: 'POST-HCM-Q1', label: 'Bưu cục Quận 1' },
        { code: 'POST-HCM-TB', label: 'Bưu cục Tân Bình' },
        { code: 'POST-HCM-BT', label: 'Bưu cục Bình Thạnh' },
        { code: 'HUB-HN-01', label: 'Siêu HUB Hà Nội' },
        { code: 'HUB-HP-01', label: 'HUB Hải Phòng' },
        { code: 'HUB-DN-01', label: 'Siêu HUB Đà Nẵng' },
        { code: 'HUB-HCM-01', label: 'Siêu HUB TP.HCM' },
        { code: 'HUB-CT-01', label: 'HUB Cần Thơ' }
    ];

    const emptyForm = () => ({
        id: null,
        courierCode: '',
        fullName: '',
        phone: '',
        telegramChatId: '',
        stationCode: 'POST-HN-CG',
        status: 'ACTIVE'
    });

    const ShipperDirectoryView = {
        name: 'ShipperDirectoryView',
        setup() {
            const shippers = ref([]);
            const isLoading = ref(false);
            const isSaving = ref(false);
            const searchQuery = ref('');
            const statusFilter = ref('ALL');
            const showModal = ref(false);
            const form = reactive(emptyForm());

            const stationLabel = (code) => {
                const found = STATIONS.find(item => item.code === code);
                return found ? found.label : (code || 'Chưa gán trạm');
            };

            const filtered = computed(() => {
                const query = searchQuery.value.trim().toLowerCase();
                return shippers.value.filter(item => {
                    if (statusFilter.value !== 'ALL' && item.status !== statusFilter.value) return false;
                    if (!query) return true;
                    return [item.courierCode, item.fullName, item.phone, item.stationCode]
                        .some(value => String(value || '').toLowerCase().includes(query));
                });
            });

            const loadShippers = async () => {
                if (typeof ShipperDirectoryService === 'undefined') return;
                isLoading.value = true;
                try {
                    const data = await ShipperDirectoryService.list();
                    shippers.value = Array.isArray(data) ? data : [];
                } catch (error) {
                    if (window.Utils) window.Utils.showToast('Không tải được danh bạ', error.message, 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            const openCreate = () => {
                Object.assign(form, emptyForm());
                showModal.value = true;
            };

            const openEdit = (item) => {
                Object.assign(form, {
                    id: item.id,
                    courierCode: item.courierCode || '',
                    fullName: item.fullName || '',
                    phone: item.phone || '',
                    telegramChatId: '',
                    stationCode: item.stationCode || 'POST-HN-CG',
                    status: item.status || 'ACTIVE'
                });
                showModal.value = true;
            };

            const validate = () => {
                if (!form.courierCode.trim() || !form.fullName.trim()) {
                    return 'Mã bưu tá và họ tên không được để trống';
                }
                const phone = form.phone.trim();
                if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) {
                    return 'Số điện thoại phải từ 7 đến 15 chữ số';
                }
                return '';
            };

            const save = async () => {
                const message = validate();
                if (message) {
                    if (window.Utils) window.Utils.showToast('Thiếu thông tin', message, 'warning');
                    return;
                }
                const payload = {
                    courierCode: form.courierCode.trim().toUpperCase(),
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim() || null,
                    stationCode: form.stationCode || null,
                    telegramChatId: form.telegramChatId.trim() || null
                };
                isSaving.value = true;
                try {
                    if (form.id) {
                        payload.status = form.status;
                        if (!payload.telegramChatId) delete payload.telegramChatId;
                        await ShipperDirectoryService.update(form.id, payload);
                        if (window.Utils) window.Utils.showToast('Đã cập nhật', `Bưu tá ${payload.courierCode} đã được lưu.`, 'success');
                    } else {
                        await ShipperDirectoryService.create(payload);
                        if (window.Utils) window.Utils.showToast('Đã thêm bưu tá', `${payload.fullName} (${payload.courierCode}) đã vào danh bạ.`, 'success');
                    }
                    showModal.value = false;
                    await loadShippers();
                } catch (error) {
                    if (window.Utils) window.Utils.showToast('Không lưu được', error.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };

            const deactivate = async (item) => {
                if (!item || !item.id) return;
                if (item.status === 'INACTIVE') {
                    try {
                        await ShipperDirectoryService.update(item.id, { status: 'ACTIVE' });
                        if (window.Utils) window.Utils.showToast('Đã kích hoạt', `${item.courierCode} hoạt động trở lại.`, 'success');
                        await loadShippers();
                    } catch (error) {
                        if (window.Utils) window.Utils.showToast('Không kích hoạt được', error.message, 'error');
                    }
                    return;
                }
                try {
                    await ShipperDirectoryService.deactivate(item.id);
                    if (window.Utils) window.Utils.showToast('Đã ngừng', `${item.courierCode} chuyển sang ngừng hoạt động.`, 'success');
                    await loadShippers();
                } catch (error) {
                    if (window.Utils) window.Utils.showToast('Không ngừng được', error.message, 'error');
                }
            };

            onMounted(loadShippers);

            return {
                shippers,
                filtered,
                isLoading,
                isSaving,
                searchQuery,
                statusFilter,
                showModal,
                form,
                stations: STATIONS,
                stationLabel,
                openCreate,
                openEdit,
                save,
                deactivate
            };
        },
        template: `
            <div class="space-y-4">
                <div class="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 class="text-sm font-extrabold text-slate-900">Danh bạ bưu tá</h2>
                        <p class="text-[11px] text-slate-500 mt-0.5">Tạo, sửa và ngừng hoạt động. Telegram gắn bằng chat bot, không nhập lại mã cũ.</p>
                    </div>
                    <button type="button" @click="openCreate" class="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">Thêm bưu tá</button>
                </div>
                <div class="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row gap-2">
                    <input v-model="searchQuery" type="search" placeholder="Tìm mã, tên, số điện thoại, trạm" class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs">
                    <select v-model="statusFilter" class="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold">
                        <option value="ALL">Mọi trạng thái</option>
                        <option value="ACTIVE">Đang hoạt động</option>
                        <option value="INACTIVE">Ngừng hoạt động</option>
                    </select>
                </div>
                <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div v-if="isLoading" class="p-8 text-center text-xs text-slate-500">Đang tải danh bạ...</div>
                    <div v-else-if="filtered.length === 0" class="p-8 text-center text-xs text-slate-500">Chưa có bưu tá phù hợp bộ lọc.</div>
                    <table v-else class="w-full text-xs">
                        <thead class="bg-slate-50 text-slate-500 uppercase tracking-wide">
                            <tr>
                                <th class="text-left px-3 py-2">Mã</th>
                                <th class="text-left px-3 py-2">Họ tên</th>
                                <th class="text-left px-3 py-2">Điện thoại</th>
                                <th class="text-left px-3 py-2">Trạm</th>
                                <th class="text-left px-3 py-2">Telegram</th>
                                <th class="text-left px-3 py-2">Trạng thái</th>
                                <th class="text-right px-3 py-2">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in filtered" :key="item.id" class="border-t border-slate-100">
                                <td class="px-3 py-2 font-mono font-bold text-slate-800">{{ item.courierCode }}</td>
                                <td class="px-3 py-2 font-semibold text-slate-800">{{ item.fullName }}</td>
                                <td class="px-3 py-2 font-mono">{{ item.phone || '—' }}</td>
                                <td class="px-3 py-2">{{ stationLabel(item.stationCode) }}</td>
                                <td class="px-3 py-2">{{ item.hasLinkedTelegram ? 'Đã liên kết' : 'Chưa liên kết' }}</td>
                                <td class="px-3 py-2">
                                    <span class="px-1.5 py-0.5 rounded font-bold" :class="item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'">{{ item.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng' }}</span>
                                </td>
                                <td class="px-3 py-2 text-right space-x-2">
                                    <button type="button" @click="openEdit(item)" class="text-blue-700 font-bold">Sửa</button>
                                    <button type="button" @click="deactivate(item)" class="font-bold" :class="item.status === 'ACTIVE' ? 'text-rose-700' : 'text-emerald-700'">{{ item.status === 'ACTIVE' ? 'Ngừng' : 'Kích hoạt' }}</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-if="showModal" class="fixed inset-0 z-[100] bg-slate-900/40 flex items-center justify-center p-4">
                    <form @submit.prevent="save" class="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-5 space-y-3">
                        <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-800">{{ form.id ? 'Sửa bưu tá' : 'Thêm bưu tá' }}</h3>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-700 mb-1">Mã bưu tá</label>
                            <input v-model="form.courierCode" required class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono">
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-700 mb-1">Họ tên</label>
                            <input v-model="form.fullName" required class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs">
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Điện thoại</label>
                                <input v-model="form.phone" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" placeholder="0912345678">
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Trạm</label>
                                <select v-model="form.stationCode" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs">
                                    <option v-for="station in stations" :key="station.code" :value="station.code">{{ station.label }}</option>
                                </select>
                            </div>
                        </div>
                        <div v-if="form.id">
                            <label class="block text-[11px] font-bold text-slate-700 mb-1">Trạng thái</label>
                            <select v-model="form.status" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs">
                                <option value="ACTIVE">Hoạt động</option>
                                <option value="INACTIVE">Ngừng hoạt động</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-700 mb-1">Telegram chat id</label>
                            <input v-model="form.telegramChatId" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" placeholder="Chỉ nhập khi cần gắn mới">
                        </div>
                        <div class="flex justify-end gap-2 pt-1">
                            <button type="button" @click="showModal = false" class="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold">Đóng</button>
                            <button type="submit" :disabled="isSaving" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50">{{ isSaving ? 'Đang lưu...' : 'Lưu' }}</button>
                        </div>
                    </form>
                </div>
            </div>
        `
    };

    window.ShipperDirectoryView = ShipperDirectoryView;
})();
