package org.app.routingservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RoutingServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(RoutingServiceApplication.class, args);
    }

}
