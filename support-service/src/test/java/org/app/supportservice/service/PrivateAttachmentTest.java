package org.app.supportservice.service;

import io.minio.MinioClient;
import org.app.supportservice.config.MinioBucketSupport;
import org.app.supportservice.exception.BadRequestException;
import org.app.supportservice.service.impl.MinioStorageServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PrivateAttachmentTest {
    private MinioStorageServiceImpl storage() {
        var storage = new MinioStorageServiceImpl(mock(MinioClient.class), mock(MinioBucketSupport.class));
        ReflectionTestUtils.setField(storage, "bucketName", "support-tickets");
        ReflectionTestUtils.setField(storage, "publicUrl", "https://storage.example.com");
        ReflectionTestUtils.setField(storage, "accessKey", "test-user");
        ReflectionTestUtils.setField(storage, "secretKey", "test-only-password");
        return storage;
    }

    @Test void filesCannotBeAttachedAcrossTicketsAndLinksExpire() {
        var storage = storage();
        assertEquals("tickets/7/2026/10/file.png", storage.normalizeAttachment("tickets/7/2026/10/file.png", 7L));
        assertThrows(BadRequestException.class, () -> storage.normalizeAttachment("tickets/8/2026/10/file.png", 7L));
        assertThrows(BadRequestException.class, () -> storage.normalizeAttachment("javascript:alert(1)", 7L));
        String url = storage.signedUrl("tickets/7/2026/10/file.png");
        assertTrue(url.startsWith("https://storage.example.com/support-tickets/tickets/7/"));
        assertTrue(url.contains("X-Amz-Expires=600"));
    }

    @Test void renamedExecutableOrHtmlCannotBeUploadedAsAnImage() {
        var storage = storage();
        MockMultipartFile file = new MockMultipartFile("file", "fake.png", "image/png", "<script>invalid</script>".getBytes());
        assertThrows(BadRequestException.class, () -> storage.uploadFile(file, 7L));
    }
}
