# Chat khách hàng: presence, thông báo và đồng bộ

Chat tiếp tục gắn với phiếu hỗ trợ. Khách vãng lai dùng capability `X-Ticket-Access-Token`; tài khoản dùng JWT qua gateway. Không đưa token vào URL hoặc kênh chung cho khách vãng lai.

## Hành vi

- Kết nối chat tồn tại ở cấp ứng dụng. Chuyển trang vẫn nhận thông báo, badge và âm báo. Khung chat trong `keep-alive` chỉ đăng ký phiếu khi đang hoạt động.
- Online nghĩa là còn ít nhất một phiên heartbeat trong ứng dụng, không có nghĩa đã đọc tin. Heartbeat mỗi 25 giây, phiên hết hạn sau 90 giây. Runtime đối soát inbox mỗi 15 giây khi WebSocket kết nối và 5 giây khi mất kết nối; tab ẩn giảm xuống 60 giây nhưng vẫn giữ heartbeat. Khi quay lại tab hoặc có mạng, đối soát ngay và gộp sự kiện đánh thức gần nhau. Chưa đăng nhập và không có capability phiếu thì không mở kết nối hoặc polling. Redis kiểm tra các phiên hết hạn mỗi 10 giây; giao diện đối soát định kỳ và qua sự kiện thay đổi. Lỗi lấy presence hiển thị “Chưa xác định”.
- Người dùng thấy nhân viên được phân công; phiếu chưa phân công hiển thị “Chưa có nhân viên tiếp nhận”. Nhân viên thấy presence của khách. Nhiều tab và thiết bị được gộp theo danh tính, khách vãng lai được tách theo phiếu.
- Thông báo lưu bằng tin nhắn và người nhận tại thời điểm gửi. Tin khách gửi tới người được phân công hoặc hàng đợi CSKH/quản trị viên; tin nhân viên gửi tới chủ phiếu. Nội dung phiếu mới cũng tạo sự kiện cho hàng đợi.
- Chuông tải tối đa 100 thông báo gần nhất; badge phiếu dùng số chưa đọc từ backend. Xem thông báo và đọc nội dung chat là hai mốc riêng biệt.
- Chỉ tăng mốc đọc khi tin vào vùng nhìn thấy trong tab đang hiển thị. Khách thấy “Đã đọc” khi bất kỳ CSKH/quản trị viên nào đã xem. Mỗi nhân viên có mốc đọc riêng.
- Âm thanh chỉ khả dụng sau tương tác người dùng và có thể tắt. Web Locks và dấu nhận trong localStorage tránh phát âm báo lặp giữa các tab cùng trình duyệt. Không có Web Push hay thông báo sau khi đóng web.
- Tin đang gửi và bản nháp giữ trong bộ nhớ phiên trang theo phiếu. Retry dùng cùng `clientMessageId`; lỗi mạng, HTTP 429 và 5xx tự thử thêm hai lần, sau đó người dùng có thể thử lại. Tải lại trang không giữ hàng đợi này.
- Lịch sử tải 50 tin/lần, tối đa 100; đồng bộ sau cursor khi reconnect hoặc tab hoạt động lại. Khi WebSocket kết nối, đối soát khoảng 15 giây; khi mất kết nối khoảng 3,5 giây. Đọc tin cũ không bị kéo xuống cuối. Ảnh có URL hết hạn được xin lại khi tải ảnh lỗi.

## API và kênh

- `POST /api/tickets/{id}/messages`: thêm `clientMessageId` tùy chọn, 16–64 ký tự chữ/số/gạch ngang/gạch dưới. Retry cùng nội dung và danh tính trả lại tin gốc; nội dung khác trả 409. Client cũ không gửi ID vẫn dùng được.
- `GET /api/tickets/{id}/messages?beforeId=...` hoặc `?afterId=...`: trả `messages`, `hasMore`, `nextCursor`, `read` và trạng thái/phân công phiếu. Không dùng hai cursor cùng lúc. Trang lịch sử được trả theo thứ tự ID tăng dần.
- `PUT /api/tickets/{id}/read`: body `{ "lastReadMessageId": 123 }`. Mốc chỉ tăng; ID phải thuộc phiếu có quyền truy cập.
- `PUT /api/tickets/{id}/notifications/read`: cùng body, chỉ đánh dấu đã xem thông báo.
- `GET /api/tickets/chat/inbox` và `/chat/summary`: cho tài khoản. Guest thêm `?ticketId=...` và header capability của phiếu đó.
- `GET /api/tickets/{id}/chat-context`: thông tin danh tính cho presence, kiểm tra quyền truy cập phiếu trước khi trả.
- `GET /api/notifications/chat/presence/{id}`: snapshot có kiểm tra JWT/capability.
- `POST /api/notifications/chat/presence`: body `{ "sessionId": "UUID", "ticketId": 7, "leave": false }`; tài khoản không cần `ticketId`, guest bắt buộc có phiếu và capability. Danh tính được suy ra phía máy chủ.
- Chi tiết phiếu giữ mặc định trả lịch sử như trước; frontend mới dùng `includeMessages=false` và API lịch sử riêng.
- Kênh phiếu cũ nhận thêm `eventType: MESSAGE | READ | PRESENCE`. Các inbox `/topic/chat/inbox/user/{userId}`, `/staff`, `/guest/{ticketId}` kiểm tra quyền riêng. Client không được STOMP SEND.

