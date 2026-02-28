package com.bepro.support.module.dto.request;

import com.bepro.support.module.model.MediaType;
import lombok.*;

@Getter
@AllArgsConstructor
public class ExternalMediaRequest {
    private String externalUrl;
    private MediaType type; // VIDEO or IMAGE
}