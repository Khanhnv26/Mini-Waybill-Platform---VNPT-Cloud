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

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".pdf");

    @Override
    public String uploadFile(MultipartFile file) {
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
        String objectName = dateFolder + "/" + UUID.randomUUID() + ext;

        try (InputStream inputStream = file.getInputStream()) {
            bucketSupport.ensurePublicBucket(minioClient, bucketName);
            minioClient.putObject(PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build());
            return String.format("%s/%s/%s", publicUrl, bucketName, objectName);
        } catch (Exception e) {
            log.error("Lỗi khi upload file lên MinIO: {}", e.getMessage(), e);
            throw new RuntimeException("Tải file lên MinIO thất bại: " + e.getMessage());
        }
    }
}