## Dữ liệu và triển khai

1. Build lại `shared-events`, `support-service`, `notification-service` và `api-gateway` cùng phiên bản.
2. Khi khởi động support-service, Flyway áp dụng `V4__chat_delivery_and_read_state.sql` vào `support_db`. Migration thêm khóa chống trùng có lọc NULL, chỉ mục lịch sử/người nhận và bảng mốc đọc. Không sửa hoặc xóa tin cũ; tin cũ được tính chưa đọc cho tới khi người dùng xem, nhưng không phát lại thành thông báo mới.
3. Notification-service cần Redis dùng chung giữa các instance. Kafka consumer phát qua Redis Pub/Sub để mọi node WebSocket nhận được. Redis lỗi đi qua cơ chế retry Kafka; lịch sử và polling phục hồi sự kiện bị lỡ. Presence là dữ liệu tạm thời trong Redis.
4. Phục vụ frontend và CSS mới sau backend. Read receipt được phát sau commit; nếu Kafka lỗi, polling đối soát lại mốc đã lưu. Tin nhắn và outbox được ghi cùng giao dịch.

## Xác minh

```powershell
node --test 'frontend/tests/*.test.cjs'
mvn -pl support-service,notification-service,api-gateway -am test '-Dtest=ChatPersistenceTest,TicketServiceImplTest,ChatOutboxPublisherTest,TicketAccessServiceTest,PrivateAttachmentTest,WebSocketAuthorizationTest,WebSocketTransportTest,ChatPresenceServiceTest,ChatPresenceControllerTest,ChatRealtimeFanoutTest' '-Dsurefire.failIfNoSpecifiedTests=false'
```

`frontend/tests/fixtures/support-chat.html` là trang QA dùng dữ liệu mô phỏng, không gọi backend. Có nút mô phỏng online/offline, tin mới và gửi lỗi để kiểm tra desktop/mobile. Kiểm thử H2 xác minh truy vấn, cursor, quyền và gửi đồng thời.

### Kiểm tra migration trên SQL Server

Migration V4 dùng `GO` để tách lệnh thêm cột khỏi các index tham chiếu cột mới. Với SQL Server, dấu chấm phẩy không tách batch; nếu thiếu `GO`, Flyway có thể báo `Invalid column name 'client_message_id'` ngay trong bước tạo index.

`ChatSqlServerMigrationTest` luôn kiểm tra batch bằng chính parser SQL Server của Flyway. Có thể bật thêm bài kiểm thử JDBC trên SQL Server:

```powershell
mvn -pl support-service -am test '-Dtest=ChatSqlServerMigrationTest' '-Dchat.sqlserver.migration-test=true' '-Dsurefire.failIfNoSpecifiedTests=false'
```

Bài JDBC chỉ tạo bảng tạm `#...` theo kết nối, kiểm tra các cột/index, chặn ID gửi trùng và chấp nhận nhiều tin legacy có ID gửi NULL. Bảng tạm tự biến mất khi đóng kết nối; không chạy migrate/repair hoặc sửa bảng nghiệp vụ. Mặc định lấy cấu hình datasource trong `support-service/src/main/resources/application.properties`; có thể chỉ định qua biến môi trường `CHAT_SQLSERVER_TEST_URL`, `CHAT_SQLSERVER_TEST_USER`, `CHAT_SQLSERVER_TEST_PASSWORD`. Bài này không thay thế kiểm thử toàn bộ migration và ràng buộc khóa ngoại trên database staging.

Nếu lần chạy V4 trước báo `Changes successfully rolled back`, khởi động lại support-service sau khi cập nhật file sẽ để Flyway chạy lại migration chưa áp dụng.
