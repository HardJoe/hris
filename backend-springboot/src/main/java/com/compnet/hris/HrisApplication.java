package com.compnet.hris;

import com.compnet.hris.config.HrisProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(HrisProperties.class)
public class HrisApplication {
    public static void main(String[] args) {
        SpringApplication.run(HrisApplication.class, args);
    }
}
