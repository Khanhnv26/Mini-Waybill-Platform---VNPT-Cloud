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

    public void ensurePublicBucket(MinioClient client, String bucketName) throws Exception {
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
            String policy = """
                    {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Principal": {"AWS": ["*"]},
                                "Action": ["s3:GetObject"],
                                "Resource": ["arn:aws:s3:::%s/*"]
                            }
                        ]
                    }
                    """.formatted(bucketName);
            client.setBucketPolicy(SetBucketPolicyArgs.builder().bucket(bucketName).config(policy).build());
            ready.set(true);
            log.info("Bucket {} sẵn sàng và cho phép đọc công khai", bucketName);
        }
    }
}
