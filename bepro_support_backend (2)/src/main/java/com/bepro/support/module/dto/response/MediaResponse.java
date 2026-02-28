package com.bepro.support.module.dto.response;

import com.bepro.support.module.model.MediaType;
import lombok.*;

@Getter
@AllArgsConstructor
public class MediaResponse {
    private Long id;
    private MediaType type;
    private String url;   // external OR internal streaming URL
}

