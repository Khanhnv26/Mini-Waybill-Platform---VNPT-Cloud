package org.app.supportservice.config;


import io.minio.MinioClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class MinioConfig {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Bean
    public MinioClient minioClient(MinioBucketSupport bucketSupport) {
        MinioClient client = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();

        try {
            bucketSupport.ensurePublicBucket(client, bucketName);
        } catch (Exception e) {
            log.error("MinIO chưa sẵn sàng lúc khởi động, bucket sẽ được tạo lại khi có file upload: {}", e.getMessage());
        }
        return client;
    }

}
