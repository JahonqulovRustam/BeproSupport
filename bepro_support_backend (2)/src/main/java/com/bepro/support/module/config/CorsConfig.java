package com.bepro.support.module.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS Configuration to allow frontend access from localhost:5173
 * This is needed because frontend and backend run on different ports
 */
@Configuration
public class CorsConfig {
    
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        // Allow frontend development server
                        .allowedOrigins(
                            "http://localhost:5173",
                            "http://localhost:5174", 
                            "http://127.0.0.1:5173"
                        )
                        // Allow all HTTP methods
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                        // Allow all headers
                        .allowedHeaders("*")
                        // Allow credentials (cookies, authorization headers)
                        .allowCredentials(true)
                        // Cache preflight response for 1 hour
                        .maxAge(3600);
            }
        };
    }
}
