package org.app.apigateway.service;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.Refill;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.lettuce.core.RedisClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.Duration;



@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RedisClient redisClient;
    private final ProxyManager<String> proxyManager;

    public Bucket resolveBucket(String ip, String httpMethod) {
        boolean isRead = "GET".equalsIgnoreCase(httpMethod);

        String redisKey = (isRead? "rate_limit:read:" : "rate_limit:write:") + ip;
        return proxyManager.builder().build(
                redisKey, isRead ? this::getReadConfiguration : this::getWriteConfiguration
        );
    }

    // GET (Read): 200 requests / 30 giây
    private BucketConfiguration getReadConfiguration() {
        Bandwidth limit = Bandwidth.classic(200, Refill.greedy(200, Duration.ofSeconds(30)));
        return BucketConfiguration.builder()
                .addLimit(limit)
                .build();
    }

    // POST / PUT / DELETE (Write): 30 requests / 30 giây - Chống spam tạo đơn
    private BucketConfiguration getWriteConfiguration() {
        Bandwidth limit = Bandwidth.classic(30, Refill.greedy(30, Duration.ofSeconds(30)));
        return BucketConfiguration.builder()
                .addLimit(limit)
                .build();
    }

    public Bucket resolveGlobalBucket() {
        return proxyManager.builder().build("rate_limit:global", this::getGlobalConfiguration);
    }

    public BucketConfiguration getGlobalConfiguration() {
        Bandwidth limit = Bandwidth.classic(1000, Refill.greedy(1000, Duration.ofSeconds(60)));
        return BucketConfiguration.builder()
                .addLimit(limit)
                .build();
    }
}
