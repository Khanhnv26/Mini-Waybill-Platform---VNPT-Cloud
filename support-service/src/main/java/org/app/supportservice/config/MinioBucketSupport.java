package org.app.supportservice.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.SetBucketPolicyArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

@Component
@Slf4j
public class MinioBucketSupport {

    private final AtomicBoolean ready = new AtomicBoolean(false);

    public void ensurePrivateBucket(MinioClient client, String bucketName) throws Exception {
        if (ready.get()) {
            return;
        }
        synchronized (this) {
            if (ready.get()) {
                return;
            }
            boolean found = client.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("Đã tạo MinIO bucket {}", bucketName);
            }
            client.deleteBucketPolicy(io.minio.DeleteBucketPolicyArgs.builder().bucket(bucketName).build());
            ready.set(true);
            log.info("Bucket {} sẵn sàng và chỉ cho phép truy cập có xác thực", bucketName);
        }
    }
}
