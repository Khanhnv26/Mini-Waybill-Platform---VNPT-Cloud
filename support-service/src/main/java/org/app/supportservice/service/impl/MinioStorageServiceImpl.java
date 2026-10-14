package org.app.supportservice.service.impl;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;
import org.app.supportservice.config.MinioBucketSupport;
import org.app.supportservice.exception.BadRequestException;
import org.app.supportservice.service.MinioStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@Service
@Slf4j
public class MinioStorageServiceImpl implements MinioStorageService {

    private final MinioClient minioClient;
    private final MinioBucketSupport bucketSupport;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Value("${minio.public-url}")
    private String publicUrl;
    @Value("${minio.access-key}") private String accessKey;
    @Value("${minio.secret-key}") private String secretKey;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".pdf");

    @Override
    public String uploadFile(MultipartFile file, Long ticketId) {
        if (file.isEmpty()) {
            throw new BadRequestException("File tải lên không được rỗng");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = "";
        if(originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        }

        if(!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new BadRequestException("Định dạng file không hỗ trợ. Chỉ chấp nhận JPG, PNG, WEBP, PDF");
        }

        String dateFolder = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
        String objectName = "tickets/" + ticketId + "/" + dateFolder + "/" + UUID.randomUUID() + ext;

        try (InputStream inputStream = file.getInputStream()) {
            bucketSupport.ensurePrivateBucket(minioClient, bucketName);
            minioClient.putObject(PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(verifiedContentType(file, ext))
                            .build());
            return objectName;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi upload file lên MinIO: {}", e.getMessage(), e);
            throw new RuntimeException("Tải file lên MinIO thất bại: " + e.getMessage());
        }
    }

    @Override
    public String normalizeAttachment(String attachment, Long ticketId) {
        if (attachment == null || attachment.isBlank()) return null;
        if (!attachment.startsWith("tickets/" + ticketId + "/") || attachment.contains("..") || attachment.contains("?")
                || attachment.length() > 250) throw new BadRequestException("Tệp đính kèm không thuộc phiếu này");
        return attachment;
    }

    @Override
    public String signedUrl(String stored) {
        if (stored == null || stored.isBlank()) return null;
        String object = stored;
        if (stored.startsWith("http://") || stored.startsWith("https://")) {
            String path = java.net.URI.create(stored).getPath();
            String marker = "/" + bucketName + "/";
            if (!path.startsWith(marker)) return null;
            object = path.substring(marker.length());
        }
        if (object.contains("..") || object.contains(":") || object.startsWith("/") || object.length() > 300) return null;
        try {
            MinioClient signer = MinioClient.builder().endpoint(publicUrl).region("us-east-1")
                    .credentials(accessKey, secretKey).build();
            return signer.getPresignedObjectUrl(io.minio.GetPresignedObjectUrlArgs.builder()
                    .method(io.minio.http.Method.GET).bucket(bucketName).object(object).expiry(600).build());
        } catch (Exception e) { throw new IllegalStateException("Không thể tạo liên kết tải tệp", e); }
    }

    private String verifiedContentType(MultipartFile file, String extension) throws java.io.IOException {
        byte[] bytes;
        try (InputStream stream = file.getInputStream()) { bytes = stream.readNBytes(12); }
        if (extension.equals(".pdf") && new String(bytes, StandardCharsets.US_ASCII).startsWith("%PDF-")) return "application/pdf";
        if ((extension.equals(".jpg") || extension.equals(".jpeg")) && bytes.length >= 3
                && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255) return "image/jpeg";
        byte[] png = {(byte)137,80,78,71,13,10,26,10};
        if (extension.equals(".png") && bytes.length >= 8 && java.util.Arrays.equals(java.util.Arrays.copyOf(bytes,8), png)) return "image/png";
        if (extension.equals(".webp") && bytes.length == 12 && new String(bytes, 0,4, StandardCharsets.US_ASCII).equals("RIFF")
                && new String(bytes,8,4, StandardCharsets.US_ASCII).equals("WEBP")) return "image/webp";
        throw new BadRequestException("Nội dung tệp không khớp định dạng cho phép");
    }
}
