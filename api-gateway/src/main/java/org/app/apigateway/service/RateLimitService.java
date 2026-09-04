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

    public Bucket resolveBucket(String ip) {
        String redisKey = "rate_limit:" + ip;
        return proxyManager.builder().build(redisKey, this::getConfiguration);
    }

    private BucketConfiguration getConfiguration() {
        //5 request in 30 seconds
        Bandwidth limit = Bandwidth.classic(5, Refill.greedy(5, Duration.ofSeconds(30)));
        return BucketConfiguration.builder().addLimit(limit).build();
    }

    public Bucket resolveGlobalBucket() {
        return proxyManager.builder().build("rate_limit:global", this::getGlobalConfiguration);
    }

    public BucketConfiguration getGlobalConfiguration() {
        Bandwidth limit = Bandwidth.classic(100, Refill.greedy(100, Duration.ofSeconds(60)));
        return BucketConfiguration.builder().addLimit(limit).build();
    }
}
